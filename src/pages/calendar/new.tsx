import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CourtSessionsAPI, CasesAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarDate } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

const t = (k: string) => k;

type CaseItem = { id: string; title?: string; lawyerId?: string };
type Lawyer = { id: string; full_name?: string; email?: string };
type Client = { id: string; full_name?: string; email?: string };

const NewMeeting: React.FC = () => {
  const { user: authUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isCourt = String(authUser?.role || '').toLowerCase() === 'court';

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [sessionType, setSessionType] = useState<'physical' | 'virtual'>('physical');
  const [formData, setFormData] = useState({ location: '', description: '', type: '', startTime: '', endTime: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [availableLawyers, setAvailableLawyers] = useState<Lawyer[]>([]);
  const [involvedLawyerIds, setInvolvedLawyerIds] = useState<string[]>([]);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [involvedClientIds, setInvolvedClientIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [showUnauthorizedDialog, setShowUnauthorizedDialog] = useState(false);

  // Coerce an id-ish value (string | ObjectId | populated object) to string
  const idToString = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if ((val as any)._id) return String((val as any)._id);
      if ((val as any).id) return String((val as any).id);
      if (typeof (val as any).toString === 'function') {
        const s = (val as any).toString();
        if (s && s !== '[object Object]') return s;
      }
    }
    return '';
  };

  useEffect(() => {
    if (!authLoading && !authUser) {
      navigate('/auth');
      return;
    }
    if (authUser) {
      const role = String(authUser.role || '').toLowerCase();
  if (!['court', 'admin'].includes(role)) setShowUnauthorizedDialog(true);
    }
    setAuthChecked(true);
  }, [authUser, authLoading, navigate]);

  // If a case is provided in the URL (?case=...), preselect it
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cid = params.get('case');
    if (cid) setSelectedCaseId(cid);
  }, [location.search]);

  useEffect(() => {
    const fetchCases = async () => {
      if (!authChecked || authLoading || !authUser) return;
      const role = String(authUser.role || '').toLowerCase();
      if (!['lawyer', 'court', 'admin'].includes(role)) return;
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const data = await CasesAPI.list(token);
        const allCases = Array.isArray(data) ? data : data?.cases || data || [];
        const filtered = role === 'lawyer'
          ? allCases.filter((c: any) => idToString(c.lawyer_id || c.lawyerId || c.lawyer) === String(authUser.id))
          : allCases;
        setCases(filtered.map((c: any) => ({ id: String(c._id || c.id), title: c.title || c.name || 'Case', lawyerId: idToString(c.lawyer_id || c.lawyerId || c.lawyer) })));
      } catch (err: any) {
        toast({ title: 'Error fetching cases', description: err?.message || String(err), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, [authChecked, authUser, authLoading, toast]);

  // When case changes, load involved lawyers for the case (assigned + prior sessions) and preselect the assigned
  useEffect(() => {
    const run = async () => {
      try {
        setAvailableLawyers([]);
        setInvolvedLawyerIds([]);
        setAvailableClients([]);
        setInvolvedClientIds([]);
        const token = localStorage.getItem('token');
        if (!selectedCaseId) return;
        // Load involved lawyers for this case only
        const res = await fetch(`/api/cases/${selectedCaseId}/involved-lawyers`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!res.ok) {
          const text = await res.text();
          toast({ variant: 'destructive', title: 'Failed to load involved lawyers', description: text || `${res.status} ${res.statusText}` });
          // Fallback on non-OK: try the assigned lawyer from the case
          try {
            // Prefer local case list mapping first
            const localCase = cases.find((ci) => String(ci.id) === String(selectedCaseId));
            let assigned = localCase?.lawyerId;
            if (!assigned) {
              const c = await CasesAPI.get(selectedCaseId, token || undefined);
              assigned = idToString(c?.lawyer_id || c?.lawyerId || c?.lawyer);
            }
            const lid = idToString(assigned);
            if (lid) {
              setAvailableLawyers([{ id: lid, full_name: 'Assigned Lawyer', email: '' } as any]);
              setInvolvedLawyerIds([lid]);
            }
          } catch {}
        } else {
          const list = await res.json();
          const mapped = (Array.isArray(list) ? list : []).map((l: any) => ({ id: l.id || l._id, full_name: l.full_name || l.name || l.username || l.email, email: l.email }));
          setAvailableLawyers(mapped);
          if (mapped.length > 0) {
            setInvolvedLawyerIds(mapped.map(x => String(x.id)));
          } else {
            // Fallback: fetch the case and add its assigned lawyer if present
            try {
              const localCase = cases.find((ci) => String(ci.id) === String(selectedCaseId));
              let assigned = localCase?.lawyerId;
              if (!assigned) {
                const c = await CasesAPI.get(selectedCaseId, token || undefined);
                assigned = idToString(c?.lawyer_id || c?.lawyerId || c?.lawyer);
              }
              const lid = idToString(assigned);
              if (lid) {
                setAvailableLawyers([{ id: lid, full_name: 'Assigned Lawyer', email: '' } as any]);
                setInvolvedLawyerIds([lid]);
              }
            } catch (e) {
              // ignore
            }
          }
        }
      } catch {}

      // Load involved clients: primary client + any prior invited
      try {
        const token = localStorage.getItem('token');
        if (!selectedCaseId) return;
        const resp = await fetch(`/api/cases/${selectedCaseId}/involved-clients`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (resp.ok) {
          const list = await resp.json();
          const mapped = (Array.isArray(list) ? list : []).map((c: any) => ({ id: c.id || c._id, full_name: c.full_name || c.name || c.username || c.email, email: c.email }));
          setAvailableClients(mapped);
          if (mapped.length > 0) setInvolvedClientIds(mapped.map(x => String(x.id)));
        } else {
          // Non-blocking; clients will simply not be prefilled
          try {
            const c = await CasesAPI.get(selectedCaseId, token || undefined);
            const cid = idToString(c?.client_id || c?.clientId || c?.client);
            if (cid) {
              setAvailableClients([{ id: cid, full_name: 'Assigned Client', email: '' } as any]);
              setInvolvedClientIds([cid]);
            }
          } catch {}
        }
      } catch {}
    };
    run();
  }, [selectedCaseId, cases]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target as HTMLInputElement;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => setFormData((prev) => ({ ...prev, type: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast({ variant: 'destructive', title: 'Date required', description: 'Please select a date for the court session' });
      return;
    }
    // Optional time validation (non-destructive): if both provided and parsable, end must be after start
    const toMinutes = (val: string) => {
      if (!val) return undefined as number | undefined;
      const s = String(val).trim();
      const digits = s.includes(':') ? s.split(':') : [s.slice(0, Math.max(0, s.length - 2)), s.slice(-2)];
      const h = parseInt(digits[0] || '0', 10);
      const m = parseInt(digits[1] || '0', 10);
      if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
      return h * 60 + m;
    };
    if (formData.startTime && formData.endTime) {
      const sm = toMinutes(formData.startTime);
      const em = toMinutes(formData.endTime);
      if (sm !== undefined && em !== undefined && em <= sm) {
        toast({ variant: 'destructive', title: 'Invalid time range', description: 'End time must be after start time' });
        return;
      }
    }
    if (sessionType === 'virtual' && authUser) {
      const role = String(authUser.role || '').toLowerCase();
      if (!['court', 'admin'].includes(role)) {
        toast({ variant: 'destructive', title: 'Not allowed', description: 'Only court staff can create virtual sessions' });
        return;
      }
    }
    if (!selectedCaseId) {
      toast({ variant: 'destructive', title: 'Case required', description: 'Please select a case for this session' });
      return;
    }

    try {
      setIsSubmitting(true);
      if (!authUser) throw new Error('You must be logged in to create a session');
      const token = localStorage.getItem('token');
      const payload: any = {
        caseId: selectedCaseId,
        judgeId: authUser.id,
        scheduleDate: date.toISOString(),
  startTime: formData.startTime || '',
  endTime: formData.endTime || '',
  involvedLawyerIds,
        involvedClientIds,
        is_virtual: sessionType === 'virtual',
        location: formData.location || '',
      };
      const data = await CourtSessionsAPI.create(payload, token);
      toast({ title: 'Session created', description: `The ${sessionType} court session has been successfully created` });
      setTimeout(() => {
        if (sessionType === 'virtual' && data) navigate(`/meeting/${data.id || data._id}`);
        else navigate('/calendar');
      }, 400);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error creating session', description: err?.message || String(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authChecked) return <div className="min-h-screen bg-background flex items-center justify-center"><p>Loading...</p></div>;
  if (showUnauthorizedDialog) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 flex justify-center items-center">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Access Restricted</CardTitle>
              <CardDescription className="text-center">Only court staff can create court sessions.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <p className="text-center mb-6">Please contact your lawyer or court administrator to schedule a court session.</p>
              <Button onClick={() => navigate('/calendar')}>View Court Calendar</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create Court Session</CardTitle>
            <CardDescription>Fill out the form below to create a new court session.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-6">
              <div>
                <Label htmlFor="caseSelect">{t('Select Case')}</Label>
                <Select onValueChange={(value) => setSelectedCaseId(value)} value={selectedCaseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a case" />
                  </SelectTrigger>
                  <SelectContent>
                    {loading ? (
                      <SelectItem value="loading" disabled>Loading cases...</SelectItem>
                    ) : cases.length > 0 ? (
                      cases.map((caseItem) => (
                        <SelectItem key={caseItem.id} value={caseItem.id}>{caseItem.title}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-cases" disabled>No cases available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">{t('Meeting Type')}</Label>
                <RadioGroup value={sessionType} onValueChange={(v) => setSessionType(v as any)} className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="physical" id="physical" />
                    <Label htmlFor="physical">{t('Physical (In-person)')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="virtual" id="virtual" />
                    <Label htmlFor="virtual">{t('Virtual Meeting')}</Label>
                    {authUser && String(authUser.role || '').toLowerCase() !== 'court' && (
                      <span className="text-xs text-muted-foreground">(Court staff only)</span>
                    )}
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessionType === 'physical' && (
                  <div>
                    <Label htmlFor="location">{t('Location')}</Label>
                    <Input id="location" placeholder={t('Enter location')} value={formData.location} onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))} />
                  </div>
                )}
                {!isCourt && (
                  <div>
                    <Label htmlFor="type">{t('Session Type')}</Label>
                    <Select onValueChange={(v) => setFormData(prev => ({...prev, type: v}))} value={formData.type}>
                      <SelectTrigger><SelectValue placeholder={t('Select type')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hearing">{t('Hearing')}</SelectItem>
                        <SelectItem value="trial">{t('Trial')}</SelectItem>
                        <SelectItem value="mediation">{t('Mediation')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="description">{t('Description')}</Label>
                <Textarea id="description" placeholder={t('Enter description')} className="resize-none" value={formData.description} onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))} />
              </div>

              <div>
                <Label className="mb-2 block">{t('Involved Lawyers')}</Label>
                <div className="border rounded-md p-3 max-h-56 overflow-y-auto">
                  {availableLawyers.length === 0 && <div className="text-sm text-muted-foreground">No lawyers available</div>}
                  {availableLawyers.map((l) => {
                    const id = String(l.id);
                    const checked = involvedLawyerIds.includes(id);
                    return (
                      <label key={id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(val) => {
                            setInvolvedLawyerIds((prev) => {
                              const set = new Set(prev);
                              if (val) set.add(id); else set.delete(id);
                              return Array.from(set);
                            });
                          }}
                        />
                        <span className="text-sm">{l.full_name || l.email || id}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Selected lawyers will be notified of this session.</p>
              </div>

              <div>
                <Label className="mb-2 block">{t('Involved Clients')}</Label>
                <div className="border rounded-md p-3 max-h-56 overflow-y-auto">
                  {availableClients.length === 0 && (
                    <div className="text-sm text-muted-foreground">No clients available</div>
                  )}
                  {availableClients.map((c) => {
                    const id = String(c.id);
                    const checked = involvedClientIds.includes(id);
                    return (
                      <label key={id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(val) => {
                            setInvolvedClientIds((prev) => {
                              const set = new Set(prev);
                              if (val) set.add(id); else set.delete(id);
                              return Array.from(set);
                            });
                          }}
                        />
                        <span className="text-sm">{c.full_name || c.email || id}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {sessionType === 'virtual'
                    ? 'Selected clients will be invited to the virtual session.'
                    : 'Selected clients will be notified about this physical session.'}
                </p>
              </div>

              <div>
                <Label className="mb-2 block">{t('Date')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left')}>{date ? format(date, 'PPP') : 'Pick a date'}</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarDate mode="single" selected={date} onSelect={(d: Date) => setDate(d)} />
                  </PopoverContent>
                </Popover>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <Label htmlFor="startTime">{t('Start Time')}</Label>
                    <Input id="startTime" type="text" inputMode="numeric" placeholder="e.g., 0900 or 09:00" value={formData.startTime} onChange={(e) => setFormData(prev => ({...prev, startTime: e.target.value}))} />
                  </div>
                  <div>
                    <Label htmlFor="endTime">{t('End Time')}</Label>
                    <Input id="endTime" type="text" inputMode="numeric" placeholder="e.g., 1030 or 10:30" value={formData.endTime} onChange={(e) => setFormData(prev => ({...prev, endTime: e.target.value}))} />
                  </div>
                </div>
              </div>


              <div className="flex items-center justify-end space-x-2">
                <Button type="button" variant="ghost" onClick={() => navigate('/calendar')}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Session'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewMeeting;
