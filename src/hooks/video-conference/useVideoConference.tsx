
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CourtSession } from '@/types/database.types';

import { useVideoSetup } from './useVideoSetup';
import { useParticipants } from './useParticipants';
import { useMessaging } from './useMessaging';
import { useDocuments } from './useDocuments';
import { useMeetingNotes } from './useMeetingNotes';

interface UseVideoConferenceProps {
  session: CourtSession;
  isHost: boolean;
}

export const useVideoConference = ({ session, isHost }: UseVideoConferenceProps) => {
  const navigate = useNavigate();
  
  // Composition of specialized hooks
  const video = useVideoSetup({ session, isHost });
  const { participants, isRecording, toggleRecording } = useParticipants({ session });
  const { messages, activeTab, setActiveTab, sendMessage, addSystemMessage } = useMessaging();
  const { caseDocuments, sharedDocument, setSharedDocument, shareDocument } = useDocuments();
  const { noteContent, setNoteContent, meetingStatus, meetingNotes, saveNotes } = useMeetingNotes({ session });
  
  // Recording-related functionality
  const handleToggleRecording = () => {
    toggleRecording();
    
    if (!isRecording) {
      addSystemMessage('Recording has started. All participants have been notified.');
    } else {
      addSystemMessage('Recording has stopped.');
    }
  };
  
  // End call functionality
  const endCall = async () => {
    if (video.localVideoRef.current && video.localVideoRef.current.srcObject) {
      const stream = video.localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    if (video.screenShareEnabled && video.remoteVideoRef.current && video.remoteVideoRef.current.srcObject) {
      const stream = video.remoteVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    if (isHost) {
      try {
        await supabase
          .from('court_sessions')
          .update({ 
            status: 'completed',
            notes: meetingNotes || noteContent
          })
          .eq('id', session.id);
      } catch (error) {
        console.error('Error updating session status:', error);
      }
    }
    
    navigate(-1);
  };

  return {
    // Video setup
    videoEnabled: video.videoEnabled,
    audioEnabled: video.audioEnabled,
    cameraPosition: video.cameraPosition,
    screenShareEnabled: video.screenShareEnabled,
    localVideoRef: video.localVideoRef,
    remoteVideoRef: video.remoteVideoRef,
    toggleVideo: video.toggleVideo,
    toggleAudio: video.toggleAudio,
    toggleCamera: video.toggleCamera,
    toggleScreenShare: video.toggleScreenShare,
    
    // Participants
    participants,
    isRecording,
    toggleRecording: handleToggleRecording,
    
    // Messaging
    messages,
    activeTab,
    setActiveTab,
    sendMessage,
    
    // Documents
    caseDocuments,
    sharedDocument,
    setSharedDocument,
    shareDocument,
    
    // Meeting notes
    noteContent, 
    setNoteContent,
    meetingStatus,
    meetingNotes,
    saveNotes,
    
    // End call
    endCall
  };
};
