import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
          const msg = res.status === 404 ? t('invite.invalid_link') : res.status === 410 ? t('invite.ended') : t('invite.validate_failed');
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
        setError(t('invite.network_error'));
      } finally {
        setLoading(false);
      }
    };
    if (token) run();
  }, [token, navigate, t]);

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
        <div>{t('invite.checking')}</div>
      </main>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">{t('invite.problem')}</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => navigate('/')}>{t('invite.go_home')}</Button>
      </main>
    </div>
  );

  if (!data) return null;

  const startsAt = activeFromMs ? new Date(activeFromMs).toLocaleString() : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">{t('invite.title')}</h1>
        {data.active ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">{t('invite.ready')}</p>
            <div>
              <Button onClick={() => navigate(data.join_path)}>{t('invite.join_now')}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground">{t('invite.active_at')} {startsAt || t('invite.scheduled_time')}.</p>
            {typeof secondsRemaining === 'number' && (
              <div className="text-lg">{t('invite.starts_in')}: <span className="font-semibold">{formatCountdown(secondsRemaining)}</span></div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Invite;
