import React from 'react';

interface Participant {
  name: string;
  isHost?: boolean;
}

interface VideoGridProps {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRefs: { [id: string]: React.RefObject<HTMLVideoElement> };
  participants: string[];
  isHost: boolean;
}

const VideoGrid: React.FC<VideoGridProps> = ({ localVideoRef, remoteVideoRefs, participants, isHost }) => {
  const remoteIds = Object.keys(remoteVideoRefs);
  return (
    <div className="w-full flex flex-wrap gap-4 p-4 bg-zinc-900 rounded-lg justify-center items-center min-h-[180px]">
      <div className="relative aspect-video w-48 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
        <video
          ref={localVideoRef}
          className="w-full h-full object-cover rounded"
          autoPlay
          playsInline
          muted
        />
        <div className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded">
          You {isHost ? '(Host)' : ''}
        </div>
      </div>
      {remoteIds.length === 0 && (
        <div className="text-zinc-400 text-sm">Waiting for other participants to join...</div>
      )}
      {remoteIds.map((id, idx) => (
        <div key={id} className="relative aspect-video w-48 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
          <video
            ref={remoteVideoRefs[id]}
            className="w-full h-full object-cover rounded"
            autoPlay
            playsInline
          />
          <div className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded">
            Participant {idx + 1}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VideoGrid;
