
import React, { useMemo, useState } from 'react';
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
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// Supabase removed; using backend API
import { Case, Profile } from "@/types/database.types";
import { useAuth } from '@/hooks/useAuth';
import { useApiClient } from '@/hooks/useApiClient';
import { useTranslation } from 'react-i18next';

const CasesList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { authedFetch } = useApiClient();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { user } = useAuth();
  const roleLower = String(user?.role || '').toLowerCase();
  const isLawyer = roleLower === 'lawyer';
  const isCourt = roleLower === 'court';
  const isAdmin = roleLower === 'admin';
  const casesQuery = useQuery<Case[]>({
    queryKey: ['cases', roleLower],
    queryFn: async () => {
      const data = await authedFetch('/api/cases');
      const raw = Array.isArray((data as any)?.cases) ? (data as any).cases : (Array.isArray(data) ? data : []);
      return raw.map((c: any) => ({ id: String(c._id || c.id || ''), ...c }));
    },
    enabled: !!user,
  });
  const casesList = useMemo(() => casesQuery.data ?? [], [casesQuery.data]);
  const isLoadingCases = casesQuery.isLoading || casesQuery.isFetching;
  const casesError = (casesQuery.error as Error) || null;

  // If navigated to My Court Cases, adjust filters to show only created court cases
  const locSearch = new URLSearchParams(location.search);
  const isMyCourtCasesView = locSearch.get('view') === 'my-court-cases';

  const getStatusBadge = (status: "pending" | "active" | "closed" | string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{t('cases.status.pending')}</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t('cases.status.active')}</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">{t('cases.status.closed')}</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{t('cases.status.rejected')}</Badge>;
      default:
        return <Badge variant="outline">{t('cases.status.unknown')}</Badge>;
    }
  };

  const filteredCases = useMemo(() => casesList.filter(caseItem => {
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
    } else if (isLawyer || isAdmin) {
      matchesView = !isCourtCase;
    }
    
    return matchesSearch && matchesStatus && matchesView;
  }), [casesList, searchQuery, statusFilter, isMyCourtCasesView, isLawyer, isAdmin]);

  const handleNewCase = () => {
    navigate('/cases/new');
  };

  const handleViewCase = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ caseId, status }: { caseId: string; status: 'active' | 'rejected' | 'closed' }) =>
      authedFetch(`/api/cases/${encodeURIComponent(caseId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (error: any) => {
      toast({ title: t('cases.update_failed'), description: error?.message || t('cases.update_failed_desc'), variant: 'destructive' });
    }
  });

  const updateCaseStatus = async (caseId: string, status: 'active' | 'rejected' | 'closed') => {
    try {
      await updateStatusMutation.mutateAsync({ caseId, status });
      toast({ title: status === 'active' ? t('cases.case_accepted') : `${t('cases.case')} ${status}` });
      return true;
    } catch {
      return false;
    }
  };

  const handleAcceptCase = async (caseItem: any) => {
    const ok = await updateStatusMutation.mutateAsync({ caseId: caseItem.id, status: 'active' }).then(() => true).catch(() => false);
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
          <h1 className="text-3xl font-bold">{isMyCourtCasesView ? t('cases.my_court_cases') : (isLawyer || isAdmin ? t('cases.client_case') : t('cases.title'))}</h1>
          <Button type="button" onClick={handleNewCase} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>{t('cases.new_case')}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder={t('cases.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('cases.filter_by_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('cases.all_statuses')}</SelectItem>
                <SelectItem value="pending">{t('cases.status.pending')}</SelectItem>
                <SelectItem value="active">{t('cases.status.active')}</SelectItem>
                <SelectItem value="closed">{t('cases.status.closed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {casesError ? (
          <div className="text-sm text-red-600">{casesError.message || t('cases.failed_load')}</div>
        ) : isLoadingCases ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-loading="true">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-2 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-1/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
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
                        {caseItem.case_type || t('cases.no_case_type')}
                      </CardDescription>
                    </div>
                    {getStatusBadge(caseItem.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{caseItem.client?.full_name || t('cases.no_client_assigned')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{caseItem.practice_area || t('cases.no_practice_area')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{t('cases.created_on')} {format(new Date(caseItem.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <Button type="button" variant="outline" onClick={() => handleViewCase(caseItem.id)}>
                      {t('cases.view_details')}
                    </Button>
                    {(isLawyer || isAdmin) && ['pending','requested'].includes(String(caseItem.status||'').toLowerCase()) && (
                      <>
            <Button type="button" className="bg-green-600 hover:bg-green-700" onClick={() => handleAcceptCase(caseItem)}>
                          {t('cases.accept')}
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => updateCaseStatus(caseItem.id, 'rejected')}>
                          {t('cases.decline')}
                        </Button>
                      </>
                    )}
                    {(isLawyer || isAdmin) && caseItem.status === 'active' && (
                      <Button type="button" onClick={() => handleCreateFromCase(caseItem)}>
                        {t('cases.create_court_case')}
                      </Button>
                    )}
                    {(isLawyer || isAdmin) && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={async () => {
                            const ok = await updateCaseStatus(caseItem.id, 'closed');
                            if (ok) toast({ title: t('cases.case_closed') });
                          }}
                        >
                          {t('cases.close')}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={async () => {
                            if (!confirm(t('cases.confirm_delete'))) return;
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
                              toast({ title: t('cases.case_deleted') });
                            } else {
                              const msg = (res as any)._cachedText || (await res.text());
                              toast({ title: t('cases.failed_delete'), description: msg || undefined, variant: 'destructive' });
                            }
                          }}
                        >
                          {t('cases.delete')}
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
            <h3 className="mt-4 text-lg font-medium">{t('cases.no_cases_found')}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || statusFilter !== "all" 
                ? t('cases.adjust_search')
                : t('cases.start_first_case')
              }
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={handleNewCase}
              >
                {t('cases.create_case')}
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default CasesList;
