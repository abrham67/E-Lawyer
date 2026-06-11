import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface CourtSession {
  _id: string;
  caseId: string;
  judgeId: string;
  scheduleDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
}

const CourtSessionsList: React.FC = () => {
  const [sessions, setSessions] = useState<CourtSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch('/api/courtsessions', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        if (!res.ok) {
          let errorMsg = t('court_sessions.failed_fetch');
          try {
            const errText = await res.text();
            errorMsg += `: ${errText}`;
          } catch {}
          throw new Error(errorMsg);
        }
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : (data.sessions || []));
      } catch (err) {
        toast({
          variant: 'destructive',
          title: t('court_sessions.error'),
          description: err instanceof Error ? err.message : t('court_sessions.failed_load'),
        });
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [toast, t]);

  const filtered = sessions.filter(s =>
    s.location?.toLowerCase().includes(search.toLowerCase()) ||
    s._id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold">{t('court_sessions.title')}</h1>
          <Button onClick={() => navigate('/courtsessions/new')}>{t('court_sessions.new')}</Button>
        </div>
        <div className="mb-6">
          <Input
            placeholder={t('court_sessions.search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(session => (
              <Card key={session._id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>{t('court_sessions.card_title')}</CardTitle>
                  <CardDescription>
                    {session.location || t('court_sessions.no_location')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div><b>{t('court_sessions.case_id')}:</b> {session.caseId}</div>
                    <div><b>{t('court_sessions.judge_id')}:</b> {session.judgeId}</div>
                    <div><b>{t('court_sessions.date')}:</b> {new Date(session.scheduleDate).toLocaleString()}</div>
                    {session.startTime && <div><b>{t('court_sessions.start')}:</b> {session.startTime}</div>}
                    {session.endTime && <div><b>{t('court_sessions.end')}:</b> {session.endTime}</div>}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/courtsessions/${session._id}`)}>{t('court_sessions.view')}</Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/courtsessions/${session._id}/edit`)}>{t('court_sessions.edit')}</Button>
                    <Button variant="destructive" size="sm" onClick={async () => {
                      if (window.confirm(t('court_sessions.delete_confirm'))) {
                        try {
                          const res = await fetch(`/api/courtsessions/${session._id}`, { method: 'DELETE' });
                          if (!res.ok) throw new Error(t('court_sessions.failed_delete'));
                          setSessions(sessions.filter(s => s._id !== session._id));
                          toast({ title: t('court_sessions.deleted') });
                        } catch (err: any) {
                          toast({ variant: 'destructive', title: t('court_sessions.error'), description: err.message });
                        }
                      }
                    }}>{t('court_sessions.delete')}</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="mt-4 text-lg font-medium">{t('court_sessions.no_sessions_found')}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? t('court_sessions.adjust_search') : t('court_sessions.no_sessions_scheduled')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CourtSessionsList;
