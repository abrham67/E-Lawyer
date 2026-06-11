import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Supabase removed; using backend API
import { CourtSession } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import CustomVideoConference from '@/components/CustomVideoConference';
import Navbar from '@/components/Navbar';
import { useTranslation } from 'react-i18next';

const VideoMeeting = () => {
  const { sessionId, roomId } = useParams();
  const meetingId = sessionId || roomId;
  const [session, setSession] = useState<CourtSession | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchSession = async () => {
      if (!meetingId) {
        toast({
          variant: 'destructive',
          title: t('video_meeting.missing_link'),
          description: t('video_meeting.invalid_link'),
        });
        navigate('/');
        return;
      }
      try {
  // Get the current user
  const token = localStorage.getItem('token');
  const sessionRes = await fetch('/api/auth/me', { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!sessionRes.ok) {
          toast({
            variant: 'destructive',
            title: t('video_meeting.auth_required'),
            description: t('video_meeting.must_login'),
          });
          navigate('/auth');
          return;
        }
  const sessionDataUser = await sessionRes.json();
  const user = sessionDataUser.user || sessionDataUser;
        if (!user) {
          toast({
            variant: 'destructive',
            title: t('video_meeting.auth_required'),
            description: t('video_meeting.must_login'),
          });
          navigate('/auth');
          return;
        }
    // Fetch the session from backend API
  const response = await fetch(`/api/courtsessions/${meetingId}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!response.ok) {
          toast({
            variant: 'destructive',
            title: t('video_meeting.session_not_found'),
            description: t('video_meeting.could_not_find')
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
            title: t('video_meeting.session_ended'),
            description: t('video_meeting.ended_desc')
          });
          navigate('/');
          return;
        }
        setSession(sessionData);
        // Optionally, check if user is host
  const judgeId = sessionData.judgeId || sessionData.judge_id;
  const role = String(user.role || '').toLowerCase();
  const isCourt = role === 'court';
  const isAdmin = role === 'admin';
  const userId = String(user.id || user._id || user.userId || user.sub || '');
  const judgeIdNorm = String((judgeId && (judgeId._id || judgeId.id || judgeId)) || '');
  setIsHost((isCourt || isAdmin) && userId && judgeIdNorm && (userId === judgeIdNorm));
      } catch (error) {
        toast({
          variant: 'destructive',
          title: t('video_meeting.error'),
          description: t('video_meeting.failed_load')
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [meetingId, toast, navigate, t]);

  if (loading) return <div>{t('video_meeting.loading')}</div>;
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
