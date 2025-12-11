
import { useEffect, useState } from 'react';
import { useCase } from '@/hooks/useCase';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, MessageSquare, Users, Gavel } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// Supabase removed; using backend API
import { CourtSession, CaseDocument } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const CaseDetails = () => {
  const { caseData, loading } = useCase();
  const [sessions, setSessions] = useState<CourtSession[]>([]);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [caseHistory, setCaseHistory] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchCaseData = async () => {
      if (!caseData?.id) return;
      try {
        const token = localStorage.getItem('token');
        const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

        // Fetch court sessions
        setLoadingSessions(true);
        try {
          const sessionsRes = await fetch(`/api/courtsessions?case_id=${caseData.id}`, { headers: { ...authHeader } });
          if (!sessionsRes.ok) {
            const msg = await sessionsRes.text();
            toast({ title: 'Failed to fetch court sessions', description: msg || `${sessionsRes.status} ${sessionsRes.statusText}`, variant: 'destructive' });
            throw new Error('Failed to fetch court sessions');
          }
          const sessionsData = await sessionsRes.json();
          const list = Array.isArray(sessionsData) ? sessionsData : (sessionsData?.sessions || sessionsData || []);
          setSessions(list);
        } finally {
          setLoadingSessions(false);
        }

        // Fetch case documents
        setLoadingDocuments(true);
        try {
          const documentsRes = await fetch(`/api/documents/${caseData.id}`, { headers: { ...authHeader } });
          if (!documentsRes.ok) {
            const msg = await documentsRes.text();
            toast({ title: 'Failed to fetch case documents', description: msg || `${documentsRes.status} ${documentsRes.statusText}`, variant: 'destructive' });
            throw new Error('Failed to fetch case documents');
          }
          const documentsData = await documentsRes.json();
          const docs = Array.isArray(documentsData) ? documentsData : (documentsData?.documents || documentsData || []);
          setDocuments(docs);
        } finally {
          setLoadingDocuments(false);
        }

        // fetch history if present (non-blocking)
        try {
          const historyRes = await fetch(`/api/cases/${caseData.id}`, { headers: { ...authHeader } });
          if (historyRes.ok) {
            const full = await historyRes.json();
            setCaseHistory(full.history || []);
          }
        } catch (e) {
          // ignore history errors
        }
      } catch (error: any) {
        console.error('Error fetching case data:', error);
        toast({
          title: 'Error loading case data',
          description: error.message || error.toString(),
          variant: 'destructive',
        });
      }
    };

    fetchCaseData();
  }, [caseData, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading case information...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!caseData) {
    return null; // Our hook will handle navigation if case is not found
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{caseData.title}</h1>
            <p className="text-muted-foreground">
              {(caseData.practice_area || 'Not specified')} • {(caseData.status || 'pending')}
            </p>
          </div>
          <div className="flex gap-2">
            {String(user?.role || '').toLowerCase() === 'court' && (
              <Button onClick={() => navigate(`/calendar/new?case=${caseData.id}`)}>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Session
              </Button>
            )}
            <Button onClick={() => navigate('/documents')}>
              <FileText className="h-4 w-4 mr-2" />
              View Documents
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Parties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {caseData.lawyer && (
                  <div>
                    <p className="text-sm text-muted-foreground">Lawyer</p>
                    <p className="font-medium">{caseData.lawyer.full_name}</p>
                    <p className="text-sm">{caseData.lawyer.email}</p>
                  </div>
                )}
                {caseData.client && (
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{caseData.client.full_name}</p>
                    <p className="text-sm">{caseData.client.email}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-primary" />
                Case Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Case Type</p>
                  <p>{caseData.case_type || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Practice Area</p>
                  <p>{caseData.practice_area || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created On</p>
                  <p>
                    {(() => {
                      const raw = (caseData as any).created_at || (caseData as any).createdAt;
                      let d = raw ? new Date(raw) : null;
                      if ((!d || isNaN(d.getTime())) && (caseData as any).id) {
                        // Fallback: derive from Mongo ObjectId timestamp (first 8 hex chars)
                        const oid = String((caseData as any).id);
                        if (/^[a-f\d]{24}$/i.test(oid)) {
                          const ts = parseInt(oid.substring(0, 8), 16) * 1000;
                          const derived = new Date(ts);
                          if (!isNaN(derived.getTime())) d = derived;
                        }
                      }
                      return d && !isNaN(d.getTime()) ? d.toLocaleDateString() : 'Not available';
                    })()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{caseData.description}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sessions" className="bg-white p-6 rounded-lg shadow-sm">
          <TabsList className="mb-4">
            <TabsTrigger value="sessions">Court Sessions</TabsTrigger>
            <TabsTrigger value="documents">Case Documents</TabsTrigger>
            <TabsTrigger value="history">Case History</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            {loadingSessions ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading sessions...</p>
              </div>
            ) : sessions.length > 0 ? (
              <div className="divide-y">
                {sessions.map((session) => (
                  <div key={session.id} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        Court Session on {new Date(session.scheduled_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.scheduled_date).toLocaleTimeString()} • 
                        Status: {session.status.replace('_', ' ')}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(`/meeting/${session.id}`)}
                    >
                      Join Session
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No court sessions scheduled</p>
                {String(user?.role || '').toLowerCase() === 'court' && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate(`/calendar/new?case=${caseData.id}`)}
                  >
                    Schedule Session
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents">
            {loadingDocuments ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading documents...</p>
              </div>
            ) : documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{doc.file_name}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No documents uploaded</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/documents')}
                >
                  Upload Documents
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Case History</CardTitle>
              </CardHeader>
              <CardContent>
                {caseHistory.length > 0 ? (
                  <div className="space-y-3">
                    {caseHistory.map((h, idx) => (
                      <div key={idx} className="p-3 border rounded">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">{h.status}</p>
                            <p className="text-xs text-muted-foreground">By: {h.by ? h.by.toString() : 'system'}</p>
                          </div>
                          <div className="text-sm text-muted-foreground">{new Date(h.timestamp || h.created_at || h.date || Date.now()).toLocaleString()}</div>
                        </div>
                        {h.reason && <p className="mt-2 text-sm">Reason: {h.reason}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No history available for this case</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CaseDetails;
