
import React, { useState, useEffect } from 'react';
import { Briefcase, Search, Plus, FileText, User, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
// Supabase removed; using backend API
import { Case, Profile } from "@/types/database.types";
import { useAuth } from '@/hooks/useAuth';

const CasesList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { user } = useAuth();
  const roleLower = String(user?.role || '').toLowerCase();
  const isLawyer = roleLower === 'lawyer';
  const isCourt = roleLower === 'court';

  const fetchCases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cases', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Failed to fetch cases');
      const data = await response.json();
  // Backend returns { cases: [...] }; normalize and ensure id exists
  const raw = Array.isArray(data?.cases) ? data.cases : (Array.isArray(data) ? data : []);
  const normalized = raw.map((c: any) => ({ id: String(c._id || c.id || ''), ...c }));
  setCases(normalized);
    } catch (error) {
      console.error('Error fetching cases:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load cases',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [navigate, toast]);

  // If navigated to My Court Cases, adjust filters to show only created court cases
  const locSearch = new URLSearchParams(location.search);
  const isMyCourtCasesView = locSearch.get('view') === 'my-court-cases';

  const getStatusBadge = (status: "pending" | "active" | "closed" | string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Closed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const filteredCases = cases.filter(caseItem => {
    const matchesSearch = caseItem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (caseItem.case_type?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (caseItem.practice_area?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === "all" || caseItem.status === statusFilter;
    // A case is a court case if it has a court id set
  const isCourtCase = Boolean((caseItem as any).courtId || (caseItem as any).court_id);
    // View filter rules:
    // - My Court Cases: only show court cases
    // - Lawyer default (Client Case): only show non-court cases (created by clients)
    let matchesView = true;
    if (isMyCourtCasesView) {
      matchesView = isCourtCase;
    } else if (isLawyer) {
      matchesView = !isCourtCase;
    }
    
    return matchesSearch && matchesStatus && matchesView;
  });

  const handleNewCase = () => {
    navigate('/cases/new');
  };

  const handleViewCase = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  const updateCaseStatus = async (caseId: string, status: 'active' | 'rejected' | 'closed') => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Request failed');
      }
      const updated = await res.json();
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, status: updated.status } as any : c));
      toast({ title: `Case ${status === 'active' ? 'accepted' : 'rejected'}` });
      return true;
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message || 'Unable to update case status', variant: 'destructive' });
      return false;
    }
  };

  const handleAcceptCase = async (caseItem: any) => {
    const ok = await updateCaseStatus(caseItem.id, 'active');
    if (!ok) return;
    // Determine client id from various shapes
    const clientId = caseItem?.client?.id || caseItem?.client?._id || caseItem?.clientId || caseItem?.client_id;
    // Prefill title/description from the accepted case
    const title = caseItem?.title || '';
    const description = caseItem?.description || '';
    const params = new URLSearchParams();
    if (clientId) params.set('client', String(clientId));
    params.set('fromCase', String(caseItem.id));
    if (title) params.set('title', title);
    if (description) params.set('description', description);
    navigate(`/cases/new?${params.toString()}`);
  };

  const handleCreateFromCase = (caseItem: any) => {
    // Build params to prefill the Create Court Case form
    const clientId = caseItem?.client?.id || caseItem?.client?._id || caseItem?.clientId || caseItem?.client_id;
    const title = caseItem?.title || '';
    const description = caseItem?.description || '';
    const params = new URLSearchParams();
    if (clientId) params.set('client', String(clientId));
    params.set('fromCase', String(caseItem.id));
    if (title) params.set('title', title);
    if (description) params.set('description', description);
    navigate(`/cases/new?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold">{isMyCourtCasesView ? 'My Court Cases' : (isLawyer ? 'Client Case' : 'Cases')}</h1>
          <Button type="button" onClick={handleNewCase} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>New Case</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredCases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCases.map((caseItem) => (
              <Card 
                key={caseItem.id} 
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{caseItem.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {caseItem.case_type || 'No case type'}
                      </CardDescription>
                    </div>
                    {getStatusBadge(caseItem.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{caseItem.client?.full_name || 'No client assigned'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{caseItem.practice_area || 'No practice area'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Created {format(new Date(caseItem.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <Button type="button" variant="outline" onClick={() => handleViewCase(caseItem.id)}>
                      View Details
                    </Button>
                    {isLawyer && ['pending','requested'].includes(String(caseItem.status||'').toLowerCase()) && (
                      <>
            <Button type="button" className="bg-green-600 hover:bg-green-700" onClick={() => handleAcceptCase(caseItem)}>
                          Accept
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => updateCaseStatus(caseItem.id, 'rejected')}>
                          Decline
                        </Button>
                      </>
                    )}
                    {isLawyer && caseItem.status === 'active' && (
                      <Button type="button" onClick={() => handleCreateFromCase(caseItem)}>
                        Create Court Case
                      </Button>
                    )}
                    {isLawyer && !((caseItem as any).courtId || (caseItem as any).court_id) && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={async () => {
                            const ok = await updateCaseStatus(caseItem.id, 'closed');
                            if (ok) toast({ title: 'Case closed' });
                          }}
                        >
                          Close
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={async () => {
                            if (!confirm('Delete this case permanently?')) return;
                            const token = localStorage.getItem('token');
                            // Try DELETE first
                            let res = await fetch(`/api/cases/${encodeURIComponent(caseItem.id)}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } as any });
                            // If DELETE is blocked (e.g., proxy returns 404/405 or HTML error), retry POST fallback
                            if (!res.ok) {
                              const txt = await res.text().catch(() => '');
                              if (res.status === 404 || res.status === 405 || /Cannot\s+DELETE/i.test(txt)) {
                                res = await fetch(`/api/cases/${encodeURIComponent(caseItem.id)}/delete`, { method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } as any });
                              } else {
                                (res as any)._cachedText = txt;
                              }
                            }
                            if (res.ok) {
                              setCases(prev => prev.filter(c => c.id !== caseItem.id));
                              toast({ title: 'Case deleted' });
                            } else {
                              const msg = (res as any)._cachedText || (await res.text());
                              toast({ title: 'Failed to delete case', description: msg || undefined, variant: 'destructive' });
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-medium">No cases found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your search or filters" 
                : "Start by creating your first case"
              }
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={handleNewCase}
              >
                Create a Case
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default CasesList;
