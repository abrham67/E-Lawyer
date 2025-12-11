
import React, { useState, useEffect } from 'react';
import { Calendar, List, Video, MapPin, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
// Supabase removed; using backend API
import { CourtSession } from "@/types/database.types";

const MeetingsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const [courtSessions, setCourtSessions] = useState<CourtSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourtSessions = async () => {
    try {
      setLoading(true);
    // Authenticate user
    const token = localStorage.getItem('token');
    const sessionRes = await fetch('/api/auth/me', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!sessionRes.ok) {
        navigate('/auth');
        return;
      }
    const sessionData = await sessionRes.json();
    const user = sessionData.user;
      if (!user) {
        navigate('/auth');
        return;
      }
      // Fetch court sessions from backend API
  const response = await fetch('/api/courtsessions', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error('Failed to fetch court sessions');
      const data = await response.json();
      setCourtSessions(data || []);
    } catch (error) {
      console.error('Error fetching court sessions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load court sessions',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourtSessions();
  }, [navigate, toast]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleJoinMeeting = (session: CourtSession) => {
    navigate(`/meeting/${session.id}`);
  };

  const handleCreateSession = () => {
    navigate('/calendar/new');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Court Sessions</h1>
          {String(authUser?.role || '').toLowerCase() === 'court' && (
            <Button onClick={handleCreateSession} className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>New Session</span>
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Sessions</CardTitle>
            <CardDescription>
              View and manage your scheduled court sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : courtSessions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courtSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.case?.title || "Untitled Case"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{format(new Date(session.scheduled_date), 'MMMM d, yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {session.is_virtual ? (
                            <>
                              <Video className="h-4 w-4 text-blue-500" />
                              <span>Virtual</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="h-4 w-4 text-green-500" />
                              <span>In-person</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                      <TableCell>
                        {session.is_virtual && session.status !== 'completed' && session.status !== 'cancelled' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1"
                            onClick={() => handleJoinMeeting(session)}
                          >
                            <Video className="h-3 w-3" />
                            <span>Join</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <List className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-2 text-lg font-medium">No sessions found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You don't have any court sessions scheduled yet.
                </p>
                {String(authUser?.role || '').toLowerCase() === 'court' && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={handleCreateSession}
                  >
                    Schedule a Session
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MeetingsList;
