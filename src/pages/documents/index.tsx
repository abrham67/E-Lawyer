import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Download, FolderOpen, PlusCircle, Search, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { useTranslation } from "react-i18next";

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  created_at: string;
  case_id?: string;
  case?: {
    title: string;
  };
}

interface Case {
  id: string;
  title: string;
}

const Documents = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { authedFetch, token } = useApiClient();
  const queryClient = useQueryClient();

  const documentsQuery = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: async () => {
      const data = await authedFetch('/api/documents');
      return Array.isArray(data) ? data as Document[] : ((data as any).documents || []);
    }
  });

  const casesQuery = useQuery<Case[]>({
    queryKey: ['cases', 'for-documents'],
    queryFn: async () => {
      const data = await authedFetch('/api/cases');
      const list = Array.isArray(data) ? data : ((data as any).cases || []);
      return list.map((c: any) => ({ id: c._id || c.id, title: c.title || c.name || 'Case' }));
    }
  });

  const documents = useMemo(() => documentsQuery.data ?? [], [documentsQuery.data]);
  const cases = useMemo(() => casesQuery.data ?? [], [casesQuery.data]);
  const loadingDocs = documentsQuery.isLoading || documentsQuery.isFetching;
  const loadingCases = casesQuery.isLoading || casesQuery.isFetching;
  const documentsError = documentsQuery.error as Error | null;
  const casesError = casesQuery.error as Error | null;


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      setUploadFileName(file.name);
    }
  };

  const uploadDocument = async () => {
    if (!uploadFile) {
      toast({
        title: t('documents.no_file_selected'),
        description: t('documents.select_file_upload'),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // First, upload file to storage
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `documents/${fileName}`;
      
      // Placeholder for file upload API call
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: JSON.stringify({
          filePath,
          file: uploadFile,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const uploadData = await uploadResponse.json();
      
      if (!uploadResponse.ok) throw new Error(uploadData.message || 'Error uploading file');
      
      // Then create database entry
      // TODO: Replace with backend API call to create document entry
      const dbResponse = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: uploadFileName,
          file_path: filePath,
          file_type: uploadFile.type,
          file_size: uploadFile.size,
          case_id: selectedCase,
          // TODO: Add user ID from authentication context if needed
        })
      });
      const dbData = await dbResponse.json();
      if (!dbResponse.ok) throw new Error(dbData.message || 'Error saving document');
      
      toast({
        title: t('documents.document_uploaded'),
        description: t('documents.document_uploaded_desc'),
      });
      
      setUploadFile(null);
      setUploadFileName("");
      setSelectedCase(null);
      
      // Refresh documents
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      
    } catch (error: any) {
      toast({
        title: t('documents.upload_failed'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadDocument = async (document: Document) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (!response.ok) throw new Error('Error downloading document');
      const data = await response.blob();
        
      // Create URL for the blob - using window.document
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      
      toast({
        title: t('documents.download_started'),
        description: `${t('documents.downloading')} ${document.file_name}`,
      });
    } catch (error: any) {
      toast({
        title: t('documents.download_failed'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredDocuments = useMemo(() => documents.filter(doc => {
    const matchesSearch = 
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.case?.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = 
      activeTab === "all" ||
      (activeTab === "casefiles" && doc.case_id) ||
      (activeTab === "court" && doc.file_name.toLowerCase().includes("court")) ||
      (activeTab === "evidence" && doc.file_name.toLowerCase().includes("evidence"));
    return matchesSearch && matchesTab;
  }), [documents, searchTerm, activeTab]);

  const recentDocuments = useMemo(() => documents.slice(0, 5), [documents]);
  const loadingSkeleton = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <Card key={idx}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{t('documents.management')}</h1>
        {(documentsError || casesError) && (
          <div className="mb-4 text-sm text-red-600">
            {(documentsError || casesError)?.message || t('documents.failed_load')}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                {t('documents.all_documents')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDocs ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold">{documents.length}</p>}
              <p className="text-sm text-gray-500 mt-1">{t('documents.total_documents')}</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <FolderOpen className="h-5 w-5" />
                {t('documents.case_files')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDocs ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold text-green-600">{documents.filter(doc => doc.case_id).length}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">{t('documents.linked_to_cases')}</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Clock className="h-5 w-5" />
                {t('documents.recent_activity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDocs ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-3xl font-bold">
                  {documents.filter(doc => {
                    const docDate = new Date(doc.created_at);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return docDate > weekAgo;
                  }).length}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">{t('documents.uploaded_this_week')}</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder={t('documents.search_placeholder')}
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('documents.upload_document')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('documents.upload_document')}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="file">{t('documents.select_file')}</Label>
                    <Input 
                      id="file" 
                      type="file" 
                      onChange={handleFileChange} 
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="case">{t('documents.link_to_case_optional')}</Label>
                    <Select onValueChange={setSelectedCase}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('documents.select_case')} />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingCases ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">{t('documents.loading_cases')}</div>
                        ) : cases.length > 0 ? (
                          cases.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.title}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">{t('documents.no_cases_found')}</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={uploadDocument} disabled={isUploading}>
                  {isUploading ? t('documents.uploading') : t('documents.upload')}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
          
          <Tabs defaultValue="all" onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">{t('documents.all_documents')}</TabsTrigger>
              <TabsTrigger value="casefiles">{t('documents.case_files')}</TabsTrigger>
              <TabsTrigger value="court">{t('documents.court_documents')}</TabsTrigger>
              <TabsTrigger value="evidence">{t('documents.evidence')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              {loadingDocs ? (
                loadingSkeleton
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded">
                            <FileText className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{doc.file_name}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                            {doc.case && (
                              <p className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full inline-block mt-1">
                                {t('documents.case_label')}: {doc.case.title}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" className="flex-1">
                            {t('documents.view')}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => downloadDocument(doc)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {t('documents.download')}
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">{t('documents.no_documents_found')}</p>
                      {searchTerm && (
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => setSearchTerm("")}
                        >
                          {t('documents.clear_search')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="casefiles">
              {loadingDocs ? loadingSkeleton : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded">
                            <FileText className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{doc.file_name}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                            {doc.case && (
                              <p className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full inline-block mt-1">
                                {t('documents.case_label')}: {doc.case.title}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" className="flex-1">
                            {t('documents.view')}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => downloadDocument(doc)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {t('documents.download')}
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">{t('documents.no_case_files_found')}</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="court">
              {/* Court documents */}
              {loadingDocs ? loadingSkeleton : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded">
                            <FileText className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{doc.file_name}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                            {doc.case && (
                              <p className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full inline-block mt-1">
                                {t('documents.case_label')}: {doc.case.title}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" className="flex-1">
                            {t('documents.view')}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => downloadDocument(doc)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {t('documents.download')}
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">{t('documents.no_court_documents_found')}</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="evidence">
              {/* Evidence documents */}
              {loadingDocs ? loadingSkeleton : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded">
                            <FileText className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{doc.file_name}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                            {doc.case && (
                              <p className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full inline-block mt-1">
                                {t('documents.case_label')}: {doc.case.title}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" className="flex-1">
                            {t('documents.view')}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => downloadDocument(doc)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {t('documents.download')}
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">{t('documents.no_evidence_documents_found')}</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">{t('documents.recent_documents')}</h2>
          <div className="divide-y">
            {recentDocuments.length > 0 ? recentDocuments.map((doc) => (
              <div key={doc.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{doc.file_name}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                      {doc.case && ` • ${doc.case.title}`}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => downloadDocument(doc)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  {t('documents.download')}
                </Button>
              </div>
            )) : (
              <p className="text-center py-4 text-gray-500">{t('documents.no_recent_documents')}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Documents;
