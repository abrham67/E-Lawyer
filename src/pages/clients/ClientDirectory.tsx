import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Mail, Phone, Search, MapPin, Video, Calendar, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Profile } from "@/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import io from 'socket.io-client';

interface Case {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface ClientWithCases extends Profile {
  cases?: Case[];
  upcoming_sessions?: any[];
}

const ClientDirectory = () => {
  const [clients, setClients] = useState<ClientWithCases[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedClient, setSelectedClient] = useState<ClientWithCases | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase();
  const isLawyer = role === 'lawyer';

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token') || undefined;
        // 1) Fetch clients list
        let list: ClientWithCases[] = [];
        if (isLawyer) {
          // Accepted clients (active cases) for this lawyer
          const res = await fetch('/api/cases/active-clients', { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal });
          if (!res.ok) throw new Error('Failed to fetch active clients');
          list = await res.json();
        } else {
          const res = await fetch('/api/clients', { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal });
          if (!res.ok) throw new Error('Failed to fetch clients');
          list = await res.json();
        }

        // 2) For lawyers, fetch all their cases once, then group by client
        if (isLawyer) {
          const casesRes = await fetch('/api/cases', { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal });
          const raw = await casesRes.json();
          const cases = (raw && Array.isArray(raw.cases)) ? raw.cases : (Array.isArray(raw) ? raw : []);
          const byClient: Record<string, Case[]> = {} as any;
          cases.forEach((c: any) => {
            const cid = (c.client_id || c.clientId || c.client)?.toString?.() || String(c.client_id || c.clientId || '');
            if (!cid) return;
            byClient[cid] = byClient[cid] || [];
            byClient[cid].push({
              id: (c._id || c.id || '').toString(),
              title: c.title,
              status: c.status,
              created_at: c.created_at || c.createdAt || new Date().toISOString(),
            });
          });
          list = list.map((cl: any) => ({ ...cl, cases: byClient[cl.id] || [] }));
        }

        // 3) Optionally fetch sessions per client (best-effort) via courtsessions (authorized)
        for (const client of list) {
          try {
            const sessionsRes = await fetch(`/api/courtsessions?client_id=${client.id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal });
            if (sessionsRes.ok) {
              client.upcoming_sessions = await sessionsRes.json();
            }
          } catch {}
        }

  setClients(list);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        toast({ title: 'Error', description: error.message || 'Failed to load clients', variant: 'destructive' });
      }
    };
    fetchData();
    return () => controller.abort();
  }, [toast, isLawyer]);

  // Realtime: refresh when case updated or created for this lawyer
  useEffect(() => {
    if (!isLawyer || !user?.id) return;
    const s = io('/', { path: '/ws/socket.io', query: { userId: user.id } });
    const refresh = () => {
      // Re-run fetch via toggling dependency: simplest is to call location.reload or repeat fetch inline
      // We'll perform a light refresh by reusing the fetch logic partially
      (async () => {
        try {
          const token = localStorage.getItem('token') || undefined;
          const res = await fetch('/api/cases/active-clients', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          if (!res.ok) return;
          let list: ClientWithCases[] = await res.json();
          const casesRes = await fetch('/api/cases', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          const raw = await casesRes.json();
          const cases = (raw && Array.isArray(raw.cases)) ? raw.cases : (Array.isArray(raw) ? raw : []);
          const byClient: Record<string, Case[]> = {} as any;
          cases.forEach((c: any) => {
            const cid = (c.client_id || c.clientId || c.client)?.toString?.() || String(c.client_id || c.clientId || '');
            if (!cid) return;
            byClient[cid] = byClient[cid] || [];
            byClient[cid].push({ id: (c._id || c.id || '').toString(), title: c.title, status: c.status, created_at: c.created_at || c.createdAt || new Date().toISOString() });
          });
          list = list.map((cl: any) => ({ ...cl, cases: byClient[cl.id] || [] }));
          setClients(list);
        } catch {}
      })();
    };
    s.on('case:updated', refresh);
    s.on('case:created', refresh);
    s.on('case:assigned', refresh);
  s.on('case:deleted', refresh);
    return () => { try { s.disconnect(); } catch {} };
  }, [isLawyer, user?.id]);

  const filteredClients = clients.filter((client) => {
    const matchText = client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchText) return false;
    if (statusFilter === 'all') return true;
    const hasStatus = (client.cases || []).some(c => String(c.status).toLowerCase() === statusFilter);
    return hasStatus;
  });

  const totalCases = clients.reduce((acc, client) => acc + (client.cases?.length || 0), 0);
  const virtualSessions = clients.reduce((acc, client) => 
    acc + (client.upcoming_sessions?.filter(session => session.is_virtual)?.length || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">My Clients</h1>
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search clients..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex border rounded-md">
              <Button 
                variant={viewMode === "grid" ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                Grid
              </Button>
              <Button 
                variant={viewMode === "list" ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                List
              </Button>
            </div>
            <div className="flex border rounded-md">
              <Button 
                variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="rounded-r-none"
              >
                All
              </Button>
              <Button 
                variant={statusFilter === 'active' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                className="rounded-none"
              >
                Active
              </Button>
              <Button 
                variant={statusFilter === 'closed' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('closed')}
                className="rounded-l-none"
              >
                Closed
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                Total Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{clients.length}</p>
              <p className="text-sm text-gray-500 mt-1">Active clients</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                Total Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalCases}</p>
              <p className="text-sm text-gray-500 mt-1">Across all clients</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Video className="h-5 w-5" />
                Virtual Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{virtualSessions}</p>
              <p className="text-sm text-gray-500 mt-1">Upcoming virtual meetings</p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Client List</h2>
          {filteredClients.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map((client) => (
                  <div 
                    key={client.id} 
                    className="border rounded-lg p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{client.full_name}</h3>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-600 flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            {client.email}
                          </p>
                          {client.contact_number && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <Phone className="h-4 w-4 mr-2 text-gray-400" />
                              {client.contact_number}
                            </p>
                          )}
                          {client.office_address && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                              {client.office_address}
                            </p>
                          )}
                        </div>
                        
                        {client.cases && client.cases.length > 0 && (
                          <div className="mt-3">
                            <Badge variant="outline" className="text-blue-600 bg-blue-50">
                              {client.cases.length} {client.cases.length === 1 ? 'case' : 'cases'}
                            </Badge>
                            
                            {client.upcoming_sessions && client.upcoming_sessions.length > 0 && (
                              <Badge variant="outline" className="ml-2 text-green-600 bg-green-50">
                                {client.upcoming_sessions.length} upcoming {client.upcoming_sessions.length === 1 ? 'session' : 'sessions'}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/messages/${client.id}`)}
                      >
                        Message
                      </Button>
                      <Button 
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/clients/${client.id}`)}
                      >
                        View Profile
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClients.map((client) => (
                  <Dialog key={client.id}>
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="font-medium text-lg mr-2">{client.full_name}</h3>
                            {client.cases && client.cases.length > 0 && (
                              <Badge variant="outline" className="text-blue-600 bg-blue-50">
                                {client.cases.length} {client.cases.length === 1 ? 'case' : 'cases'}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                            <p className="text-sm text-gray-600 flex items-center">
                              <Mail className="h-4 w-4 mr-1 text-gray-400" />
                              {client.email}
                            </p>
                            {client.contact_number && (
                              <p className="text-sm text-gray-600 flex items-center">
                                <Phone className="h-4 w-4 mr-1 text-gray-400" />
                                {client.contact_number}
                              </p>
                            )}
                          </div>
                          
                          {client.upcoming_sessions && client.upcoming_sessions.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-700 flex items-center">
                                <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                                Next session: {new Date(client.upcoming_sessions[0].scheduled_date).toLocaleDateString()} 
                                {client.upcoming_sessions[0].is_virtual && (
                                  <Badge variant="outline" className="ml-2 text-green-600 bg-green-50 flex items-center">
                                    <Video className="h-3 w-3 mr-1" />
                                    Virtual
                                  </Badge>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedClient(client)}
                            >
                              Details
                            </Button>
                          </DialogTrigger>
                          <Button 
                            size="sm"
                            onClick={() => navigate(`/clients/${client.id}`)}
                          >
                            Profile
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <DialogContent className="max-w-4xl">
                      {selectedClient && (
                        <>
                          <DialogHeader>
                            <DialogTitle>{selectedClient.full_name}</DialogTitle>
                          </DialogHeader>
                          
                          <Tabs defaultValue="overview">
                            <TabsList className="mb-4">
                              <TabsTrigger value="overview">Overview</TabsTrigger>
                              <TabsTrigger value="cases">Cases</TabsTrigger>
                              <TabsTrigger value="sessions">Court Sessions</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="overview" className="space-y-4">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-500">Contact Information</h4>
                                    <div className="mt-1 space-y-2">
                                      <p className="flex items-center">
                                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                        {selectedClient.email}
                                      </p>
                                      {selectedClient.contact_number && (
                                        <p className="flex items-center">
                                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                          {selectedClient.contact_number}
                                        </p>
                                      )}
                                      {selectedClient.office_address && (
                                        <p className="flex items-center">
                                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                                          {selectedClient.office_address}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-500">Quick Actions</h4>
                                    <div className="mt-1 flex gap-2">
                                      <Button variant="outline" size="sm" onClick={() => navigate(`/messages/${selectedClient.id}`)}>
                                        Send Message
                                      </Button>
                                      {['court', 'admin'].includes(role) && (
                                        <Button variant="outline" size="sm" onClick={() => navigate(`/calendar/new?client=${selectedClient.id}`)}>
                                          Schedule Meeting
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="text-sm font-medium text-gray-500">Upcoming Sessions</h4>
                                  {selectedClient.upcoming_sessions && selectedClient.upcoming_sessions.length > 0 ? (
                                    <div className="mt-1 space-y-2">
                                      {selectedClient.upcoming_sessions.map((session, index) => (
                                        <div key={index} className="border rounded p-3">
                                          <p className="font-medium">{session.case?.title || "Court Session"}</p>
                                          <div className="flex items-center justify-between mt-1">
                                            <p className="text-sm text-gray-600">
                                              {new Date(session.scheduled_date).toLocaleString()}
                                            </p>
                                            <div className="flex items-center">
                                              {session.is_virtual ? (
                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200 flex items-center gap-1">
                                                  <Video className="h-3 w-3" />
                                                  Virtual
                                                </Badge>
                                              ) : (
                                                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                                                  In-Person
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                          <div className="mt-2">
                                            {session.is_virtual && (
                                              <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => navigate(`/meeting/${session.id}`)}
                                              >
                                                Join Meeting
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500 mt-2">No upcoming sessions</p>
                                  )}
                                </div>
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="cases">
                              {selectedClient.cases && selectedClient.cases.length > 0 ? (
                                <div className="space-y-3">
                                  {selectedClient.cases.map((caseItem, index) => (
                                    <div key={index} className="border rounded p-4">
                                      <div className="flex justify-between items-center">
                                        <h3 className="font-medium">{caseItem.title}</h3>
                                        <Badge
                                          className={`${
                                            caseItem.status === 'active' 
                                              ? 'bg-green-100 text-green-800'
                                              : caseItem.status === 'pending'
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : 'bg-gray-100 text-gray-800'
                                          }`}
                                        >
                                          {caseItem.status}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1">
                                        Created: {new Date(caseItem.created_at).toLocaleDateString()}
                                      </p>
                                      <div className="mt-3">
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => navigate(`/cases/${caseItem.id}`)}
                                        >
                                          View Case
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8">
                                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                  <p>No cases found for this client</p>
                                  <Button 
                                    variant="outline" 
                                    className="mt-4"
                                    onClick={() => navigate(`/cases/new?client=${selectedClient.id}`)}
                                  >
                                    Create New Case
                                  </Button>
                                </div>
                              )}
                            </TabsContent>
                            
                            <TabsContent value="sessions">
                              {selectedClient.upcoming_sessions && selectedClient.upcoming_sessions.length > 0 ? (
                                <div className="space-y-3">
                                  {selectedClient.upcoming_sessions.map((session, index) => (
                                    <div key={index} className="border rounded p-4">
                                      <h3 className="font-medium">{session.case?.title || "Court Session"}</h3>
                                      <div className="flex items-center mt-2">
                                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                        <p className="text-sm">
                                          {new Date(session.scheduled_date).toLocaleString()}
                                        </p>
                                      </div>
                                      <div className="flex items-center mt-2">
                                        <Badge
                                          className={`mr-2 ${
                                            session.status === 'scheduled' 
                                              ? 'bg-blue-100 text-blue-800'
                                              : session.status === 'in_progress'
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : 'bg-green-100 text-green-800'
                                          }`}
                                        >
                                          {session.status.replace('_', ' ')}
                                        </Badge>
                                        {session.is_virtual ? (
                                          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                                            <Video className="h-3 w-3" />
                                            Virtual
                                          </Badge>
                                        ) : (
                                          <Badge className="bg-blue-100 text-blue-800">
                                            In-Person
                                          </Badge>
                                        )}
                                      </div>
                                      {session.is_virtual && session.status !== 'completed' && (
                                        <div className="mt-3">
                                          <Button 
                                            variant="default" 
                                            size="sm"
                                            onClick={() => navigate(`/meeting/${session.id}`)}
                                          >
                                            <Video className="h-4 w-4 mr-2" />
                                            Join Virtual Meeting
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8">
                                  <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                  <p>No upcoming court sessions</p>
                                  {['court', 'admin'].includes(role) && (
                                    <Button 
                                      variant="outline" 
                                      className="mt-4"
                                      onClick={() => navigate(`/calendar/new?client=${selectedClient.id}`)}
                                    >
                                      Schedule New Session
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-12 border rounded-lg bg-gray-50">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No clients found matching "{searchTerm}"</p>
              {searchTerm && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setSearchTerm("")}
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClientDirectory;
