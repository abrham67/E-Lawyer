import { useEffect, useState } from "react";
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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
    fetchCases();
  }, []);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/documents', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Error fetching documents');
      setDocuments(Array.isArray(data) ? data : (data.documents || data || []));
    } catch (error: any) {
      toast({
        title: "Error fetching documents",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchCases = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cases', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Error fetching cases');
      const list = Array.isArray(data) ? data : (data.cases || []);
      setCases(list.map((c: any) => ({ id: c._id || c.id, title: c.title || c.name || 'Case' })));
    } catch (error: any) {
      toast({
        title: "Error fetching cases",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
        title: "No file selected",
        description: "Please select a file to upload",
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
        title: "Document uploaded",
        description: "Your document has been successfully uploaded",
      });
      
      setUploadFile(null);
      setUploadFileName("");
      setSelectedCase(null);
      
      // Refresh documents
      fetchDocuments();
      
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadDocument = async (document: Document) => {
    try {
      const token = localStorage.getItem('token');
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
        title: "Download started",
        description: `Downloading ${document.file_name}`,
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    // Filter by search term
    const matchesSearch = 
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.case?.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by tab
    const matchesTab = 
      activeTab === "all" ||
      (activeTab === "casefiles" && doc.case_id) ||
      (activeTab === "court" && doc.file_name.toLowerCase().includes("court")) ||
      (activeTab === "evidence" && doc.file_name.toLowerCase().includes("evidence"));
    
    return matchesSearch && matchesTab;
  });

  const recentDocuments = documents.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Document Management</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                All Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{documents.length}</p>
              <p className="text-sm text-gray-500 mt-1">Total documents</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <FolderOpen className="h-5 w-5" />
                Case Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {documents.filter(doc => doc.case_id).length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Documents linked to cases</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {documents.filter(doc => {
                  const docDate = new Date(doc.created_at);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return docDate > weekAgo;
                }).length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Uploaded this week</p>
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
                  placeholder="Search documents..."
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
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="file">Select File</Label>
                    <Input 
                      id="file" 
                      type="file" 
                      onChange={handleFileChange} 
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="case">Link to Case (Optional)</Label>
                    <Select onValueChange={setSelectedCase}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a case" />
                      </SelectTrigger>
                      <SelectContent>
                        {cases.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={uploadDocument} disabled={isUploading}>
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
          
          <Tabs defaultValue="all" onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Documents</TabsTrigger>
              <TabsTrigger value="casefiles">Case Files</TabsTrigger>
              <TabsTrigger value="court">Court Documents</TabsTrigger>
              <TabsTrigger value="evidence">Evidence</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
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
                              Case: {doc.case.title}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" className="flex-1">
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => downloadDocument(doc)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
              const response = await fetch('/api/cases');
              const raw = await response.json();
              const data = raw.cases || raw || [];
                    {searchTerm && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setSearchTerm("")}
                      >
                        Clear Search
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="casefiles">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Similar structure as "all" tab but with case files filter applied */}
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
                              Case: {doc.case.title}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" className="flex-1">
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => downloadDocument(doc)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No case files found</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="court">
              {/* Court documents */}
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
                              Case: {doc.case.title}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" className="flex-1">
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => downloadDocument(doc)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No court documents found</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="evidence">
              {/* Evidence documents */}
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
                              Case: {doc.case.title}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" className="flex-1">
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => downloadDocument(doc)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No evidence documents found</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Recent Documents</h2>
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
                  Download
                </Button>
              </div>
            )) : (
              <p className="text-center py-4 text-gray-500">No recent documents</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Documents;
