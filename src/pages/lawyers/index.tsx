import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Mail, Phone, Briefcase, Search, GraduationCap, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Profile } from "@/types/database.types";
import { CasesAPI } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const LawyerDirectory = () => {
  const [lawyers, setLawyers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isClient = user && typeof user.role === 'string' && user.role.toLowerCase().includes('client');
  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<Profile | null>(null);
  const [connectTitle, setConnectTitle] = useState("");
  const [connectDescription, setConnectDescription] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchLawyers = async () => {
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.set('q', searchTerm.trim());
        const response = await fetch(`/api/lawyers${params.toString() ? `?${params.toString()}` : ''}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        const data = await response.json();
        setLawyers(Array.isArray(data) ? data : []);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        toast({ title: "Error", description: error.message || 'Failed to load lawyers', variant: "destructive" });
      }
    };
    fetchLawyers();
    return () => controller.abort();
  }, [toast, searchTerm]);

  const filteredLawyers = lawyers.filter((lawyer) => {
    const term = searchTerm.toLowerCase();
    return (
      lawyer.full_name?.toLowerCase().includes(term) ||
      lawyer.email?.toLowerCase().includes(term) ||
      lawyer.specialization?.toLowerCase().includes(term) ||
      (lawyer as any).bar_number?.toLowerCase?.().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Lawyer Directory</h1>
          <div className="flex w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search lawyers..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                Total Lawyers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{lawyers.length}</p>
              <p className="text-sm text-gray-500 mt-1">Available lawyers</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Scale className="h-5 w-5" />
                Specializations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {new Set(lawyers.map(lawyer => lawyer.specialization).filter(Boolean)).size}
              </p>
              <p className="text-sm text-gray-500 mt-1">Different practice areas</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <GraduationCap className="h-5 w-5" />
                Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {Math.round(lawyers.reduce((acc, lawyer) => acc + (lawyer.years_of_experience || 0), 0) / 
                (lawyers.length || 1))}
              </p>
              <p className="text-sm text-gray-500 mt-1">Avg. years of experience</p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Lawyer List</h2>
          {filteredLawyers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLawyers.map((lawyer) => (
                <div 
                  key={lawyer.id} 
                  className="border rounded-lg p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{lawyer.full_name}</h3>
                      {lawyer.specialization && (
                        <p className="text-sm text-primary font-medium mt-1">
                          {lawyer.specialization}
                        </p>
                      )}
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-600 flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {lawyer.email}
                        </p>
                        {lawyer.contact_number && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                            {lawyer.contact_number}
                          </p>
                        )}
                        {(lawyer as any).bar_number && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <Scale className="h-4 w-4 mr-2 text-gray-400" />
                            Bar No: {(lawyer as any).bar_number}
                          </p>
                        )}
                        {lawyer.years_of_experience && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                            {lawyer.years_of_experience} years of experience
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/messages/${lawyer.id || (lawyer as any)._id}`)}
                    >
                      Message
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/lawyers/${lawyer.id}`)}
                    >
                      View Profile
                    </Button>
          {isClient && (
                      <Button
                        size="sm"
                        className="flex-1"
            onClick={() => { setSelectedLawyer(lawyer); setConnectOpen(true); }}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-gray-50">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No lawyers found matching "{searchTerm}"</p>
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
      </main>
      {/* Connect Dialog */}
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to connect</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Case Title <span className="text-red-600">*</span></label>
              <Input value={connectTitle} onChange={(e) => setConnectTitle(e.target.value)} placeholder="e.g., Contract Dispute" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Case Description <span className="text-red-600">*</span></label>
              <Textarea value={connectDescription} onChange={(e) => setConnectDescription(e.target.value)} placeholder="Briefly describe your case..." className="min-h-[100px]" />
              <p className="text-xs text-gray-500 mt-1">Minimum 10 characters.</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!selectedLawyer) return;
                const title = connectTitle.trim();
                const desc = connectDescription.trim();
                if (title.length < 3 || desc.length < 10) {
                  toast({ title: 'Missing details', description: 'Please enter a title (>=3 chars) and description (>=10 chars).', variant: 'destructive' });
                  return;
                }
                try {
                  setConnecting(true);
                  const token = localStorage.getItem('token');
                  await CasesAPI.connect({ lawyer_id: selectedLawyer.id || (selectedLawyer as any)._id, title, description: desc }, token);
                  toast({ title: 'Connection request sent' });
                  setConnectOpen(false);
                  setConnectTitle("");
                  setConnectDescription("");
                } catch (err: any) {
                  toast({ title: 'Error', description: err.message || 'Failed to connect', variant: 'destructive' });
                } finally {
                  setConnecting(false);
                }
              }}
              disabled={connecting}
            >
              {connecting ? 'Sending...' : 'Send request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LawyerDirectory;
