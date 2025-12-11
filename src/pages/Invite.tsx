import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type InviteStatus = {
  active: boolean;
  session_id: string;
  join_path: string;
  active_from: string | null;
  is_virtual: boolean;
  status: string;
};

const Invite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InviteStatus | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  const activeFromMs = useMemo(() => {
    if (!data?.active_from) return null;
    try { return new Date(data.active_from).getTime(); } catch { return null; }
  }, [data]);

  // Tick every second to update countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/courtsessions/invite/${token}`);
        if (!res.ok) {
          const msg = res.status === 404 ? 'Invalid invite link' : res.status === 410 ? 'This session has ended' : 'Failed to validate invite';
          setError(msg);
          return;
        }
        const payload = await res.json();
        setData(payload);
        if (payload.active) {
          // Small delay so the UI can render, then redirect
          setTimeout(() => navigate(payload.join_path), 500);
        }
      } catch (e) {
        setError('Network error while validating invite');
      } finally {
        setLoading(false);
      }
    };
    if (token) run();
  }, [token, navigate]);

  const secondsRemaining = useMemo(() => {
    if (!activeFromMs) return null;
    const diff = Math.max(0, Math.floor((activeFromMs - now) / 1000));
    return diff;
  }, [activeFromMs, now]);

  const formatCountdown = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const parts = [] as string[];
    if (h) parts.push(`${h}h`);
    if (h || m) parts.push(`${m}m`);
    parts.push(`${sec}s`);
    return parts.join(' ');
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div>Checking your invite…</div>
      </main>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">Invite problem</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => navigate('/')}>Go home</Button>
      </main>
    </div>
  );

  if (!data) return null;

  const startsAt = activeFromMs ? new Date(activeFromMs).toLocaleString() : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">Court session invite</h1>
        {data.active ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">Your session is ready. You'll be redirected shortly.</p>
            <div>
              <Button onClick={() => navigate(data.join_path)}>Join now</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground">This invite will become active at {startsAt || 'the scheduled time'}.</p>
            {typeof secondsRemaining === 'number' && (
              <div className="text-lg">Starts in: <span className="font-semibold">{formatCountdown(secondsRemaining)}</span></div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Invite;
