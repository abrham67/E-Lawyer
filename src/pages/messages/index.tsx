import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/hooks/useApiClient';
import { useTranslation } from 'react-i18next';

type Msg = { senderId: string; recipientId: string; text: string; created_at?: string };

const MessagesIndex: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [partners, setPartners] = useState<Record<string, any>>({});
  const { authedFetch } = useApiClient();

  const messagesQuery = useQuery<Msg[]>({
    queryKey: ['messages'],
    queryFn: async () => {
      const data = await authedFetch('/api/communication/messages');
      return Array.isArray((data as any)?.messages) ? (data as any).messages : [];
    },
    enabled: !!user?.id,
  });

  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);
  const loading = messagesQuery.isLoading || messagesQuery.isFetching;
  const messagesError = messagesQuery.error as Error | null;

  const threads = useMemo(() => {
  if (!user?.id) return [] as Array<{ partnerId: string; lastMsg: Msg }>;
  // Sort newest first to pick the latest per partner
  const sorted = [...messages].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const byPartner = new Map<string, Msg>();
  for (const m of sorted) {
      const partner = String(m.senderId) === String(user?.id) ? m.recipientId : m.senderId;
      if (!byPartner.has(partner)) byPartner.set(partner, m);
    }
    return Array.from(byPartner.entries()).map(([partnerId, lastMsg]) => ({ partnerId, lastMsg }));
  }, [messages, user]);

  // Fetch partner profiles for display
  useEffect(() => {
    const missing = threads.map(t => t.partnerId).filter(id => !partners[id]);
    if (missing.length === 0) return;
    (async () => {
      const results = await Promise.allSettled(
        missing.map(id => fetch(`/api/profiles/${id}`).then(r => (r.ok ? r.json() : Promise.reject())))
      );
      const next: Record<string, any> = {};
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          const id = missing[idx];
          next[id] = res.value;
        }
      });
      if (Object.keys(next).length) setPartners(prev => ({ ...prev, ...next }));
    })();
  }, [threads, partners]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold mb-4">{t('messages.title')}</h1>
        {!user?.id ? (
          <div className="text-sm text-muted-foreground">{t('messages.loading_user')}</div>
        ) : messagesError ? (
          <div className="text-sm text-red-600">{messagesError.message || t('messages.failed_load')}</div>
        ) : loading ? (
          <div className="text-sm text-muted-foreground">{t('messages.loading')}</div>
        ) : threads.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('messages.no_conversations')}</p>
        ) : (
          <div className="space-y-2">
            {threads.map(({ partnerId, lastMsg }) => {
              const p = partners[partnerId];
              const name = p?.full_name || p?.email || partnerId;
              const when = lastMsg.created_at ? new Date(lastMsg.created_at).toLocaleString() : '';
              return (
                <div key={partnerId} className="p-3 border rounded hover:bg-accent cursor-pointer flex items-center justify-between" onClick={() => navigate(`/messages/${partnerId}`)}>
                  <div>
                    <div className="text-sm font-medium">{name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-xl">{lastMsg.text}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground ml-4">{when}</div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MessagesIndex;
