import React, { useRef, useState } from "react";

const RecordingControls = ({ roomId, canRecord }) => {
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Start recording local video/audio
  const startRecording = async () => {
    const stream = document.querySelector("video")?.srcObject;
    if (!stream) return alert("No stream to record");
  mediaRecorderRef.current = new MediaRecorder(stream as MediaStream, { mimeType: "video/webm" });
    const chunks = [];
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setRecordedUrl(URL.createObjectURL(blob));
      // Upload to backend
      setUploading(true);
      const formData = new FormData();
      formData.append("recording", blob, `session-${roomId}.webm`);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/recordings", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      setUploading(false);
      if (res.ok) {
        alert("Recording uploaded successfully.");
      } else {
        alert("Failed to upload recording.");
      }
    };
    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return canRecord ? (
    <div className="my-4">
      <button
        className={`px-4 py-2 rounded text-white ${recording ? "bg-red-600" : "bg-green-600"}`}
        onClick={recording ? stopRecording : startRecording}
        disabled={uploading}
      >
        {recording ? "Stop Recording" : "Start Recording"}
      </button>
      {uploading && <span className="ml-2 text-gray-500">Uploading...</span>}
      {recordedUrl && (
        <div className="mt-2">
          <video src={recordedUrl} controls className="w-64 h-32" />
        </div>
      )}
    </div>
  ) : null;
};

export default RecordingControls;
