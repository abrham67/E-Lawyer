import { useState, useEffect, useCallback } from 'react';
import { CourtSession } from '@/types/database.types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseParticipantsProps {
  session: CourtSession;
}

export const useParticipants = ({ session }: UseParticipantsProps) => {
  const [participants, setParticipants] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [remindersSent, setRemindersSent] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  
  useEffect(() => {
    const setupParticipants = () => {
      const participantsList: string[] = [];
      
      if (session.case?.lawyer?.full_name) {
        participantsList.push(session.case.lawyer.full_name);
      }
      
      if (session.case?.client?.full_name) {
        participantsList.push(session.case.client.full_name);
      }
      
      participantsList.push('Judge Smith');
      participantsList.push('Court Reporter');
      
      if (participantsList.length === 0) {
        participantsList.push('Judge Smith', 'Attorney Johnson');
      }
      
      setParticipants(participantsList);
    };
    
    setupParticipants();
  }, [session.case]);
  
  const toggleRecording = () => {
    setIsRecording(prev => !prev);
  };
  
  // Function to send reminders to participants
  const sendReminders = useCallback(async () => {
    try {
      // Get the current time
      const now = new Date();
      
      // Calculate time remaining until the session
      const sessionTime = new Date(session.scheduled_date);
      const timeRemaining = sessionTime.getTime() - now.getTime();
      
      // If session is in the past, don't send reminders
      if (timeRemaining < 0) return;
      
      // If this is a 24-hour reminder
      const is24HourReminder = timeRemaining <= 24 * 60 * 60 * 1000 && 
                               timeRemaining > 23 * 60 * 60 * 1000;
                               
      // If this is a 1-hour reminder
      const is1HourReminder = timeRemaining <= 60 * 60 * 1000 && 
                              timeRemaining > 55 * 60 * 1000;
      
      // Only proceed if this is a valid reminder time and we haven't sent this reminder yet
      if ((is24HourReminder && !remindersSent['24hour']) || 
          (is1HourReminder && !remindersSent['1hour'])) {
        
        // Determine which participants need reminders
        const recipientIds = [];
        
        if (session.case?.lawyer?.id) {
          recipientIds.push(session.case.lawyer.id);
        }
        
        if (session.case?.client?.id) {
          recipientIds.push(session.case.client.id);
        }
        
        if (recipientIds.length === 0) return;
        
        // Log that we're sending reminders
        console.log(`Sending ${is24HourReminder ? '24-hour' : '1-hour'} reminders to:`, recipientIds);
        
        // In a real implementation, this would call a Supabase function or API to send emails/notifications
        
        // For now, we'll just show a toast notification
        toast({
          title: "Reminders Sent",
          description: `Sent ${is24HourReminder ? '24-hour' : '1-hour'} reminders to ${recipientIds.length} participants`,
        });
        
        // Mark this reminder as sent
        setRemindersSent(prev => ({
          ...prev,
          [is24HourReminder ? '24hour' : '1hour']: true
        }));
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
    }
  }, [session, remindersSent, toast]);
  
  // Check for reminder times periodically
  useEffect(() => {
    const intervalId = setInterval(sendReminders, 60000); // Check every minute
    
    // Run once immediately to catch any immediate reminders
    sendReminders(); 
    
    return () => clearInterval(intervalId);
  }, [sendReminders]);
  
  return {
    participants,
    isRecording,
    toggleRecording,
    sendReminders,
    remindersSent
  };
};
