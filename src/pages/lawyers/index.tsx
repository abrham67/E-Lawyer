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
import { useTranslation } from 'react-i18next';

const LawyerDirectory = () => {
  const [lawyers, setLawyers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isClient = user && typeof user.role === 'string' && user.role.toLowerCase().includes('client');
  const isAdmin = user && typeof user.role === 'string' && user.role.toLowerCase() === 'admin';
  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<Profile | null>(null);
  const [connectTitle, setConnectTitle] = useState("");
  const [connectDescription, setConnectDescription] = useState("");
  const [connecting, setConnecting] = useState(false);
  const { t } = useTranslation();

  // IDs of lawyers already connected to the authenticated client
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  // Per-lawyer connection status map: id -> 'none'|'pending'|'active'
  const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isClient) return;
    const controller = new AbortController();
    const loadConnected = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/cases/me/lawyers', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const ids = data.map((l: any) => l.id || l._id || (l._id && String(l._id))).filter(Boolean);

    // Fetch connection status for each listed lawyer (clients see their status per lawyer)
    useEffect(() => {
      if (!isClient || lawyers.length === 0) return;
      const controller = new AbortController();
      const token = localStorage.getItem('token');
      const fetchStatuses = async () => {
        try {
          const ids = lawyers.map(l => l.id || (l as any)._id).filter(Boolean).map(String);
          // limit requests by mapping to promises; backend supports single-lawyer status checks
          const promises = ids.map((lid) => fetch(`/api/cases/connection-status?lawyer_id=${encodeURIComponent(lid)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            signal: controller.signal
          }).then(async (res) => {
            if (!res.ok) return { id: lid, status: 'none' };
            try { const j = await res.json(); return { id: lid, status: (j && j.status) ? j.status : 'none' }; } catch { return { id: lid, status: 'none' }; }
          }).catch(() => ({ id: lid, status: 'none' })));
          const results = await Promise.all(promises);
          const map: Record<string, string> = {};
          results.forEach(r => { if (r && r.id) map[String(r.id)] = r.status || 'none'; });
          setConnectionStatus(map);
          // also derive connectedIds for quick badge usage
          const active = results.filter(r => r.status === 'active').map(r => r.id);
          setConnectedIds(active.map(String));
        } catch (e) {
          // ignore
        }
      };
      fetchStatuses();
      return () => controller.abort();
    }, [isClient, lawyers]);
        setConnectedIds(ids.map(String));
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    };
    loadConnected();
    return () => controller.abort();
  }, [isClient]);

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
        toast({ title: t('lawyers_directory.error'), description: error.message || t('lawyers_directory.failed_load'), variant: "destructive" });
      }
    };
    fetchLawyers();
    return () => controller.abort();
  }, [toast, searchTerm, t]);

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
          <h1 className="text-2xl font-bold">{t('lawyers_directory.title')}</h1>
          <div className="flex w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder={t('lawyers_directory.search_placeholder')}
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
                {t('lawyers_directory.total_lawyers')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{lawyers.length}</p>
              <p className="text-sm text-gray-500 mt-1">{t('lawyers_directory.available_lawyers')}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Scale className="h-5 w-5" />
                {t('lawyers_directory.specializations')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {new Set(lawyers.map(lawyer => lawyer.specialization).filter(Boolean)).size}
              </p>
              <p className="text-sm text-gray-500 mt-1">{t('lawyers_directory.different_practice_areas')}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <GraduationCap className="h-5 w-5" />
                {t('lawyers_directory.experience')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {Math.round(lawyers.reduce((acc, lawyer) => acc + (lawyer.years_of_experience || 0), 0) / 
                (lawyers.length || 1))}
              </p>
              <p className="text-sm text-gray-500 mt-1">{t('lawyers_directory.avg_years_experience')}</p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">{t('lawyers_directory.list_title')}</h2>
          {filteredLawyers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLawyers.map((lawyer) => (
                <div 
                  key={lawyer.id} 
                  className="border rounded-lg p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">
                        {lawyer.full_name}
                        {((connectedIds || []).includes(String(lawyer.id || (lawyer as any)._id))) && (
                          <span className="ml-2 inline-block text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                            {t('lawyers_directory.connected')}
                          </span>
                        )}
                      </h3>
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
                            {t('lawyers_directory.bar_no')}: {(lawyer as any).bar_number}
                          </p>
                        )}
                        {lawyer.years_of_experience && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                            {t('lawyers_directory.years_experience', { count: lawyer.years_of_experience })}
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
                      {t('lawyers_directory.message')}
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/lawyers/${lawyer.id}`)}
                    >
                      {t('lawyers_directory.view_profile')}
                    </Button>
          {(isClient || isAdmin) && (() => {
                      const lid = String(lawyer.id || (lawyer as any)._id || '');
                      const status = connectionStatus[lid] || 'none';
                      const disabled = status !== 'none';
                      const label = status === 'active' ? t('lawyers_directory.connected') : (status === 'pending' ? t('lawyers_directory.request_pending') : t('lawyers_directory.connect'));
                      return (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => { setSelectedLawyer(lawyer); setConnectOpen(true); }}
                          disabled={disabled && !isAdmin}
                        >
                          {isAdmin ? t('lawyers_directory.connect') : label}
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-gray-50">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">{t('lawyers_directory.no_match', { searchTerm })}</p>
              {searchTerm && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setSearchTerm("")}
                >
                  {t('lawyers_directory.clear_search')}
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
            <DialogTitle>{t('lawyers_directory.request_to_connect')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t('lawyers_directory.case_title')} <span className="text-red-600">*</span></label>
              <Input value={connectTitle} onChange={(e) => setConnectTitle(e.target.value)} placeholder={t('lawyers_directory.case_title_placeholder')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('lawyers_directory.case_description')} <span className="text-red-600">*</span></label>
              <Textarea value={connectDescription} onChange={(e) => setConnectDescription(e.target.value)} placeholder={t('lawyers_directory.case_description_placeholder')} className="min-h-[100px]" />
              <p className="text-xs text-gray-500 mt-1">{t('lawyers_directory.minimum_10')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!selectedLawyer) return;
                const title = connectTitle.trim();
                const desc = connectDescription.trim();
                if (title.length < 3 || desc.length < 10) {
                  toast({ title: t('lawyers_directory.missing_details'), description: t('lawyers_directory.missing_details_desc'), variant: 'destructive' });
                  return;
                }
                try {
                  setConnecting(true);
                  const token = localStorage.getItem('token');
                  await CasesAPI.connect({ lawyer_id: selectedLawyer.id || (selectedLawyer as any)._id, title, description: desc }, token);
                  toast({ title: t('lawyers_directory.connection_request_sent') });
                  setConnectOpen(false);
                  setConnectTitle("");
                  setConnectDescription("");
                } catch (err: any) {
                  toast({ title: t('lawyers_directory.error'), description: err.message || t('lawyers_directory.failed_to_connect'), variant: 'destructive' });
                } finally {
                  setConnecting(false);
                }
              }}
              disabled={connecting}
            >
              {connecting ? t('lawyers_directory.sending') : t('lawyers_directory.send_request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LawyerDirectory;
