
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useDocuments = () => {
  const { toast } = useToast();
  const [caseDocuments, setCaseDocuments] = useState<{id: string, name: string, shared: boolean}[]>([]);
  const [sharedDocument, setSharedDocument] = useState<{id: string, name: string} | null>(null);
  
  useEffect(() => {
    // Initialize with mock documents
    setCaseDocuments([
      { id: '1', name: 'Case Brief.pdf', shared: false },
      { id: '2', name: 'Evidence Document A.pdf', shared: false },
      { id: '3', name: 'Witness Statement.pdf', shared: false },
      { id: '4', name: 'Court Order.pdf', shared: false },
    ]);
  }, []);
  
  const shareDocument = (docId: string) => {
    const doc = caseDocuments.find(d => d.id === docId);
    if (doc) {
      setCaseDocuments(caseDocuments.map(d => 
        d.id === docId ? { ...d, shared: true } : d
      ));
      
      setSharedDocument(doc);
      
      toast({
        title: "Document shared",
        description: `${doc.name} is now visible to all participants`,
      });
    }
  };
  
  return {
    caseDocuments,
    sharedDocument,
    setSharedDocument,
    shareDocument,
  };
};
