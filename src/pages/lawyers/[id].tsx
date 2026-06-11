import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useParams, useNavigate } from 'react-router-dom';
import { Briefcase, Mail, Phone, MapPin, Book, GraduationCap, Globe, Star, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { CasesAPI } from "@/lib/api";
import { useTranslation } from "react-i18next";
// Supabase removed. Profile type can be defined locally or imported from new backend types if available.

interface CaseHistoryItem {
  id: string;
  title: string;
  practice_area: string | null;
  status: string;
  created_at: string;
}

const LawyerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [lawyer, setLawyer] = useState<any>(null);
  const [caseHistory, setCaseHistory] = useState<CaseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [connectNote, setConnectNote] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'connected' | 'rejected'>("none");
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const fetchLawyerProfile = async () => {
      setLoading(true);
      if (!id) {
        navigate('/lawyers');
        return;
      }
      try {
        // Fetch lawyer profile from backend API
        const token = localStorage.getItem('token');
      const res = await fetch(`/api/lawyers/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!res.ok) {
          if (res.status === 404) {
            navigate('/lawyers');
            toast({
              variant: "destructive",
              title: t('lawyer_profile.not_found_title'),
              description: t('lawyer_profile.not_found_desc'),
            });
            return;
          }
          throw new Error(t('lawyer_profile.failed_fetch'));
        }
        const lawyerData = await res.json();
        setLawyer(lawyerData);

        // Fetch cases visible to the current user and filter by this lawyer
        const token = localStorage.getItem('token') || undefined;
        try {
          const list = await CasesAPI.list(token);
          const allCases = Array.isArray(list) ? list : (list?.cases || []);
          const filtered = allCases.filter((c: any) => {
            const lid = (c.lawyer_id || c.lawyerId || (c.lawyer && (c.lawyer._id || c.lawyer.id)) || '').toString();
            return lid === String(id);
          });
          const mapped: CaseHistoryItem[] = filtered.map((c: any) => ({
            id: (c._id || c.id || '').toString(),
            title: c.title || 'Case',
            practice_area: c.type || c.practice_area || null,
            status: c.status || 'pending',
            created_at: (c.created_at || c.createdAt || new Date().toISOString())
          }));
          setCaseHistory(mapped);
        } catch (ce) {
          // If cases cannot be loaded, show empty history gracefully
          setCaseHistory([]);
        }
      } catch (error) {
        console.error('Error fetching lawyer profile:', error);
        toast({
          variant: "destructive",
          title: t('lawyer_profile.error'),
          description: t('lawyer_profile.failed_load'),
        });
        setLawyer(null);
        setCaseHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLawyerProfile();
  }, [id, navigate, toast, t]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleContactLawyer = () => setShowMessageDialog(true);
  const handleConnectLawyer = () => setShowConnectDialog(true);
  // Scheduling is reserved for court/admin; lawyers/clients cannot initiate here
  const handleScheduleMeeting = () => {};

  const submitMessage = async () => {
    setSubmitting(true);
    try {
        const tokenMsg = localStorage.getItem('token');
        await fetch(`/api/communication/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tokenMsg ? { Authorization: `Bearer ${tokenMsg}` } : {}) },
        body: JSON.stringify({ recipientId: lawyer._id || lawyer.id, message: messageText })
      });
      toast({ title: t('lawyer_profile.message_sent'), description: t('lawyer_profile.message_sent_desc', { name: lawyer?.full_name }) });
      setShowMessageDialog(false);
      setMessageText("");
    } catch {
      toast({ title: t('lawyer_profile.failed_send_message'), variant: "destructive" });
    }
    setSubmitting(false);
  };

  const submitConnect = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token') || undefined;
      const title = t('lawyer_profile.new_case');
      const description = (connectNote && connectNote.trim().length >= 10)
        ? connectNote.trim()
        : t('lawyer_profile.pending_approval');
      await fetch(`/api/cases/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ lawyer_id: lawyer._id || lawyer.id, title, description })
      });
      toast({ title: t('lawyer_profile.connection_sent'), description: t('lawyer_profile.connection_sent_desc', { name: lawyer?.full_name }) });
      setShowConnectDialog(false);
      setConnectNote("");
      setConnectionStatus("pending");
      // Refresh visible case list so it appears in history
      try {
        const list = await CasesAPI.list(token);
        const allCases = Array.isArray(list) ? list : (list?.cases || []);
        const filtered = allCases.filter((c: any) => {
          const lid = (c.lawyer_id || c.lawyerId || (c.lawyer && (c.lawyer._id || c.lawyer.id)) || '').toString();
          return lid === String(id);
        });
        const mapped: CaseHistoryItem[] = filtered.map((c: any) => ({
          id: (c._id || c.id || '').toString(),
          title: c.title || 'Case',
          practice_area: c.type || c.practice_area || null,
          status: c.status || 'pending',
          created_at: (c.created_at || c.createdAt || new Date().toISOString())
        }));
        setCaseHistory(mapped);
      } catch {}
    } catch {
      toast({ title: t('lawyer_profile.failed_connection_request'), variant: "destructive" });
    }
    setSubmitting(false);
  };

  const submitReview = async () => {
    setSubmitting(true);
    try {
      const tokenRev = localStorage.getItem('token');
      await fetch(`/api/lawyers/${lawyer._id || lawyer.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tokenRev ? { Authorization: `Bearer ${tokenRev}` } : {}) },
        body: JSON.stringify({ rating: reviewRating, comment: reviewText })
      });
      toast({ title: t('lawyer_profile.review_submitted'), description: t('lawyer_profile.review_submitted_desc', { name: lawyer?.full_name }) });
      setShowReviewDialog(false);
      setReviewText("");
      setReviewRating(5);
    } catch {
      toast({ title: t('lawyer_profile.failed_review'), variant: "destructive" });
    }
    setSubmitting(false);
  };

  // Check connection status between client and lawyer
  useEffect(() => {
    const checkStatus = async () => {
      setCheckingStatus(true);
      try {
        const token = localStorage.getItem("token");
        if (!token || !id) return;
        const res = await fetch(`/api/cases/connection-status?lawyer_id=${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setConnectionStatus(data.status || "none");
        } else {
          setConnectionStatus("none");
        }
      } catch {
        setConnectionStatus("none");
      }
      setCheckingStatus(false);
    };
    checkStatus();
  }, [id]);

  const handleReconnect = () => {
    setConnectNote("");
    setShowConnectDialog(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
  <main id="main-dashboard-section" className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!lawyer) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold">{t('lawyer_profile.not_found_title')}</h1>
            <p className="mt-2 text-muted-foreground">{t('lawyer_profile.not_found_desc')}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/lawyers')}
            >
              {t('lawyer_profile.back_to_directory')}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar with lawyer info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="flex flex-col items-center">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={lawyer.avatar_url || ''} alt={lawyer.full_name || ''} />
                    <AvatarFallback className="text-lg">{lawyer.full_name ? getInitials(lawyer.full_name) : 'LA'}</AvatarFallback>
                  </Avatar>
                  <CardTitle className="mt-4 text-2xl">{lawyer.full_name}</CardTitle>
                  <CardDescription className="mt-1">{lawyer.specialization || t('lawyer_profile.legal_professional')}</CardDescription>
                  {lawyer.bar_number && (
                    <Badge className="mt-2">{t('lawyer_profile.bar_no')}: {lawyer.bar_number}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lawyer.years_of_experience && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{t('lawyer_profile.years_experience', { count: lawyer.years_of_experience })}</span>
                    </div>
                  )}
                  
                  {lawyer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{lawyer.email}</span>
                    </div>
                  )}
                  
                  {lawyer.contact_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{lawyer.contact_number}</span>
                    </div>
                  )}
                  
                  {lawyer.office_address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{lawyer.office_address}</span>
                    </div>
                  )}
                  
                  {lawyer.hourly_rate && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{t('lawyer_profile.hourly_rate')}:</span>
                      <span>${lawyer.hourly_rate} USD</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 space-y-3">
                  <Button className="w-full" onClick={handleContactLawyer}>
                    {t('lawyer_profile.message_lawyer')}
                  </Button>
                  <Button
  className="w-full bg-blue-600 hover:bg-blue-700"
  onClick={handleConnectLawyer}
  disabled={checkingStatus || connectionStatus === 'pending' || connectionStatus === 'connected'}
>
  {checkingStatus ? t('lawyer_profile.checking') :
    connectionStatus === 'pending' ? t('lawyer_profile.request_pending') :
    connectionStatus === 'connected' ? t('lawyer_profile.connected') :
    t('lawyer_profile.connect')}
</Button>
{connectionStatus === 'pending' && (
  <div className="text-xs text-yellow-600 text-center">{t('lawyer_profile.pending_approval_msg')}</div>
)}
{connectionStatus === 'connected' && (
  <div className="text-xs text-green-600 text-center">{t('lawyer_profile.already_connected')}</div>
)}
{connectionStatus === 'rejected' && (
  <div className="text-xs text-red-600 text-center">{t('lawyer_profile.rejected_request')}</div>
)}
                  {/* Scheduling disabled: only court/admin can create sessions */}
                </div>
              </CardContent>
            </Card>
            
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">{t('lawyer_profile.education')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lawyer.education && lawyer.education.length > 0 ? (
                    lawyer.education.map((edu, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <GraduationCap className="h-4 w-4 mt-1 text-muted-foreground" />
                        <span>{edu}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground">{t('lawyer_profile.no_education')}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Main content area */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList className="w-full">
                <TabsTrigger value="overview" className="flex-1">{t('lawyer_profile.overview')}</TabsTrigger>
                <TabsTrigger value="cases" className="flex-1">{t('lawyer_profile.case_history')}</TabsTrigger>
                <TabsTrigger value="reviews" className="flex-1">{t('lawyer_profile.reviews')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('lawyer_profile.about')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{t('lawyer_profile.specialization')}</h3>
                        <p>
                          {lawyer.specialization || t('lawyer_profile.no_specialization')}
                        </p>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{t('lawyer_profile.experience')}</h3>
                        <p>
                          {lawyer.years_of_experience 
                            ? t('lawyer_profile.experience_desc', { name: lawyer.full_name, count: lawyer.years_of_experience })
                            : t('lawyer_profile.no_experience')
                          }
                        </p>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{t('lawyer_profile.practice_areas')}</h3>
                        <div className="flex flex-wrap gap-2">
                          {/* This would typically come from a separate table or field */}
                          {lawyer.specialization && (
                            <Badge variant="secondary">
                              {lawyer.specialization}
                            </Badge>
                          )}
                          <Badge variant="secondary">{t('lawyer_profile.legal_consultation')}</Badge>
                          <Badge variant="secondary">{t('lawyer_profile.court_representation')}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="cases" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('lawyer_profile.case_history')}</CardTitle>
                    <CardDescription>
                      {t('lawyer_profile.previous_cases', { name: lawyer.full_name })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {caseHistory.length > 0 ? (
                      <div className="space-y-4">
                        {caseHistory.map((caseItem) => (
                          <div 
                            key={caseItem.id} 
                            className="p-4 border rounded-md hover:bg-accent cursor-pointer transition-colors"
                            onClick={() => navigate(`/cases/${caseItem.id}`)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{caseItem.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {caseItem.practice_area || t('lawyer_profile.general_practice')}
                                </p>
                              </div>
                              <Badge variant={
                                caseItem.status === 'active' ? 'default' :
                                caseItem.status === 'closed' ? 'secondary' :
                                'outline'
                              }>
                                {caseItem.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                        <h3 className="mt-4 text-lg font-medium">{t('lawyer_profile.no_case_history')}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('lawyer_profile.no_case_history_desc')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('lawyer_profile.client_reviews')}</CardTitle>
                    <CardDescription>
                      {t('lawyer_profile.what_clients_say', { name: lawyer.full_name })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Star className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                      <h3 className="mt-4 text-lg font-medium">{t('lawyer_profile.no_reviews')}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('lawyer_profile.no_reviews_desc')}
                      </p>
                      <Button variant="outline" className="mt-4" onClick={() => setShowReviewDialog(true)}>
                        {t('lawyer_profile.leave_review')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('lawyer_profile.message_title', { name: lawyer?.full_name })}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            placeholder={t('lawyer_profile.message_placeholder')}
            rows={5}
            className="mb-4"
          />
          <DialogFooter>
            <Button onClick={submitMessage} disabled={submitting || !messageText.trim()}>
              {t('lawyer_profile.send_message')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Connect Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('lawyer_profile.connect_title', { name: lawyer?.full_name })}</DialogTitle>
          </DialogHeader>
          <div className="mb-2 text-sm text-muted-foreground">
            {t('lawyer_profile.connect_confirm')}
          </div>
          <Textarea
            value={connectNote}
            onChange={e => setConnectNote(e.target.value)}
            placeholder={t('lawyer_profile.connect_note_placeholder')}
            rows={4}
            className="mb-4"
          />
          <DialogFooter>
            <Button onClick={submitConnect} disabled={submitting}>
              {submitting ? t('lawyer_profile.sending') : t('lawyer_profile.send_connection_request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('lawyer_profile.review_title', { name: lawyer?.full_name })}</DialogTitle>
          </DialogHeader>
          <div className="mb-2">
            <label className="font-semibold mr-2">{t('lawyer_profile.rating')}:</label>
            <select value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))} className="border rounded px-2 py-1">
              {[5,4,3,2,1].map(r => <option key={r} value={r}>{r}</option>)}
            </select> / 5
          </div>
          <Textarea
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            placeholder={t('lawyer_profile.review_placeholder')}
            rows={4}
            className="mb-4"
          />
          <DialogFooter>
            <Button onClick={submitReview} disabled={submitting || !reviewText.trim()}>
              {t('lawyer_profile.submit_review')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LawyerProfile;
