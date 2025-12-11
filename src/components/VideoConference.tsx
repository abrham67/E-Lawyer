


import React, { useRef, useEffect, useState } from "react";
import { useSignaling } from "./useSignaling";
import RecordingControls from "./RecordingControls";

const VideoConference = ({ roomId, isRecording, sharedDoc, onStopRecording, onUnshareDocument }) => {
  const [role, setRole] = useState("");
  useEffect(() => {
    // Get user role from localStorage (set at login)
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setRole(user.role || "");
    } catch {}
  }, []);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const { participants, socket } = useSignaling(roomId);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const [sharedFiles, setSharedFiles] = useState([]);
  // Handle parent-provided sharedDoc
  useEffect(() => {
    if (sharedDoc && socket) {
      // Upload and broadcast file if not already in sharedFiles
      const uploadAndShare = async () => {
        if (sharedFiles.some(f => f.name === sharedDoc.name)) return;
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("file", sharedDoc);
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const doc = await res.json();
          socket.emit("file-shared", {
            name: doc.title || doc.fileName || doc.name || sharedDoc.name,
            url: doc.url || doc.filePath || doc.downloadUrl,
            uploadedBy: token,
            time: new Date().toISOString(),
          });
          setSharedFiles((prev) => [...prev, {
            name: doc.title || doc.fileName || doc.name || sharedDoc.name,
            url: doc.url || doc.filePath || doc.downloadUrl,
            uploadedBy: "You",
            time: new Date().toISOString(),
          }]);
        }
      };
      uploadAndShare();
    }
    if (!sharedDoc && onUnshareDocument) onUnshareDocument();
    // eslint-disable-next-line
  }, [sharedDoc]);
  // Handle receiving shared files
  useEffect(() => {
    if (!socket) return;
    const handleFileShared = (file) => {
      setSharedFiles((prev) => [...prev, file]);
    };
    socket.on("file-shared", handleFileShared);
    return () => {
      socket.off("file-shared", handleFileShared);
    };
  }, [socket]);

  // Remove local file upload UI, now handled by parent

  useEffect(() => {
    let isMounted = true;
    let localStream;
    let peerConnection;

    const start = async () => {
      // Guard: media requires https or localhost
      const isSecure = ((window as any).isSecureContext) || ['localhost','127.0.0.1','::1'].includes(location.hostname);
      if (!isSecure) {
        try { console.warn('Insecure context: camera/mic not available. Use https or localhost.'); } catch {}
      }
      localStream = isSecure && navigator.mediaDevices?.getUserMedia
        ? await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        : null;
      localStreamRef.current = localStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

      // Setup peer connection
      peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });
      peerConnectionRef.current = peerConnection;

      // Add local tracks
      if (localStream) {
        localStream.getTracks().forEach(track => {
          try { peerConnection.addTrack(track, localStream as any); } catch {}
        });
      } else {
        try { peerConnection.addTransceiver('video', { direction: 'recvonly' }); } catch {}
        try { peerConnection.addTransceiver('audio', { direction: 'recvonly' }); } catch {}
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("signal", { roomId, data: { type: "candidate", candidate: event.candidate } });
        }
      };

      // Listen for signaling data
      if (socket) {
        socket.on("signal", async ({ sender, data }) => {
          if (!isMounted) return;
          if (data.type === "offer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit("signal", { roomId, data: { type: "answer", answer } });
          } else if (data.type === "answer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          } else if (data.type === "candidate") {
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {}
          }
        });

        // If another user joins, create and send offer
        socket.on("user-joined", async (id) => {
          if (participants.length > 1) {
            const offer = await peerConnection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await peerConnection.setLocalDescription(offer);
            socket.emit("signal", { roomId, data: { type: "offer", offer } });
          }
        });
        // Handle negotiationneeded for mid-call track changes
        peerConnection.onnegotiationneeded = async () => {
          try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('signal', { roomId, data: { type: 'offer', offer } });
          } catch {}
        };
      }
    };
    start();

    return () => {
      isMounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socket) {
        socket.off("signal");
        socket.off("user-joined");
      }
    };
  }, [roomId, socket, participants.length]);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Recording controls handled by parent, but show status if recording */}
      {isRecording && (
        <div className="my-2 text-red-600 font-bold">Recording in progress...</div>
      )}
      <video ref={localVideoRef} autoPlay playsInline muted className="w-64 h-48 bg-black mb-2 rounded" />
      <video ref={remoteVideoRef} autoPlay playsInline className="w-64 h-48 bg-black rounded" />
      <div className="mt-2 text-gray-500">Participants:</div>
      <ul className="mb-2">
        {participants.map((id) => (
          <li key={id} className="text-xs text-gray-700">{id}</li>
        ))}
      </ul>
      <div className="mt-4 w-full max-w-md">
        <div className="bg-gray-100 rounded p-2">
          <div className="font-semibold mb-1">Shared Files:</div>
          <ul>
            {sharedFiles.length > 0 ? sharedFiles.map((f, i) => (
              <li key={i} className="text-xs flex items-center justify-between border-b last:border-b-0 py-1">
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{f.name}</a>
                <span className="ml-2 text-gray-500">{f.uploadedBy || "Participant"}</span>
              </li>
            )) : <li className="text-xs text-gray-500">No files shared yet.</li>}
          </ul>
        </div>
      </div>
      <div className="mt-2 text-gray-500">Video/audio is now real-time peer-to-peer.</div>
    </div>
  );
};

export default VideoConference;
