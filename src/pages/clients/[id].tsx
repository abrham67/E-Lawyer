import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, Phone, MapPin, FileText, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/types/database.types';

const ClientProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [client, setClient] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setLoading(true);
        if (!id) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Client ID is missing",
          });
          navigate('/clients');
          return;
        }
        
        // TODO: Replace with backend API calls
        const clientRes = await fetch(`/api/clients/${id}`);
        if (!clientRes.ok) throw new Error('Client not found');
        const clientData = await clientRes.json();
        setClient(clientData as Profile);
        
        const casesRes = await fetch(`/api/cases?client_id=${id}`);
    const raw = await casesRes.json();
    setCases(raw.cases || raw || []);
        
        const sessionsRes = await fetch(`/api/sessions?client_id=${id}`);
        setSessions(await sessionsRes.json());
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
        navigate('/clients');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClientData();
  }, [id, navigate, toast]);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading client profile...</p>
      </div>
    );
  }
  
  if (!client) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">Client Not Found</h1>
            <p className="mt-2 text-muted-foreground">The client profile you're looking for doesn't exist or you don't have permission to view it.</p>
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold">{client.full_name}</CardTitle>
              <CardDescription>Client Profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                    {client.full_name?.substring(0, 2).toUpperCase() || 'CL'}
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold">{client.full_name}</h3>
                    <p className="text-sm text-muted-foreground">Client</p>
                  </div>
                </div>
                
                <div className="pt-4 space-y-3">
                  {client.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  
                  {client.contact_number && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{client.contact_number}</span>
                    </div>
                  )}
                  
                  {client.office_address && (
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{client.office_address}</span>
                    </div>
                  )}
                </div>
                
                <div className="pt-4">
                  <Button variant="outline" className="w-full" onClick={() => navigate(`/cases/new?client=${client.id}`)}>
                    Create New Case
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Client Details */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="cases">
              <TabsList className="mb-4">
                <TabsTrigger value="cases">Cases</TabsTrigger>
                <TabsTrigger value="sessions">Upcoming Sessions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="cases">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Client Cases</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cases.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="mt-2 text-muted-foreground">No cases found for this client.</p>
                        <Button className="mt-4" onClick={() => navigate(`/cases/new?client=${client.id}`)}>
                          Create New Case
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {cases.map((caseItem) => (
                          <div key={caseItem.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold">{caseItem.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {caseItem.practice_area} • {caseItem.case_type}
                                </p>
                                <div className="flex items-center mt-1">
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    caseItem.status === 'active' ? 'bg-green-100 text-green-800' :
                                    caseItem.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {caseItem.status?.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${caseItem.id}`)}>
                                View Details
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="sessions">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Upcoming Court Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sessions.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="mt-2 text-muted-foreground">No upcoming court sessions scheduled.</p>
                        {['court', 'admin'].includes(String(authUser?.role || '').toLowerCase()) && (
                          <Button className="mt-4" onClick={() => navigate('/calendar/new')}>
                            Schedule Session
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sessions.map((session) => (
                          <div key={session.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold">{session.case?.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(session.scheduled_date).toLocaleDateString()} • {new Date(session.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <div className="flex items-center mt-1">
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    session.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    session.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {session.status?.toUpperCase()}
                                  </span>
                                  {session.is_virtual && (
                                    <span className="text-xs ml-2 px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                                      VIRTUAL
                                    </span>
                                  )}
                                </div>
                              </div>
                              {session.is_virtual && session.status === 'scheduled' && (
                                <Button variant="default" size="sm" onClick={() => navigate(`/meeting/${session.id}`)}>
                                  Join Meeting
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientProfile;
