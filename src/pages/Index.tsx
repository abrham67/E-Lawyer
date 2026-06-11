import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useApiClient } from "@/hooks/useApiClient";

import type { Profile, Case, CourtSession } from "@/types/database.types";
import { CalendarDays, Scale, Users, Activity, FileText, Briefcase } from "lucide-react";
import Navbar from "@/components/Navbar";
import AskAIBot from "@/components/AskAIBot";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface CaseWithDetails extends Omit<Case, 'lawyer_id'> {
  lawyer: Profile;
  court_sessions?: CourtSession[];
  lawyer_id: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authedFetch } = useApiClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lawyers, setLawyers] = useState<Profile[]>([]);
  const [connectedLawyers, setConnectedLawyers] = useState<Profile[]>([]);
  const [cases, setCases] = useState<CaseWithDetails[]>([]);
  const [pendingCases, setPendingCases] = useState<CaseWithDetails[]>([]);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingCaseId, setRejectingCaseId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeCases, setActiveCases] = useState<CaseWithDetails[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<CourtSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user profile using backend API (no Supabase)
  // Public: No authentication required
  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Not authenticated');
      const data = await res.json();
      setProfile(data.user || null);
    } catch (err) {
      // silent: not authenticated
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Redirect to /auth if not authenticated and not loading
  useEffect(() => {
    if (!loading && !profile) {
      navigate('/auth');
    }
  }, [loading, profile, navigate]);

  const fetchClientCases = useCallback(async () => {
    if (!profile) return;
    try {
      const tokenLocal = localStorage.getItem('token');
      const response = await fetch(`/api/cases?client_id=${profile.id}`, { headers: tokenLocal ? { Authorization: `Bearer ${tokenLocal}` } : undefined });
      if (!response.ok) throw new Error('Failed to fetch cases');
      const raw = await response.json();
      const data = raw.cases || raw || [];
      const transformedCases = (data || []).map((caseData: any) => {
        let status: 'pending' | 'active' | 'closed' = 'pending';
        if (caseData.status === 'active' || caseData.status === 'closed') {
          status = caseData.status;
        }
        return {
          ...caseData,
          status,
          lawyer: caseData.lawyer,
          court_sessions: caseData.court_sessions
        };
      });
      setPendingCases(transformedCases.filter((c: any) => c.status === 'pending'));
      setActiveCases(transformedCases.filter((c: any) => c.status === 'active'));
      setCases(transformedCases);
    } catch (error) {
      console.error('Error fetching cases:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cases',
        variant: 'destructive',
      });
    }
  }, [profile, toast]);

  const fetchLawyerCases = useCallback(async () => {
    if (!profile) return;
    try {
      const tokenLocal = localStorage.getItem('token');
      const response = await fetch(`/api/cases?lawyer_id=${profile.id}`, { headers: tokenLocal ? { Authorization: `Bearer ${tokenLocal}` } : undefined });
      if (!response.ok) throw new Error('Failed to fetch cases');
      const raw = await response.json();
      const data = raw.cases || raw || [];
      const transformedCases = (data || []).map((caseData: any) => {
        let status: 'pending' | 'active' | 'closed' = 'pending';
        if (caseData.status === 'active' || caseData.status === 'closed') {
          status = caseData.status;
        }
        return {
          ...caseData,
          status,
          client: caseData.client,
          court_sessions: caseData.court_sessions
        };
      });
      setPendingCases(transformedCases.filter((c: any) => c.status === 'pending'));
      setActiveCases(transformedCases.filter((c: any) => c.status === 'active'));
      setCases(transformedCases);
    } catch (error) {
      console.error('Error fetching cases:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cases',
        variant: 'destructive',
      });
    }
  }, [profile, toast]);

  const fetchCourtSessions = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await authedFetch(`/api/courtsessions?court_id=${profile.id}`);
      setUpcomingSessions(data || []);
    } catch (error) {
      console.error('Error fetching court sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load court sessions',
        variant: 'destructive',
      });
    }
  }, [profile, toast, authedFetch]);

  const fetchLawyers = useCallback(async () => {
    try {
      const response = await fetch('/api/profiles?role=lawyer');
      if (!response.ok) throw new Error('Failed to fetch lawyers');
      const data = await response.json();
      setLawyers(data || []);
    } catch (error) {
      console.error('Error fetching lawyers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lawyers',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const fetchConnectedLawyers = useCallback(async () => {
    if (!profile) return;
    try {
      const response = await fetch(`/api/cases?client_id=${profile.id}`);
      if (!response.ok) throw new Error('Failed to fetch connected lawyers');
      const casesData = await response.json();
      const lawyerIds = casesData.map((c: any) => c.lawyer_id).filter(Boolean);
      if (lawyerIds.length === 0) return;
      const lawyersRes = await fetch(`/api/profiles?ids=${lawyerIds.join(',')}`);
      if (!lawyersRes.ok) throw new Error('Failed to fetch lawyers');
      const lawyersData = await lawyersRes.json();
      setConnectedLawyers(lawyersData || []);
    } catch (error) {
      console.error('Error fetching connected lawyers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load connected lawyers',
        variant: 'destructive',
      });
    }
  }, [profile, toast]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    if (profile?.role === "client" || profile?.role === "admin") {
      fetchLawyers();
      fetchConnectedLawyers();
      fetchClientCases();
      if (profile?.role === "admin") {
        fetchLawyerCases();
        fetchCourtSessions();
      }
    } else if (profile?.role === "lawyer") {
      fetchLawyerCases();
    } else if (profile?.role === "court") {
      fetchCourtSessions();
    }
  }, [profile, fetchLawyers, fetchConnectedLawyers, fetchClientCases, fetchLawyerCases, fetchCourtSessions]);

  if (!profile && !loading) {
    return null;
  }

  const connectWithLawyer = async (lawyerId: string) => {
    if (!profile) return;
    try {
      const tokenLocal = localStorage.getItem('token');
      const response = await fetch('/api/cases/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tokenLocal ? { Authorization: `Bearer ${tokenLocal}` } : {}) },
        body: JSON.stringify({
          lawyer_id: lawyerId,
          title: 'New Case',
          description: 'Pending lawyer approval'
        })
      });
      if (!response.ok) throw new Error('Failed to connect with lawyer');
      toast({
        title: 'Success',
        description: 'Case request sent to lawyer',
      });
      await Promise.all([
        fetchConnectedLawyers(),
        fetchClientCases()
      ]);
    } catch (error) {
      console.error('Error connecting with lawyer:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect with lawyer',
        variant: 'destructive',
      });
    }
  };

  const joinMeeting = (meetingLink: string) => {
    window.open(meetingLink, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-6 max-w-sm w-full bg-white shadow-md rounded-lg">
          <div className="flex justify-center">
            <Briefcase className="h-12 w-12 text-primary animate-pulse" />
          </div>
          <p className="mt-4 text-center text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    navigate('/auth');
    return null;
  }

  const renderLawyerDashboard = () => (
  <div id="main-dashboard-section" className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h1 className="text-2xl font-bold text-primary">Welcome, {profile.full_name}</h1>
          <p className="text-gray-500">Lawyer Dashboard</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Scale className="h-5 w-5" />
                Pending Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{pendingCases.length}</p>
              <p className="text-sm text-gray-500 mt-1">Awaiting your action</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Activity className="h-5 w-5" />
                Active Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeCases.length}</p>
              <p className="text-sm text-gray-500 mt-1">Currently in progress</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <CalendarDays className="h-5 w-5" />
                Upcoming Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {cases.reduce((acc, c) => 
                  acc + (c.court_sessions?.filter(s => 
                    s.status === 'scheduled' && 
                    new Date(s.scheduled_date) > new Date()
                  ).length || 0), 
                0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Scheduled meetings</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                Recent Cases
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {cases.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">No cases found</p>
                  <Button
                    type="button"
                    onClick={() => navigate("/cases/new")}
                    variant="outline"
                    className="mt-4"
                  >
                    Create New Case
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cases.slice(0, 5).map((case_) => (
                    <div
                      key={case_.id}
                      className="p-4 border border-gray-100 rounded-lg space-y-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-primary">{case_.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          case_.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : case_.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {case_.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">{case_.description}</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/cases/${case_.id}`)}
                          className="flex-1"
                        >
                          View Details
                        </Button>
                        {case_.status === 'pending' && profile.role === 'lawyer' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-50 text-green-700"
                              onClick={async () => {
                                try {
                                  const tokenLocal = localStorage.getItem('token');
                                  const res = await fetch(`/api/cases/${case_.id}/status`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json', ...(tokenLocal ? { Authorization: `Bearer ${tokenLocal}` } : {}) },
                                    body: JSON.stringify({ status: 'active' })
                                  });
                                  if (!res.ok) throw new Error('Failed to approve case');
                                  await fetchLawyerCases();
                                  toast({ title: 'Case approved', description: 'Case is now active' });
                                } catch (err) {
                                  toast({ title: 'Error', description: 'Failed to approve case', variant: 'destructive' });
                                }
                              }}
                            >
                              Approve
                            </Button>
                            <>
                              <Button
                                size="sm"
                                className="bg-red-50 text-red-700"
                                onClick={() => {
                                  setRejectingCaseId(case_.id);
                                  setRejectReason('');
                                  setShowRejectDialog(true);
                                }}
                              >
                                Reject
                              </Button>

                              {/* Reject Dialog */}
                              <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Reject Case</DialogTitle>
                                  </DialogHeader>
                                  <div className="py-2">
                                    <p className="text-sm text-muted-foreground mb-2">Provide a reason for rejecting this case (optional).</p>
                                    <Textarea value={rejectReason} onChange={(e: any) => setRejectReason(e.target.value)} />
                                  </div>
                                  <DialogFooter>
                                    <Button variant="ghost" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
                                    <Button
                                      onClick={async () => {
                                        try {
                                          if (!rejectingCaseId) return;
                                          const tokenLocal = localStorage.getItem('token');
                                          const res = await fetch(`/api/cases/${rejectingCaseId}/status`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json', ...(tokenLocal ? { Authorization: `Bearer ${tokenLocal}` } : {}) },
                                            body: JSON.stringify({ status: 'rejected', reason: rejectReason })
                                          });
                                          if (!res.ok) throw new Error('Failed to reject case');
                                          setShowRejectDialog(false);
                                          await fetchLawyerCases();
                                          toast({ title: 'Case rejected', description: rejectReason ? `Reason: ${rejectReason}` : 'Case was rejected' });
                                        } catch (err) {
                                          toast({ title: 'Error', description: 'Failed to reject case', variant: 'destructive' });
                                        }
                                      }}
                                    >
                                      Confirm Reject
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {cases.length > 5 && (
                    <Button 
                      variant="link" 
                      className="w-full text-primary"
                      onClick={() => navigate("/cases")}
                    >
                      View All Cases
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-primary">
                <CalendarDays className="h-5 w-5" />
                Upcoming Court Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {cases.flatMap(case_ => 
                case_.court_sessions?.filter(session => 
                  session.status === 'scheduled' && 
                  new Date(session.scheduled_date) > new Date()
                ) || []
              ).length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">No upcoming sessions</p>
                  {/* Only court/admin can schedule sessions */}
                  {String(profile?.role || '').toLowerCase() === 'court' && (
                    <Button
                      onClick={() => navigate("/calendar/new")}
                      variant="outline"
                      className="mt-4"
                    >
                      Schedule Session
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {cases.map(case_ => 
                    case_.court_sessions?.filter(session => 
                      session.status === 'scheduled' && 
                      new Date(session.scheduled_date) > new Date()
                    ).map(session => (
                      <div key={session.id} className="p-4 border border-gray-100 rounded-lg space-y-2 hover:bg-gray-50 transition-colors">
                        <p className="font-medium text-primary">{case_.title}</p>
                        <div className="flex items-center text-sm text-gray-600">
                          <CalendarDays className="h-4 w-4 mr-2" />
                          {new Date(session.scheduled_date).toLocaleDateString()} at {new Date(session.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        {session.is_virtual && (
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => navigate(`/meeting/${session.id}`)}
                          >
                            Join Meeting
                          </Button>
                        )}
                      </div>
                    ))
                  ).flat()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderCourtDashboard = () => (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h1 className="text-2xl font-bold text-primary">Welcome, {profile.court_name || profile.full_name}</h1>
          <p className="text-gray-500">Court Dashboard</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-primary">
                <CalendarDays className="h-5 w-5" />
                Upcoming Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {(() => {
                const futureSessions = (upcomingSessions || []).filter(s => String(s.status || '').toLowerCase() === 'scheduled' && new Date(s.scheduled_date) > new Date());
                return futureSessions.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">No upcoming sessions</p>
                  <Button
                    onClick={() => navigate("/calendar/new")}
                    variant="outline"
                    className="mt-4"
                  >
                    Schedule New Session
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {futureSessions.map(session => (
                    <div key={session.id} className="p-4 border border-gray-100 rounded-lg space-y-3 hover:bg-gray-50 transition-colors">
                      <h3 className="font-medium text-primary">
                        {session.case?.title || 'Untitled Case'}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarDays className="h-4 w-4 mr-2" />
                        {new Date(session.scheduled_date).toLocaleDateString()} at {new Date(session.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded-md">
                        <p className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          <span className="font-medium mr-2">Lawyer:</span> {session.case?.lawyer?.full_name || 'Not assigned'}
                        </p>
                        <p className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          <span className="font-medium mr-2">Client:</span> {session.case?.client?.full_name || 'Not assigned'}
                        </p>
                      </div>
                      {session.is_virtual && session.virtual_meeting_link && (
                        <Button
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => window.open(session.virtual_meeting_link!, '_blank')}
                        >
                          Join Meeting
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )
              })()}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CalendarDays className="h-5 w-5" />
                  Scheduled Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{(upcomingSessions || []).filter(s => String(s.status || '').toLowerCase() === 'scheduled' && new Date(s.scheduled_date) > new Date()).length}</p>
                <p className="text-sm text-gray-500 mt-1">Upcoming court sessions</p>
                {String(profile?.role || '').toLowerCase() === 'court' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/calendar/new")}
                    className="mt-4 w-full"
                  >
                    Schedule New Session
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Activity className="h-5 w-5" />
                  Monthly Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[150px] flex items-center justify-center border rounded-md">
                  <p className="text-gray-500">Activity chart will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClientDashboard = () => (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h1 className="text-2xl font-bold text-primary">Welcome, {profile.full_name}</h1>
          <p className="text-gray-500">Client Dashboard</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <FileText className="h-5 w-5" />
                  Your Cases
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {cases.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500">No active cases</p>
                    <p className="text-sm text-gray-400 mt-2">Connect with a lawyer to start a case</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cases.map((case_) => (
                      <div
                        key={case_.id}
                        className="p-4 border border-gray-100 rounded-lg space-y-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-primary">{case_.title}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            case_.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : case_.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {case_.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {case_.description}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Lawyer: {case_.lawyer.full_name}
                        </p>
                        
                        {case_.court_sessions?.filter(session => 
                          session.status === 'scheduled' && 
                          new Date(session.scheduled_date) > new Date()
                        ).map(session => (
                          <div key={session.id} className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-primary flex items-center">
                              <CalendarDays className="h-4 w-4 mr-2" />
                              Upcoming Meeting
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(session.scheduled_date).toLocaleDateString()} at {new Date(session.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                            {session.is_virtual && session.virtual_meeting_link && (
                              <Button
                                size="sm"
                                className="mt-2 w-full"
                                onClick={() => window.open(session.virtual_meeting_link!, '_blank')}
                              >
                                Join Meeting
                              </Button>
                            )}
                          </div>
                        ))}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/cases/${case_.id}`)}
                          className="w-full mt-2"
                        >
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Users className="h-5 w-5" />
                  Your Lawyers
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {connectedLawyers.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500">No connected lawyers yet</p>
                    <p className="text-sm text-gray-400 mt-2">Browse available lawyers to connect</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {connectedLawyers.map((lawyer) => (
                      <div
                        key={lawyer.id}
                        className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-primary">{lawyer.full_name}</p>
                          <p className="text-sm text-gray-500">
                            {lawyer.specialization || 'General Practice'}
                          </p>
                          {lawyer.contact_number && (
                            <p className="text-xs text-gray-500 mt-1">
                              {lawyer.contact_number}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/messages/${lawyer.id || (lawyer as any)._id}`)}
                        >
                          Contact
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm hover:shadow-md transition-shadow h-fit">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                Available Lawyers
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {lawyers
                .filter(
                  (lawyer) =>
                    !connectedLawyers.some(
                      (connected) => connected.id === lawyer.id
                    )
                ).length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">No available lawyers found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lawyers
                    .filter(
                      (lawyer) =>
                        !connectedLawyers.some(
                          (connected) => connected.id === lawyer.id
                        )
                    )
                    .map((lawyer) => (
                      <div
                        key={lawyer.id}
                        className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-primary">{lawyer.full_name}</p>
                          <p className="text-sm text-gray-500">
                            {lawyer.specialization || 'General Practice'}
                          </p>
                          {lawyer.hourly_rate && (
                            <p className="text-sm text-gray-600 mt-1">
                              Rate: ${lawyer.hourly_rate}/hr
                            </p>
                          )}
                          {lawyer.years_of_experience && (
                            <p className="text-xs text-gray-500 mt-1">
                              {lawyer.years_of_experience} years experience
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => connectWithLawyer(lawyer.id || (lawyer as any)._id)}
                          size="sm"
                        >
                          Request Connection
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  if (profile.role === "client") {
    return (<>
      {renderClientDashboard()}
      <AskAIBot />
    </>);
  }

  if (profile.role === "lawyer") {
    return (<>
      {renderLawyerDashboard()}
      <AskAIBot />
    </>);
  }

  if (profile.role === "court") {
    return (<>
      {renderCourtDashboard()}
      <AskAIBot />
    </>);
  }

  return (<>
    <AskAIBot />
  </>);
};

export default Index;
