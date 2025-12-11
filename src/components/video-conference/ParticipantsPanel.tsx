
import React from 'react';
import { MoreVertical, MicOff, Volume2, ShieldCheck, UserX, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ParticipantsPanelProps {
  participants: string[];
  isHost: boolean;
  isRecording: boolean;
  toggleRecording: () => void;
  setActiveTab: (tab: string) => void;
  onForceMute?: (participantId: string) => void;
  onForceUnmute?: (participantId: string) => void;
  onKick?: (participantId: string) => void;
  onMuteAll?: () => void;
  onUnmuteAll?: () => void;
  onEndSession?: () => void;
  onForceVideoOff?: (participantId: string) => void;
  onForceVideoOn?: (participantId: string) => void;
  onStopScreenShare?: (participantId: string) => void;
  onLockRoom?: () => void;
  onUnlockRoom?: () => void;
  onDisableChat?: () => void;
  onEnableChat?: () => void;
  roomLocked?: boolean;
  chatDisabled?: boolean;
}

const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({ 
  participants, 
  isHost, 
  isRecording, 
  toggleRecording, 
  setActiveTab,
  onForceMute,
  onForceUnmute,
  onKick,
  onMuteAll,
  onUnmuteAll,
  onEndSession,
  onForceVideoOff,
  onForceVideoOn,
  onStopScreenShare,
  onLockRoom,
  onUnlockRoom,
  onDisableChat,
  onEnableChat,
  roomLocked,
  chatDisabled,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Participants ({participants.length + 1})</div>
        {isHost && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-3 w-3" /> Court Controls</span>
            <Button variant="outline" size="sm" onClick={onMuteAll} title="Mute all participants"><MicOff className="h-4 w-4 mr-1" />Mute all</Button>
            <Button variant="outline" size="sm" onClick={onUnmuteAll} title="Unmute all participants"><Volume2 className="h-4 w-4 mr-1" />Unmute all</Button>
            {roomLocked ? (
              <Button variant="secondary" size="sm" onClick={onUnlockRoom} title="Unlock meeting">Unlock</Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={onLockRoom} title="Lock meeting">Lock</Button>
            )}
            {chatDisabled ? (
              <Button variant="secondary" size="sm" onClick={onEnableChat} title="Enable chat">Enable chat</Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={onDisableChat} title="Disable chat">Disable chat</Button>
            )}
            {onEndSession && (
              <Button variant="destructive" size="sm" onClick={onEndSession} title="End session for everyone"><Phone className="h-4 w-4 mr-1" />End</Button>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm">
            You
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">You {isHost ? '(Host)' : ''}</div>
            <div className="text-xs text-muted-foreground">Online</div>
          </div>
          {isHost && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={toggleRecording}>
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('documents')}>
                  Share Document
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {participants.map((pid, index) => (
          <div key={pid} className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground text-sm">
              {String(index + 1)}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Participant {index + 1}</div>
              <div className="text-xs text-muted-foreground">Online</div>
            </div>
            {isHost && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Mute" onClick={() => onForceMute?.(pid)}>
                  <MicOff className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Video off" onClick={() => onForceVideoOff?.(pid)}>
                  {/* Using Phone icon fallback; ideally use a video-off icon */}
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Kick" onClick={() => onKick?.(pid)}>
                  <UserX className="h-4 w-4 text-red-600" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="More">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onForceMute?.(pid)}>Mute</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onForceUnmute?.(pid)}>Unmute</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onForceVideoOff?.(pid)}>Video off</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onForceVideoOn?.(pid)}>Video on</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStopScreenShare?.(pid)}>Stop screen share</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => onKick?.(pid)}>Kick</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantsPanel;
