import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Supabase removed; using backend API
import { CourtSession } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import CustomVideoConference from '@/components/CustomVideoConference';
import Navbar from '@/components/Navbar';

const VideoMeeting = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState<CourtSession | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      try {
  // Get the current user
  const token = localStorage.getItem('token');
  const sessionRes = await fetch('/api/auth/me', { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!sessionRes.ok) {
          toast({
            variant: 'destructive',
            title: 'Authentication required',
            description: 'You must be logged in to join a meeting',
          });
          navigate('/auth');
          return;
        }
  const sessionDataUser = await sessionRes.json();
  const user = sessionDataUser.user || sessionDataUser;
        if (!user) {
          toast({
            variant: 'destructive',
            title: 'Authentication required',
            description: 'You must be logged in to join a meeting',
          });
          navigate('/auth');
          return;
        }
    // Fetch the session from backend API
  const response = await fetch(`/api/courtsessions/${sessionId}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!response.ok) {
          toast({
            variant: 'destructive',
            title: 'Session not found',
            description: 'Could not find the session.'
          });
          navigate('/');
          return;
        }
        const sessionData = await response.json();
        // Block join if session is completed or cancelled
        const status = (sessionData.status || sessionData.session?.status || '').toLowerCase();
        if (['completed', 'cancelled'].includes(status)) {
          toast({
            variant: 'destructive',
            title: 'Session ended',
            description: 'This virtual session has ended and can no longer be joined.'
          });
          navigate('/');
          return;
        }
        setSession(sessionData);
        // Optionally, check if user is host
  const judgeId = sessionData.judgeId || sessionData.judge_id;
  const isCourt = String(user.role || '').toLowerCase() === 'court';
  const userId = String(user.id || user._id || user.userId || user.sub || '');
  const judgeIdNorm = String((judgeId && (judgeId._id || judgeId.id || judgeId)) || '');
  setIsHost(isCourt && userId && judgeIdNorm && (userId === judgeIdNorm));
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load session.'
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId, toast, navigate]);

  if (loading) return <div>Loading...</div>;
  if (!session) return null;

  // Pass the session and isHost to the video conference component
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main-dashboard-section" className="container mx-auto px-0 sm:px-4 py-4">
        <CustomVideoConference session={session} isHost={isHost} />
      </main>
    </div>
  );
};

export default VideoMeeting;
