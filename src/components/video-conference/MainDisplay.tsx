
import React from 'react';
import { FileText, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MainDisplayProps {
  screenShareEnabled: boolean;
  sharedDocument: { id: string; name: string; } | null;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  onStopSharing: () => void;
}

const MainDisplay: React.FC<MainDisplayProps> = ({
  screenShareEnabled,
  sharedDocument,
  remoteVideoRef,
  onStopSharing
}) => {
  return (
    <div className="flex-1 relative">
      {sharedDocument && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-background text-foreground p-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Sharing: {sharedDocument.name}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onStopSharing}
          >
            Stop sharing
          </Button>
        </div>
      )}
      
      {screenShareEnabled ? (
        <video
          ref={remoteVideoRef}
          className="w-full h-full object-contain bg-black"
          autoPlay
          playsInline
        />
      ) : sharedDocument ? (
        <div className="w-full h-full flex items-center justify-center bg-white p-8">
          <div className="max-w-2xl w-full">
            <div className="bg-gray-100 p-4 rounded-lg flex flex-col items-center">
              <FileText className="h-20 w-20 text-blue-600 mb-4" />
              <h3 className="text-xl font-medium mb-2">{sharedDocument.name}</h3>
              <p className="text-gray-500 text-center mb-4">
                Document preview would appear here in a real implementation
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Download</Button>
                <Button size="sm">View Full Screen</Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-800">
          <div className="text-center text-white">
            <CameraOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No video feed available</p>
            <p className="text-sm text-gray-400">
              Share your screen or a document to begin
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainDisplay;
