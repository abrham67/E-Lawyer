import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

type ParticipantInfo = { socketId: string; userId?: string; role?: string; name?: string };

interface LiveParticipantsPanelProps {
  sessionId: string;
}

const LiveParticipantsPanel: React.FC<LiveParticipantsPanelProps> = ({ sessionId }) => {
  const { user } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const isCourt = String(user?.role || '').toLowerCase() === 'court';

  useEffect(() => {
    let socket: any;
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/courtsessions/${sessionId}/participants`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (!mounted) return;
        setParticipants((json.participants || []).map((p: any) => ({
          socketId: p.socketId,
          userId: p.userId,
          role: p.role,
          name: p.name || p.userId || p.socketId
        })));
      } catch (e: any) {
        if (!mounted) return;
        setError(e.message || 'Failed to load participants');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    // Subscribe to live room-state via socket.io for real-time updates
    (async () => {
      try {
        const mod = await import('socket.io-client');
        const auth = token ? { token: `Bearer ${token}` } : undefined;
        socket = mod.io('/', { path: '/ws/socket.io', transports: ['websocket'], auth });
        socket.emit('join-room', sessionId);
        socket.on('room-state', (payload: any) => {
          if (!payload) return;
          const details: ParticipantInfo[] = Array.isArray(payload.details) ? payload.details : [];
          setParticipants(details.map(d => ({
            socketId: d.socketId,
            userId: d.userId,
            role: d.role,
            name: d.name || d.userId || d.socketId
          })));
        });
        // Ask for an immediate snapshot
        socket.emit('request-room-state', sessionId);
      } catch {}
    })();
    return () => {
      mounted = false;
      try { socket?.disconnect(); } catch {}
    };
  }, [sessionId]);

  // Court-only actions using socket.io; keep it local to this component
  const handleMute = (socketId: string) => {
    if (!isCourt) return;
    (async () => {
      try {
        const mod = await import('socket.io-client');
        const s = mod.io('/', { path: '/ws/socket.io', transports: ['websocket'], auth: token ? { token: `Bearer ${token}` } : undefined });
        s.emit('force-mute', { roomId: sessionId, target: socketId });
        setTimeout(() => { try { s.disconnect(); } catch {} }, 300);
      } catch {}
    })();
  };
  const handleKick = (socketId: string) => {
    if (!isCourt) return;
    (async () => {
      try {
        const mod = await import('socket.io-client');
        const s = mod.io('/', { path: '/ws/socket.io', transports: ['websocket'], auth: token ? { token: `Bearer ${token}` } : undefined });
        s.emit('kick-user', { roomId: sessionId, target: socketId });
        setTimeout(() => { try { s.disconnect(); } catch {} }, 300);
      } catch {}
    })();
  };

  return (
    <div className="border rounded p-4 bg-white">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">Live Participants</h3>
        {loading && <span className="text-sm text-gray-500">Loading...</span>}
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {participants.length === 0 && !loading && (
        <div className="text-gray-600">No participants in the room.</div>
      )}
      <ul className="space-y-2">
        {participants.map((p) => (
          <li key={p.socketId} className="flex items-center justify-between border-b pb-2">
            <div>
              <div className="font-medium">{p.name || p.userId || p.socketId}</div>
              <div className="text-xs text-gray-500">{p.role || 'participant'} · {p.socketId.slice(0, 6)}…</div>
            </div>
            {isCourt && (
              <div className="flex gap-2">
                <button className="px-2 py-1 text-xs bg-amber-500 text-white rounded" onClick={() => handleMute(p.socketId)}>Mute</button>
                <button className="px-2 py-1 text-xs bg-red-600 text-white rounded" onClick={() => handleKick(p.socketId)}>Kick</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LiveParticipantsPanel;
