import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

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

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch('/api/courtsessions', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        if (!res.ok) {
          let errorMsg = 'Failed to fetch court sessions';
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
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to load court sessions',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [toast]);

  const filtered = sessions.filter(s =>
    s.location?.toLowerCase().includes(search.toLowerCase()) ||
    s._id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold">Court Sessions</h1>
          <Button onClick={() => navigate('/courtsessions/new')}>New Court Session</Button>
        </div>
        <div className="mb-6">
          <Input
            placeholder="Search by location or ID..."
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
                  <CardTitle>Court Session</CardTitle>
                  <CardDescription>
                    {session.location || 'No location'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div><b>Case ID:</b> {session.caseId}</div>
                    <div><b>Judge ID:</b> {session.judgeId}</div>
                    <div><b>Date:</b> {new Date(session.scheduleDate).toLocaleString()}</div>
                    {session.startTime && <div><b>Start:</b> {session.startTime}</div>}
                    {session.endTime && <div><b>End:</b> {session.endTime}</div>}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/courtsessions/${session._id}`)}>View</Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/courtsessions/${session._id}/edit`)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={async () => {
                      if (window.confirm('Delete this court session?')) {
                        try {
                          const res = await fetch(`/api/courtsessions/${session._id}`, { method: 'DELETE' });
                          if (!res.ok) throw new Error('Failed to delete');
                          setSessions(sessions.filter(s => s._id !== session._id));
                          toast({ title: 'Court session deleted' });
                        } catch (err: any) {
                          toast({ variant: 'destructive', title: 'Error', description: err.message });
                        }
                      }
                    }}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="mt-4 text-lg font-medium">No court sessions found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? 'Try adjusting your search' : 'No sessions scheduled yet.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CourtSessionsList;
