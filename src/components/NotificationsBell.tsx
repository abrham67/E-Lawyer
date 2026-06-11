import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import io from 'socket.io-client';

const timeAgo = (d?: string | Date) => {
  if (!d) return '';
  const ts = typeof d === 'string' ? new Date(d) : d;
  const diff = Math.floor((Date.now() - ts.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
};

const NotificationsBell: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const fetchNotifications = useCallback(async () => {
    try {
      if (!user?.id) return;
      const token = localStorage.getItem('token');
      const res = await fetch('/api/notifications', { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.notifications || []);
      setItems(list);
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
    // socket live updates
    if (!user?.id) return;
    const socket = io('/', { path: '/ws/socket.io', transports: ['websocket'] });
    try { socket.emit('join-user-room', String(user.id)); } catch {}
    socket.on('notification', (notif: any) => {
      setItems((prev) => [{ ...notif }, ...prev]);
    });
    return () => { try { socket.disconnect(); } catch {} };
  }, [user?.id, fetchNotifications]);

  const markRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((n) => (String(n._id) === String(updated._id) ? updated : n)));
      }
    } catch {}
  };

  const markAllRead = async () => {
    const unreadItems = items.filter((n) => !n.read);
    for (const n of unreadItems) {
      // Fire and forget; UI will refresh on success
      markRead(String(n._id || n.id));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative rounded-full p-2 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] leading-none px-1.5 py-0.5 min-w-[16px]">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-white p-0">
        <DropdownMenuLabel className="flex items-center justify-between sticky top-0 bg-white z-10 px-3 py-2">
          <span>Notifications</span>
          <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <div className="px-3 py-6 text-sm text-muted-foreground">No notifications</div>
          )}
          {items.map((n) => (
            <DropdownMenuItem key={n._id || n.id} className="flex flex-col items-start gap-1 py-3">
              <div className="flex w-full items-center justify-between">
                <span className={`text-sm ${n.read ? 'text-gray-500' : 'text-foreground font-medium'}`}>{n.message}</span>
                {!n.read && (
                  <button onClick={(e) => { e.stopPropagation(); markRead(String(n._id || n.id)); }} className="text-xs text-blue-600 hover:underline">Read</button>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at || n.createdAt)}</span>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsBell;
