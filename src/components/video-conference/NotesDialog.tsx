
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface NotesDialogProps {
  noteContent: string;
  meetingNotes: string;
  onNoteChange: (content: string) => void;
  onSaveNotes: () => void;
}

const NotesDialog: React.FC<NotesDialogProps> = ({
  noteContent,
  meetingNotes,
  onNoteChange,
  onSaveNotes
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Notes
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meeting Notes</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea 
            placeholder="Take notes during the meeting..."
            className="min-h-[200px]"
            value={noteContent || meetingNotes}
            onChange={(e) => onNoteChange(e.target.value)}
          />
        </div>
        <Button onClick={onSaveNotes}>Save Notes</Button>
      </DialogContent>
    </Dialog>
  );
};

export default NotesDialog;
