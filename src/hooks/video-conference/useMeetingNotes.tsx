
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CourtSession } from '@/types/database.types';

interface UseMeetingNotesProps {
  session: CourtSession;
}

export const useMeetingNotes = ({ session }: UseMeetingNotesProps) => {
  const { toast } = useToast();
  const [noteContent, setNoteContent] = useState('');
  const [meetingStatus, setMeetingStatus] = useState(session.status || 'scheduled');
  const [meetingNotes, setMeetingNotes] = useState(session.notes || '');
  
  const saveNotes = async () => {
    try {
      await supabase
        .from('court_sessions')
        .update({ notes: noteContent })
        .eq('id', session.id);
      
      toast({
        title: "Notes saved",
        description: "Your meeting notes have been saved",
      });
      
      setMeetingNotes(noteContent);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        variant: "destructive",
        title: "Failed to save notes",
        description: "There was an error saving your notes",
      });
    }
  };
  
  return {
    noteContent,
    setNoteContent,
    meetingStatus,
    setMeetingStatus,
    meetingNotes,
    saveNotes,
  };
};
