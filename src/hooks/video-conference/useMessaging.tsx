
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types/database.types';

export const useMessaging = () => {
  const [messages, setMessages] = useState<{sender: string, content: string, timestamp?: Date}[]>([]);
  const [activeTab, setActiveTab] = useState('participants');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { toast } = useToast();
  
  useEffect(() => {
    // Initialize with system messages
    setMessages([
      { sender: 'System', content: 'Welcome to the court session.', timestamp: new Date() },
      { sender: 'System', content: 'Please ensure all parties are present before we begin.', timestamp: new Date() },
      { sender: 'Judge Smith', content: 'This court is now in session. We will begin shortly.', timestamp: new Date() }
    ]);
  }, []);
  
  const sendMessage = (message: string) => {
    if (message.trim()) {
      const newMessage = { 
        sender: 'You', 
        content: message.trim(),
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Here we would typically also send the message to a backend
      // (Supabase in this case) to persist it and broadcast to other users
    }
  };
  
  const addSystemMessage = (content: string) => {
    const systemMessage = { 
      sender: 'System', 
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, systemMessage]);
  };
  
  // Function to send direct messages to specific users
  const sendDirectMessage = async (recipientId: string, content: string, senderProfile: Profile) => {
    try {
      if (!content.trim()) return;
      
      // Insert message into database
      const { error } = await supabase.from('meeting_messages').insert({
        content,
        sender_id: senderProfile.id,
        meeting_id: 'direct', // Using 'direct' as a placeholder for direct messages
        type: 'direct'
      });
      
      if (error) throw error;
      
      toast({
        title: "Message sent",
        description: `Message sent to ${recipientId}`
      });
      
    } catch (error: any) {
      console.error('Error sending direct message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };
  
  // When switching to the messages tab, reset unread count
  useEffect(() => {
    if (activeTab === 'messages') {
      setUnreadMessages(0);
    }
  }, [activeTab]);
  
  return {
    messages,
    activeTab,
    setActiveTab,
    sendMessage,
    addSystemMessage,
    sendDirectMessage,
    unreadMessages,
    setUnreadMessages
  };
};
