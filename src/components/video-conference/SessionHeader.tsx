
import React from 'react';
import { CourtSession } from '@/types/database.types';
import { Badge } from '@/components/ui/badge';
import { Video } from 'lucide-react';

interface SessionHeaderProps {
  session: CourtSession;
  meetingStatus: string;
  isRecording: boolean;
  participantsCount: number;
}

const SessionHeader: React.FC<SessionHeaderProps> = ({
  session,
  meetingStatus,
  isRecording,
  participantsCount
}) => {
  // Format the meeting status for display
  const formatMeetingStatus = (status?: string): string => {
    if (!status || typeof status !== 'string') return 'Unknown';
    return status.replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Determine status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'connecting':
        return 'bg-yellow-500';
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-red-500';
      case 'reconnecting':
        return 'bg-orange-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="bg-background px-4 py-2 flex items-center justify-between border-b">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{session.case?.title || 'Court Session'}</h3>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Video className="h-3 w-3" />
            <span>Virtual Session</span>
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground flex items-center">
          <span>{session?.scheduled_date ? new Date(session.scheduled_date as any).toLocaleString() : 'Scheduled'}</span>
          <span className="mx-1">•</span>
          <Badge 
            variant="outline" 
            className={`${getStatusColor(meetingStatus || 'scheduled')} text-white border-0`}
          >
            {formatMeetingStatus(meetingStatus)}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {isRecording && (
          <span className="flex items-center text-sm text-red-500">
            <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse mr-1"></span>
            Recording
          </span>
        )}
        <span className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded-md">
          {participantsCount} {participantsCount === 1 ? 'participant' : 'participants'}
        </span>
      </div>
    </div>
  );
};

export default SessionHeader;
