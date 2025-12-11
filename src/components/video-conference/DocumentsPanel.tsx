
import React from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Document {
  id: string;
  name: string;
  shared: boolean;
}

interface DocumentsPanelProps {
  documents: Document[];
  noteContent: string;
  onNoteChange: (content: string) => void;
  onSaveNotes: () => void;
  onShareDocument: (docId: string) => void;
  meetingNotes: string;
}

const DocumentsPanel: React.FC<DocumentsPanelProps> = ({
  documents,
  noteContent,
  onNoteChange,
  onSaveNotes,
  onShareDocument,
  meetingNotes
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="font-medium mb-3">Case Documents</div>
      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between p-2 hover:bg-accent rounded-md">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-sm">{doc.name}</span>
            </div>
            <Button 
              variant={doc.shared ? "secondary" : "outline"} 
              size="sm"
              onClick={() => onShareDocument(doc.id)}
            >
              {doc.shared ? "Shared" : "Share"}
            </Button>
          </div>
        ))}
      </div>
      
      <div className="font-medium mt-6 mb-3">Meeting Notes</div>
      <div className="space-y-2">
        <Textarea 
          placeholder="Take notes during the meeting..."
          className="min-h-[120px]"
          value={noteContent || meetingNotes}
          onChange={(e) => onNoteChange(e.target.value)}
        />
        <Button size="sm" onClick={onSaveNotes}>Save Notes</Button>
      </div>
    </div>
  );
};

export default DocumentsPanel;
