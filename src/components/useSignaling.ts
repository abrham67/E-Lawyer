import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || "/";
import { useAuth } from "@/hooks/useAuth";

export function useSignaling(roomId: string) {
  const [participants, setParticipants] = useState<string[]>([]);
  const socketRef = useRef<any>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!roomId) return;
  socketRef.current = io(SIGNALING_URL, { path: '/ws/socket.io', query: user?.id ? { userId: user.id } : undefined });
    if (user?.id) {
      try { socketRef.current.emit('join-user-room', String(user.id)); } catch {}
    }
    socketRef.current.emit("join-room", roomId);
    socketRef.current.on("user-joined", (id: string) => {
      setParticipants((prev) => [...new Set([...prev, id])]);
    });
    socketRef.current.on("user-left", (id: string) => {
      setParticipants((prev) => prev.filter((pid) => pid !== id));
    });
    // Denied join from server (e.g., session ended/cancelled)
    socketRef.current.on("join-denied", (payload: any) => {
      try {
        console.warn('Join denied:', payload);
      } catch {}
      navigate('/');
    });
    // Session ended broadcast
    socketRef.current.on("session-ended", () => {
      navigate('/');
    });
    // Optionally: fetch current participants
    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId]);

  return { socket: socketRef.current, participants };
}
