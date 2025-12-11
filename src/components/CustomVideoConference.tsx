import React from 'react';
import { CourtSession } from '@/types/database.types';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { FileText, MessageSquare, Users } from 'lucide-react';
import { useVideoConference } from './video-conference/useVideoConference';
import SessionHeader from './video-conference/SessionHeader';
import MainDisplay from './video-conference/MainDisplay';
import VideoGrid from './video-conference/VideoGrid';
import VideoControls from './video-conference/VideoControls';
import ParticipantsPanel from './video-conference/ParticipantsPanel';
import ChatPanel from './video-conference/ChatPanel';
import DocumentsPanel from './video-conference/DocumentsPanel';
import NotesDialog from './video-conference/NotesDialog';

interface CustomVideoConferenceProps {
  session: any; // Accepts backend session object
  isHost: boolean;
}

const CustomVideoConference: React.FC<CustomVideoConferenceProps> = ({ session, isHost }) => {
  // Extract roomId from virtual_meeting_link
  const roomId = session.virtual_meeting_link?.split('/').pop();
  // Pass roomId to useVideoConference
  const {
    videoEnabled,
    audioEnabled,
    participants,
    messages,
    messageInput,
    setMessageInput,
    sendMessage,
    activeTab,
    setActiveTab,
    isRecording,
    caseDocuments,
    sharedDocument,
    setSharedDocument,
    noteContent,
    setNoteContent,
    localVideoRef,
    remoteVideoRefs,
  screenShareEnabled,
  cameraPosition,
    meetingStatus,
    meetingNotes,
    toggleVideo,
    toggleAudio,
    toggleCamera,
  toggleScreenShare,
  toggleRecording,
  shareDocument,
    saveNotes,
  endCall,
  forceMuteParticipant,
  forceUnmuteParticipant,
  kickParticipant,
  forceVideoOff,
  forceVideoOn,
  stopScreenShare,
  lockRoom,
  unlockRoom,
  disableChat,
  enableChat,
  roomLocked,
  chatDisabled,
    
  } = useVideoConference({ roomId, isHost });

  return (
    <Card className="w-full h-full flex flex-col">
      <SessionHeader 
        session={session}
        meetingStatus={meetingStatus as any}
        isRecording={isRecording}
        participantsCount={Array.isArray(participants) ? participants.length : (participants ? Object.keys(participants).length : 0)}
      />
      <MainDisplay
        screenShareEnabled={screenShareEnabled}
        sharedDocument={sharedDocument}
        remoteVideoRef={remoteVideoRefs[Object.keys(remoteVideoRefs)[0]] || localVideoRef}
        onStopSharing={toggleScreenShare}
      />
  <VideoGrid
        localVideoRef={localVideoRef}
        remoteVideoRefs={remoteVideoRefs}
        participants={participants}
        isHost={isHost}
      />
      <VideoControls
        videoEnabled={videoEnabled}
        audioEnabled={audioEnabled}
        screenShareEnabled={screenShareEnabled}
        cameraPosition={cameraPosition}
        toggleVideo={toggleVideo}
        toggleAudio={toggleAudio}
        toggleCamera={toggleCamera}
        toggleScreenShare={toggleScreenShare}
        toggleRecording={toggleRecording}
        isRecording={isRecording}
        isHost={isHost}
        endCall={endCall}
      />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList>
          <TabsTrigger value="participants"><Users className="w-4 h-4" /> Participants</TabsTrigger>
          <TabsTrigger value="chat"><MessageSquare className="w-4 h-4" /> Chat</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="w-4 h-4" /> Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="participants">
          <ParticipantsPanel 
            participants={participants} 
            isHost={isHost}
            isRecording={isRecording}
            toggleRecording={toggleRecording}
            setActiveTab={setActiveTab}
              onForceMute={forceMuteParticipant}
              onForceUnmute={forceUnmuteParticipant}
              onKick={kickParticipant}
              onForceVideoOff={forceVideoOff}
              onForceVideoOn={forceVideoOn}
              onStopScreenShare={stopScreenShare}
              onMuteAll={() => {
                if (!Array.isArray(participants)) return;
                participants.forEach(pid => forceMuteParticipant(pid));
              }}
              onUnmuteAll={() => {
                if (!Array.isArray(participants)) return;
                participants.forEach(pid => forceUnmuteParticipant(pid));
              }}
              onEndSession={isHost ? endCall : undefined}
              onLockRoom={lockRoom}
              onUnlockRoom={unlockRoom}
              onDisableChat={disableChat}
              onEnableChat={enableChat}
              roomLocked={roomLocked}
              chatDisabled={chatDisabled}
          />
        </TabsContent>
        <TabsContent value="chat">
          <ChatPanel
            messages={messages}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            sendMessage={sendMessage}
          />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsPanel
            documents={caseDocuments}
            noteContent={noteContent}
            onNoteChange={setNoteContent}
            onSaveNotes={saveNotes}
            onShareDocument={(docId: string) => {
              // If hook exposes shareDocument, prefer that; otherwise setSharedDocument by id lookup
              try { (shareDocument as any)(docId); } catch {
                const doc = (caseDocuments || []).find(d => d.id === docId);
                if (doc) setSharedDocument(doc);
              }
            }}
            meetingNotes={meetingNotes}
          />
        </TabsContent>
      </Tabs>
      <NotesDialog
        noteContent={noteContent}
        meetingNotes={meetingNotes}
        onNoteChange={setNoteContent}
        onSaveNotes={saveNotes}
      />
    </Card>
  );
};

export default CustomVideoConference;
