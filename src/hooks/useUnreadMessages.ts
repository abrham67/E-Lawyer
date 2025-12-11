import { useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';

// Tracks unread message count for the authenticated user.
// Strategy: poll /api/communication for count and increment on socket 'chat:message'.
export function useUnreadMessages(pollMs: number = 15000) {
  const { user } = useAuth();
  const [unread, setUnread] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);

  // Fetch unread count from backend
  const fetchUnread = async () => {
    try {
      if (!user?.id) {
        setUnread(0);
        return;
      }
      const token = localStorage.getItem('token');
      const res = await fetch('/api/communication', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const count = typeof data?.unread === 'number' ? data.unread : 0;
      setUnread(count);
    } catch {
      // keep previous value
    }
  };

  useEffect(() => {
    fetchUnread();
    if (!user?.id) return;
    const id = window.setInterval(fetchUnread, pollMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, pollMs]);

  // Lightweight socket to bump count on incoming messages
  useEffect(() => {
    try { socketRef.current?.disconnect(); } catch {}
    socketRef.current = null;
    if (!user?.id) return;
    const socket = io('/', { path: '/ws/socket.io', transports: ['websocket'] });
    socketRef.current = socket;
    try { socket.emit('join-user-room', String(user.id)); } catch {}
    socket.on('chat:message', (msg: any) => {
      // This event is sent only to recipient room; increment optimistically
      setUnread((prev) => prev + 1);
    });
    // When navigating to a thread, messages get marked read and polling will correct the count.
    return () => {
      try { socket.disconnect(); } catch {}
    };
  }, [user?.id]);

  return unread;
}
