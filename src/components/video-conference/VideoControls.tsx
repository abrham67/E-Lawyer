import React from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Video, VideoOff, Mic, MicOff, Phone, Share2, Camera
} from 'lucide-react';

interface VideoControlsProps {
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenShareEnabled: boolean;
  cameraPosition: string;
  toggleVideo: () => void;
  toggleAudio: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  toggleRecording: () => void;
  isRecording: boolean;
  isHost: boolean;
  endCall: () => void;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  videoEnabled,
  audioEnabled,
  screenShareEnabled,
  cameraPosition,
  toggleVideo,
  toggleAudio,
  toggleCamera,
  toggleScreenShare,
  toggleRecording,
  isRecording,
  isHost,
  endCall
}) => {
  return (
    <div className="bg-background p-4 flex flex-wrap items-center justify-center gap-2 border-t border-zinc-200">
      <Button
        variant="outline"
        size="icon"
        className={!audioEnabled ? "bg-red-500 text-white hover:bg-red-600" : ""}
        onClick={toggleAudio}
        title={audioEnabled ? "Mute microphone" : "Unmute microphone"}
        aria-pressed={!audioEnabled}
      >
        {audioEnabled ? <Mic /> : <MicOff />}
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={!videoEnabled ? "bg-red-500 text-white hover:bg-red-600" : ""}
        onClick={toggleVideo}
        title={videoEnabled ? "Turn off camera" : "Turn on camera"}
        aria-pressed={!videoEnabled}
      >
        {videoEnabled ? <Video /> : <VideoOff />}
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={screenShareEnabled ? "bg-green-500 text-white hover:bg-green-600" : ""}
        onClick={toggleScreenShare}
        title={screenShareEnabled ? "Stop screen sharing" : "Share screen"}
        aria-pressed={screenShareEnabled}
      >
        <Share2 />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={isRecording ? "bg-yellow-500 text-white hover:bg-yellow-600" : ""}
        onClick={toggleRecording}
        title={isRecording ? "Stop recording" : "Start recording"}
        aria-pressed={isRecording}
      >
        <Camera />
      </Button>
      {isHost ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              title="End session for all participants"
            >
              <Phone />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>End session for everyone?</AlertDialogTitle>
              <AlertDialogDescription>
                This will disconnect all participants immediately and mark the session as completed. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={endCall}>End Session</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button
          variant="destructive"
          size="icon"
          onClick={endCall}
          title="Leave meeting"
        >
          <Phone />
        </Button>
      )}
    </div>
  );
};

export default VideoControls;
