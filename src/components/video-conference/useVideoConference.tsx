import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { io, Socket } from 'socket.io-client';
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface UseVideoConferenceProps {
  roomId: string;
  isHost: boolean;
  // Join as a listener-only spectator: no local camera/mic or screen share
  isSpectator?: boolean;
}

export const useVideoConference = ({ roomId, isHost, isSpectator = false }: UseVideoConferenceProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [participants, setParticipants] = useState<string[]>([]);
  const [messages, setMessages] = useState<{sender: string, content: string}[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [activeTab, setActiveTab] = useState('participants');
  const [isRecording, setIsRecording] = useState(false);
  const [caseDocuments, setCaseDocuments] = useState<{id: string, name: string, shared: boolean}[]>([]);
  const [sharedDocument, setSharedDocument] = useState<{id: string, name: string} | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [cameraPosition, setCameraPosition] = useState('front');
  const [meetingStatus, setMeetingStatus] = useState('scheduled');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [roomLocked, setRoomLocked] = useState(false);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [spotlight, setSpotlight] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const spectatorRef = useRef<boolean>(isSpectator);
  useEffect(() => { spectatorRef.current = isSpectator; }, [isSpectator]);

  // Multi-peer support
  const peerConnections = useRef<{[id: string]: RTCPeerConnection}>({});
  const remoteStreams = useRef<{[id: string]: MediaStream}>({});
  const [remoteVideoRefs, setRemoteVideoRefs] = useState<{[id: string]: React.RefObject<HTMLVideoElement>}>({});
  const remoteVideoRefsRef = useRef<{[id: string]: React.RefObject<HTMLVideoElement>}>({});
  useEffect(() => { remoteVideoRefsRef.current = remoteVideoRefs; }, [remoteVideoRefs]);

  // Acquire/reacquire local media when toggled
  useEffect(() => {
    const localEl = localVideoRef.current;
    const setupLocalVideo = async () => {
      try {
        if (isSpectator) {
          // Spectators do not capture local media; join in listen-only mode
          setVideoEnabled(false);
          setAudioEnabled(false);
          toast({ title: 'Joined as spectator', description: 'You are in listen-only mode.' });
        } else {
        // getUserMedia requires HTTPS (or http on localhost). Guard for LAN/IP usage,
        // but do NOT bail out the whole meeting: still join socket/room so chat and presence work.
        const isSecure = (typeof window !== 'undefined') && (((window as any).isSecureContext) || ['localhost','127.0.0.1','::1'].includes(location.hostname));
        const md = (typeof navigator !== 'undefined') ? (navigator as any).mediaDevices : undefined;
        const canUseMedia = isSecure && !!md && typeof md.getUserMedia === 'function';
        if (!canUseMedia) {
          toast({
            variant: 'destructive',
            title: 'Camera access not available',
            description: 'Open the app via https or http://localhost (not LAN IP) to enable camera and microphone.'
          });
          setVideoEnabled(false);
          setAudioEnabled(false);
          setMeetingStatus('scheduled');
        }
        // Helper: try multiple constraint sets for better compatibility
        const tryGetUserMedia = async (): Promise<MediaStream> => {
          // 1) Preferred constraints
          const preferred: MediaStreamConstraints = {
            video: videoEnabled ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
            audio: audioEnabled ? { echoCancellation: true, noiseSuppression: true } : false,
          } as any;
          try { return await md.getUserMedia(preferred); } catch {}
          // 2) Relaxed constraints
          try { return await md.getUserMedia({ video: !!videoEnabled, audio: !!audioEnabled }); } catch {}
          // 3) Enumerate first available devices
          try {
            const devices = await md.enumerateDevices();
            const cam = devices.find((d: MediaDeviceInfo) => d.kind === 'videoinput');
            const mic = devices.find((d: MediaDeviceInfo) => d.kind === 'audioinput');
            const c: MediaStreamConstraints = {
              video: videoEnabled && cam ? { deviceId: { exact: cam.deviceId } } : false,
              audio: audioEnabled && mic ? { deviceId: { exact: mic.deviceId } } : false,
            } as any;
            return await md.getUserMedia(c);
          } catch {}
          // 4) Final attempt: video only, then audio only
          try { return await md.getUserMedia({ video: true, audio: false }); } catch {}
          try { return await md.getUserMedia({ video: false, audio: true }); } catch {}
          throw new Error('getUserMedia failed for all constraint sets');
        };

        if (canUseMedia) {
          const stream = await tryGetUserMedia();
          if (localVideoRef.current) {
            // Improve mobile/iOS compatibility
            try {
              localVideoRef.current.muted = true; // prevent echo and allow autoplay on iOS
              (localVideoRef.current as any).playsInline = true;
              localVideoRef.current.setAttribute?.('playsinline', 'true');
              localVideoRef.current.setAttribute?.('webkit-playsinline', 'true');
              localVideoRef.current.disablePictureInPicture = true as any;
            } catch {}
            localVideoRef.current.srcObject = stream;
            try { await localVideoRef.current.play?.(); } catch {}
          }
        }
        }
        
  // Initialize participants list; actual presence comes from socket room state
  setParticipants([]);
        
        setMessages([
          { sender: 'System', content: 'Welcome to the court session.' },
          { sender: 'System', content: 'Please ensure all parties are present before we begin.' },
          { sender: 'Judge Smith', content: 'This court is now in session. We will begin shortly.' }
        ]);
        
        setCaseDocuments([
          { id: '1', name: 'Case Brief.pdf', shared: false },
          { id: '2', name: 'Evidence Document A.pdf', shared: false },
          { id: '3', name: 'Witness Statement.pdf', shared: false },
          { id: '4', name: 'Court Order.pdf', shared: false },
        ]);
        
        toast({
          title: "Connected to meeting",
          description: "You have joined the virtual court session",
        });
        
        if (isHost) {
          // Host-specific setup
          setMeetingStatus('in_progress');
          // Mark session open on the server
          try {
            const token = localStorage.getItem('token');
            await fetch(`/api/courtsessions/${roomId}/open`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
            });
          } catch {}
        }
  // Media setup finished; socket lifecycle is handled in a separate effect.

        // Screen sharing
        const startScreenShare = async () => {
          const gdm = (navigator as any).mediaDevices?.getDisplayMedia;
          if (typeof gdm !== 'function') {
            toast({ variant: 'destructive', title: 'Screen share not available', description: 'Requires HTTPS or localhost.' });
            return;
          }
          const stream = await gdm({ video: true });
          Object.values(peerConnections.current).forEach((pc) => {
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          });
          setScreenShareEnabled(true);
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        };
        const stopScreenShare = () => {
          setScreenShareEnabled(false);
          // Restore camera stream
          (navigator as any).mediaDevices?.getUserMedia?.({ video: true, audio: true })
            .then((stream: MediaStream) => {
              Object.values(peerConnections.current).forEach((pc) => {
                stream.getTracks().forEach((track) => pc.addTrack(track, stream));
              });
              if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            })
            .catch(() => {/* ignore */});
        };

        // Recording
        let mediaRecorder: MediaRecorder | null = null;
        const startRecording = () => {
          if (localVideoRef.current && localVideoRef.current.srcObject) {
            mediaRecorder = new MediaRecorder(localVideoRef.current.srcObject as MediaStream);
            mediaRecorder.start();
            setIsRecording(true);
            mediaRecorder.ondataavailable = (e) => {
              // Save or upload e.data (Blob)
            };
            mediaRecorder.onstop = () => setIsRecording(false);
          }
        };
        const stopRecording = () => {
          if (mediaRecorder) mediaRecorder.stop();
        };

  // (duplicate meeting toast removed)
  // (meetingStatus already set above when host)
        
      } catch (error) {
        const err: any = error;
        console.error('Error accessing media devices:', err);
        let title = 'Camera access error';
        let description = 'Could not access your camera or microphone';
        if (err && typeof err === 'object') {
          switch (err.name) {
            case 'NotAllowedError':
            case 'SecurityError':
              description = 'Permission denied. Please allow camera and microphone in your browser site settings and try again.';
              break;
            case 'NotFoundError':
            case 'DevicesNotFoundError':
              description = 'No camera or microphone detected. Plug in a device or select a different one in your OS settings.';
              break;
            case 'NotReadableError':
            case 'TrackStartError':
              description = 'Your camera or microphone is in use by another application. Close it and try again.';
              break;
            case 'OverconstrainedError':
              description = 'Requested media constraints are not supported by your device. We will retry with simplified constraints.';
              break;
            default:
              // Keep generic
              break;
          }
        }
        toast({ variant: 'destructive', title, description });
      }
    };
    
  setupLocalVideo();
    
    return () => {
      if (localEl && localEl.srcObject) {
        const stream = localEl.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoEnabled, audioEnabled, isHost, isSpectator, toast, roomId]);

  // Socket and WebRTC signaling lifecycle (join room once per roomId)
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const socketInstance = io('/', { path: '/ws/socket.io', transports: ['websocket'], auth: token ? { token: `Bearer ${token}` } : undefined });
    setSocket(socketInstance);
    socketInstance.emit('join-room', roomId);

    const addLocalTracks = async (pc: RTCPeerConnection) => {
      // Prefer existing local stream if available, else try to get minimal stream
      const localEl = localVideoRef.current;
      let stream: MediaStream | null = (localEl?.srcObject as MediaStream) || null;
      if (!stream && !spectatorRef.current) {
        try {
          const md = (navigator as any).mediaDevices;
          if (md?.getUserMedia) {
            stream = await md.getUserMedia({ video: true, audio: true });
          }
        } catch {}
      }
      if (stream && !spectatorRef.current) {
        stream.getTracks().forEach((track) => {
          try { pc.addTrack(track, stream as MediaStream); } catch {}
        });
      } else if (spectatorRef.current) {
        // Ensure we can receive media even when we don't publish
        try { pc.addTransceiver('video', { direction: 'recvonly' }); } catch {}
        try { pc.addTransceiver('audio', { direction: 'recvonly' }); } catch {}
      }
    };

    const ensurePeer = async (id: string) => {
      if (peerConnections.current[id]) return peerConnections.current[id];
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' }
        ],
        iceCandidatePoolSize: 0
      });
      peerConnections.current[id] = pc;
      remoteStreams.current[id] = new MediaStream();
      setRemoteVideoRefs((prev) => {
        const next = { ...prev, [id]: React.createRef<HTMLVideoElement>() };
        remoteVideoRefsRef.current = next;
        return next;
      });
      await addLocalTracks(pc);
      // Proactively renegotiate when needed (e.g., tracks added later)
      pc.onnegotiationneeded = async () => {
        try {
          if (pc.signalingState === 'stable') {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketInstance.emit('signal', { roomId, target: id, data: offer });
          }
        } catch {}
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketInstance.emit('signal', { roomId, target: id, data: { candidate: event.candidate } });
        }
      };
      pc.ontrack = (event) => {
        remoteStreams.current[id].addTrack(event.track);
        const ref = remoteVideoRefsRef.current[id]?.current;
        if (ref) {
          try {
            (ref as any).playsInline = true;
            ref.setAttribute?.('playsinline', 'true');
            ref.setAttribute?.('webkit-playsinline', 'true');
          } catch {}
          ref.srcObject = remoteStreams.current[id];
          try { (ref as any).play?.(); } catch {}
        }
      };
      return pc;
    };

    // New user joins
  socketInstance.on('user-joined', async (userId: string) => {
      const pc = await ensurePeer(userId);
      // Create offer with audio/video reception hints
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        socketInstance.emit('signal', { roomId, target: userId, data: offer });
      } catch {}
      setParticipants((prev) => Array.from(new Set([...prev, userId])));
    });

    // Receive current room state on join
    socketInstance.on('room-state', (payload: any) => {
      try {
        const ids = payload?.participants;
        if (Array.isArray(ids)) setParticipants(ids);
        if (typeof payload?.locked === 'boolean') setRoomLocked(!!payload.locked);
        if (typeof payload?.chatDisabled === 'boolean') setChatDisabled(!!payload.chatDisabled);
        if (payload && 'spotlight' in payload) setSpotlight(payload.spotlight || null);
      } catch {}
    });

    // Handle user leaving
    socketInstance.on('user-left', (userId: string) => {
      setParticipants((prev) => prev.filter((id) => id !== userId));
    });

    socketInstance.on('kicked', (payload: any) => {
      try {
        if (localVideoRef.current && localVideoRef.current.srcObject) {
          const s = localVideoRef.current.srcObject as MediaStream;
          s.getTracks().forEach(t => t.stop());
        }
      } catch {}
      toast({ variant: 'destructive', title: 'Removed by court', description: 'You have been removed from this session.' });
      navigate(-1);
    });

    socketInstance.on('force-video-off', () => {
      try {
        const el = localVideoRef.current;
        const stream = el && (el.srcObject as MediaStream | null);
        if (stream) { stream.getVideoTracks().forEach(t => { try { t.enabled = false; } catch {} }); }
        setVideoEnabled(false);
        toast({ title: 'Video disabled by court', description: 'Your camera has been turned off.' });
      } catch {}
    });
    socketInstance.on('force-video-on', async () => {
      // Try to enable video if permissions allow
      const ok = await ensureVideoTrack();
      if (ok) toast({ title: 'Video enabled by court', description: 'Your camera has been turned on.' });
    });
    socketInstance.on('stop-screen-share', () => {
      try {
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
          const s = remoteVideoRef.current.srcObject as MediaStream;
          s.getTracks().forEach(t => t.stop());
          remoteVideoRef.current.srcObject = null;
        }
        setScreenShareEnabled(false);
        toast({ title: 'Screen share stopped by court', description: '' });
      } catch {}
    });
    socketInstance.on('room-locked', () => { setRoomLocked(true); toast({ title: 'Meeting locked', description: 'New participants cannot join.' }); });
    socketInstance.on('room-unlocked', () => { setRoomLocked(false); toast({ title: 'Meeting unlocked', description: 'Participants can join.' }); });
    socketInstance.on('chat-disabled', () => { setChatDisabled(true); toast({ title: 'Chat disabled by court', description: '' }); });
    socketInstance.on('chat-enabled', () => { setChatDisabled(false); toast({ title: 'Chat enabled by court', description: '' }); });

    socketInstance.on('control-denied', (payload: any) => {
      const action = payload?.action || 'action';
      toast({ variant: 'destructive', title: 'Permission denied', description: `Only the court can ${action.replace('-', ' ')}` });
    });

    // Incoming signaling
    socketInstance.on('signal', async ({ sender, data }) => {
      const pc = await ensurePeer(sender);
      try {
        if (data.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pc.createAnswer({});
          await pc.setLocalDescription(answer);
          socketInstance.emit('signal', { roomId, target: sender, data: answer });
        } else if (data.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
        } else if (data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch {}
    });

    // Room chat
  socketInstance.on('chat', ({ sender, content }) => {
      setMessages((prev) => [...prev, { sender, content }]);
    });

    // Session end broadcast from backend or host
    socketInstance.on('session-ended', (payload: any) => {
      try {
        // Stop local media
        if (localVideoRef.current && localVideoRef.current.srcObject) {
          const s = localVideoRef.current.srcObject as MediaStream;
          s.getTracks().forEach(t => t.stop());
        }
        if (screenShareEnabled && remoteVideoRef.current && remoteVideoRef.current.srcObject) {
          const s = remoteVideoRef.current.srcObject as MediaStream;
          s.getTracks().forEach(t => t.stop());
        }
        // Close peers
        Object.values(peerConnections.current).forEach((pc) => { try { pc.close(); } catch {} });
        peerConnections.current = {};
        // Inform user and navigate out
        setMessages(prev => [...prev, { sender: 'System', content: 'The session has ended.' }]);
        toast({ title: 'Session ended', description: 'The court has ended this session.' });
        navigate(-1);
      } catch {}
    });

    // Host control broadcasts
    socketInstance.on('force-mute', () => {
      try {
        const el = localVideoRef.current;
        const stream: MediaStream | null = (el?.srcObject as any) || null;
        if (stream) { stream.getAudioTracks().forEach((t) => { try { t.enabled = false; } catch {} }); }
        setAudioEnabled(false);
        toast({ title: 'Muted by court', description: 'Your microphone was muted by the court.' });
      } catch {}
    });
    socketInstance.on('force-unmute', () => {
      try {
        const el = localVideoRef.current;
        const stream: MediaStream | null = (el?.srcObject as any) || null;
        if (stream) { stream.getAudioTracks().forEach((t) => { try { t.enabled = true; } catch {} }); }
        setAudioEnabled(true);
        toast({ title: 'Unmuted by court', description: 'Your microphone was unmuted by the court.' });
      } catch {}
    });

    return () => {
  // Disconnect socket
      try { socketInstance.disconnect(); } catch {}
      // Close peer connections and clear streams
      Object.values(peerConnections.current).forEach((pc) => {
        try { pc.close(); } catch {}
      });
      peerConnections.current = {};
      Object.values(remoteStreams.current).forEach((ms) => {
        try { ms.getTracks().forEach(t => t.stop()); } catch {}
      });
      remoteStreams.current = {} as any;
      setRemoteVideoRefs({});
    };
  }, [roomId, isSpectator, navigate, screenShareEnabled, toast]);
  
  // Ensure a camera video track exists; if not, request it and attach
  const ensureVideoTrack = async () => {
  if (spectatorRef.current) return false;
    try {
      const md = (navigator as any).mediaDevices;
      if (!md?.getUserMedia) return false;
      const el = localVideoRef.current;
      if (!el) return false;
      let stream = (el.srcObject as MediaStream) || new MediaStream();
      const hasVideo = stream.getVideoTracks().length > 0 && stream.getVideoTracks().every(t => t.readyState === 'live');
      if (hasVideo) return true;
      const camStream = await md.getUserMedia({ video: true });
      const vTrack = camStream.getVideoTracks()[0];
      if (!vTrack) return false;
      stream.addTrack(vTrack);
      el.srcObject = stream;
      try { await el.play?.(); } catch {}
      // Attach to existing peer connections
      Object.values((peerConnections.current || {})).forEach(pc => {
        try { pc.addTrack(vTrack, stream); } catch {}
      });
      setVideoEnabled(true);
      return true;
    } catch {
      return false;
    }
  };
  
  const toggleVideo = async () => {
    if (spectatorRef.current) {
      toast({ title: 'Spectator mode', description: 'You cannot enable video while spectating.' });
      return;
    }
    const el = localVideoRef.current;
    const stream = el && (el.srcObject as MediaStream | null);
    const hasTrack = !!stream && stream.getVideoTracks().length > 0;
    if (!videoEnabled) {
      // Turning ON
      const ok = hasTrack ? true : await ensureVideoTrack();
      if (ok && el) {
        try { await el.play?.(); } catch {}
        setVideoEnabled(true);
        const s = el.srcObject as MediaStream;
        s?.getVideoTracks().forEach(t => t.enabled = true);
      }
    } else {
      // Turning OFF
      setVideoEnabled(false);
      if (stream) stream.getVideoTracks().forEach(track => { track.enabled = false; });
    }
  };
  
  const toggleAudio = () => {
    if (spectatorRef.current) {
      toast({ title: 'Spectator mode', description: 'You cannot enable audio while spectating.' });
      return;
    }
    setAudioEnabled(prev => !prev);
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled;
      });
    }
  };
  
  const toggleCamera = () => {
    setCameraPosition(prev => prev === 'front' ? 'back' : 'front');
    toast({
      title: `Switched to ${cameraPosition === 'front' ? 'back' : 'front'} camera`,
      description: "Camera view has been changed",
    });
  };
  
  const toggleScreenShare = async () => {
    if (spectatorRef.current) {
      toast({ variant: 'destructive', title: 'Spectator mode', description: 'Screen sharing is disabled for spectators.' });
      return;
    }
    try {
      if (!screenShareEnabled) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          setScreenShareEnabled(true);
          
          setMessages(prev => [...prev, { 
            sender: 'System', 
            content: 'You are now sharing your screen with all participants.' 
          }]);
          
          stream.getVideoTracks()[0].onended = () => {
            setScreenShareEnabled(false);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
          };
        }
      } else {
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
          const stream = remoteVideoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          remoteVideoRef.current.srcObject = null;
          setScreenShareEnabled(false);
        }
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
      toast({
        variant: "destructive",
        title: "Screen sharing error",
        description: "Failed to share your screen",
      });
    }
  };
  
  const toggleRecording = () => {
    if (spectatorRef.current) {
      toast({ title: 'Spectator mode', description: 'Recording is disabled for spectators.' });
      return;
    }
    setIsRecording(prev => !prev);
    
    if (!isRecording) {
      toast({
        title: "Recording started",
        description: "This session is now being recorded",
      });
      
      setMessages(prev => [...prev, { 
        sender: 'System', 
        content: 'Recording has started. All participants have been notified.' 
      }]);
    } else {
      toast({
        title: "Recording stopped",
        description: "Recording has been saved",
      });
      
      setMessages(prev => [...prev, { 
        sender: 'System', 
        content: 'Recording has stopped.' 
      }]);
    }
  };
  
  const shareDocument = (docId: string) => {
    const doc = caseDocuments.find(d => d.id === docId);
    if (doc) {
      setCaseDocuments(caseDocuments.map(d => 
        d.id === docId ? { ...d, shared: true } : d
      ));
      
      setSharedDocument(doc);
      
      toast({
        title: "Document shared",
        description: `${doc.name} is now visible to all participants`,
      });
      
      setMessages(prev => [...prev, { 
        sender: 'System', 
        content: `Document "${doc.name}" has been shared with all participants.` 
      }]);
    }
  };
  
  const saveNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/courtsessions/${roomId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ notes: noteContent })
      });
      if (!res.ok) throw new Error('Failed to save notes');
      toast({
        title: "Notes saved",
        description: "Your meeting notes have been saved",
      });
      setMeetingNotes(noteContent);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        variant: "destructive",
        title: "Failed to save notes",
        description: "There was an error saving your notes",
      });
    }
  };
  
  const endCall = async () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    if (screenShareEnabled && remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      const stream = remoteVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    if (isHost && socket) {
      try { socket.emit('end-session', roomId); } catch {}
    }
    
    navigate(-1);
  };
  
  // Chat send function
  const sendMessage = (msg: string) => {
    if (socket) {
      socket.emit('chat', { roomId, content: msg });
      setMessages((prev) => [...prev, { sender: 'You', content: msg }]);
    }
  };

  // Host-only: force mute/unmute participant
  const forceMuteParticipant = (participantId: string) => {
    if (!socket || !isHost) return;
    try { socket.emit('force-mute', { roomId, target: participantId }); } catch {}
  };
  const forceUnmuteParticipant = (participantId: string) => {
    if (!socket || !isHost) return;
    try { socket.emit('force-unmute', { roomId, target: participantId }); } catch {}
  };

  const kickParticipant = (participantId: string) => {
    if (!socket || !isHost) return;
    try { socket.emit('kick-user', { roomId, target: participantId }); } catch {}
  };

  const forceVideoOff = (participantId: string) => {
    if (!socket || !isHost) return;
    try { socket.emit('force-video-off', { roomId, target: participantId }); } catch {}
  };
  const forceVideoOn = (participantId: string) => {
    if (!socket || !isHost) return;
    try { socket.emit('force-video-on', { roomId, target: participantId }); } catch {}
  };
  const stopScreenShare = (participantId: string) => {
    if (!socket || !isHost) return;
    try { socket.emit('stop-screen-share', { roomId, target: participantId }); } catch {}
  };
  const lockRoom = () => { if (socket && isHost) try { socket.emit('lock-room', roomId); } catch {} };
  const unlockRoom = () => { if (socket && isHost) try { socket.emit('unlock-room', roomId); } catch {} };
  const disableChat = () => { if (socket && isHost) try { socket.emit('disable-chat', roomId); } catch {} };
  const enableChat = () => { if (socket && isHost) try { socket.emit('enable-chat', roomId); } catch {} };

  // Promote a spectator to speaker: acquire local media and renegotiate
  const promoteToSpeaker = async () => {
    if (!spectatorRef.current) return; // already a speaker
    try {
      const md = (navigator as any).mediaDevices;
      if (!md?.getUserMedia) throw new Error('Media not available');
      const stream = await md.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        try { await localVideoRef.current.play?.(); } catch {}
      }
      setVideoEnabled(true);
      setAudioEnabled(true);
      spectatorRef.current = false;
      // Attach to all PCs and renegotiate
      const vTracks = stream.getVideoTracks();
      const aTracks = stream.getAudioTracks();
      await Promise.all(Object.entries(peerConnections.current).map(async ([id, pc]) => {
        try {
          vTracks.forEach(t => { try { pc.addTrack(t, stream); } catch {} });
          aTracks.forEach(t => { try { pc.addTrack(t, stream); } catch {} });
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('signal', { roomId, target: id, data: offer });
        } catch {}
      }));
      toast({ title: 'You can speak now', description: 'Camera and microphone enabled.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to enable media', description: 'Check browser permissions and HTTPS.' });
    }
  };

  return {
  isMobile,
  isSpectator,
  canPublish: !isSpectator,
    videoEnabled,
    audioEnabled,
    participants,
    messages,
  messageInput,
  setMessageInput,
    activeTab,
    setActiveTab,
    isRecording,
    caseDocuments,
    sharedDocument,
    setSharedDocument,
    noteContent,
    setNoteContent,
    localVideoRef,
    remoteVideoRef,
    screenShareEnabled,
    cameraPosition,
    meetingStatus,
    meetingNotes,
    roomLocked,
    chatDisabled,
    spotlight,
    toggleVideo,
    toggleAudio,
    toggleCamera,
    toggleScreenShare,
    toggleRecording,
    shareDocument,
    saveNotes,
    endCall,
    sendMessage,
    forceMuteParticipant,
    forceUnmuteParticipant,
    kickParticipant,
    forceVideoOff,
    forceVideoOn,
    stopScreenShare,
    lockRoom,
    unlockRoom,
    disableChat,
    enableChat,
  remoteVideoRefs,
  promoteToSpeaker
  };
};
