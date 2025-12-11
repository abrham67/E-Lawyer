
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CourtSession } from '@/types/database.types';

interface UseVideoSetupProps {
  session: CourtSession;
  isHost: boolean;
}

export const useVideoSetup = ({ session, isHost }: UseVideoSetupProps) => {
  const { toast } = useToast();
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [cameraPosition, setCameraPosition] = useState('front');
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    const setupLocalVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: videoEnabled, 
          audio: audioEnabled 
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        toast({
          title: "Connected to meeting",
          description: "You have joined the virtual court session",
        });
        
        if (isHost && session.status === 'scheduled') {
          await supabase
            .from('court_sessions')
            .update({ status: 'in_progress' })
            .eq('id', session.id);
        }
        
      } catch (error) {
        console.error('Error accessing media devices:', error);
        toast({
          variant: "destructive",
          title: "Camera access error",
          description: "Could not access your camera or microphone",
        });
      }
    };
    
    setupLocalVideo();
    
    return () => {
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isHost, session.id, toast, videoEnabled, audioEnabled, session.status]);
  
  const toggleVideo = () => {
    setVideoEnabled(prev => !prev);
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
    }
  };
  
  const toggleAudio = () => {
    setAudioEnabled(prev => !prev);
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled;
      });
    }
  };
  
  const toggleCamera = () => {
    setCameraPosition(prev => prev === 'front' ? 'back' : 'front');
    toast({
      title: `Switched to ${cameraPosition === 'front' ? 'back' : 'front'} camera`,
      description: "Camera view has been changed",
    });
  };
  
  const toggleScreenShare = async () => {
    try {
      if (!screenShareEnabled) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          setScreenShareEnabled(true);
          
          stream.getVideoTracks()[0].onended = () => {
            setScreenShareEnabled(false);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
          };
        }
      } else {
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
          const stream = remoteVideoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          remoteVideoRef.current.srcObject = null;
          setScreenShareEnabled(false);
        }
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
      toast({
        variant: "destructive",
        title: "Screen sharing error",
        description: "Failed to share your screen",
      });
    }
  };

  return {
    videoEnabled,
    audioEnabled,
    cameraPosition,
    screenShareEnabled,
    localVideoRef,
    remoteVideoRef,
    toggleVideo,
    toggleAudio,
    toggleCamera,
    toggleScreenShare,
  };
};
