import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// Supabase removed; using backend API
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Calendar, Plus } from "lucide-react";
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Profile } from "@/types/database.types";


const caseFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  case_type: z.string().optional(),
  practice_area: z.string().optional(),
  status: z.enum(["pending", "active", "closed"]).default("pending"),
});

const NewCase = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [clients, setClients] = useState<Profile[]>([]);
  const [allClients, setAllClients] = useState<Profile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [courts, setCourts] = useState<Profile[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedClientCaseId, setSelectedClientCaseId] = useState<string>("");

  const form = useForm<z.infer<typeof caseFormSchema>>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      title: "",
      description: "",
      case_type: "",
      practice_area: "",
      status: "pending",
    },
  });

  // ...existing code...
  useEffect(() => {
    // Parse prefill params
    const qs = new URLSearchParams(location.search);
    const client = qs.get('client');
  const fromCase = qs.get('fromCase');
  if (fromCase) setSelectedClientCaseId(fromCase);
    const title = qs.get('title');
    const description = qs.get('description');
    if (client) setSelectedClientId(client);
    if (title) form.setValue('title', title);
    if (description) form.setValue('description', description);

    // Optional: fetch source case for richer prefill if id present and we lack details
  const maybeFetchSource = async () => {
      if (!fromCase) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/cases/${fromCase}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const c = await res.json();
          if (!title && c.title) form.setValue('title', c.title);
          if (!description && c.description) form.setValue('description', c.description);
          const cid = c.client?.id || c.client?._id || c.clientId || c.client_id;
          if (!client && cid) setSelectedClientId(String(cid));
        }
      } catch {}
    };
    maybeFetchSource();

  const fetchUserProfileAndClients = async () => {
      try {
        const token = localStorage.getItem('token');
        const meRes = await fetch('/api/auth/me', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!meRes.ok) throw new Error('Authentication required');
        const meData = await meRes.json();
        const user = meData.user;
        const uid = user?.id || user?._id || user?.user_id;
        if (!user || !uid) {
          navigate('/auth');
          return;
        }
        // Use role directly from the authenticated user; profile is optional
        const role = String(user.role || '').toLowerCase();
        setUserProfile(user);
        setUserRole(role);

        // Try to fetch extended profile, but don't block on errors
        try {
          const profileRes = await fetch(`/api/profiles/${uid}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            // Merge minimal user with profile data if needed
            setUserProfile((prev: any) => ({ ...(prev || {}), ...profileData }));
          }
        } catch {}

        // If lawyer, fetch accepted clients and courts
        if (role === 'lawyer') {
          // Preferred: only active clients for this lawyer
          let activeClients: any[] = [];
          try {
            const acRes = await fetch('/api/cases/active-clients', {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (acRes.ok) activeClients = await acRes.json();
          } catch {}
          if (activeClients.length > 0) {
            const normalizedAC = activeClients.map((c: any) => ({ ...c, id: c.id || c._id }));
            setAllClients(normalizedAC);
          } else {
            // Fallback: all clients
            const clientsRes = await fetch('/api/profiles?role=client', {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (clientsRes.ok) {
              const clientsData = await clientsRes.json();
              const list = Array.isArray(clientsData) ? clientsData : [];
              const normalized = list.map((c: any) => ({ ...c, id: c.id || c._id }));
              setAllClients(normalized);
            }
          }
          // Load courts (users with role=court)
          const courtsRes = await fetch('/api/users?role=court', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (courtsRes.ok) {
            const courtsData = await courtsRes.json();
            const cList = Array.isArray(courtsData) ? courtsData : [];
            const cNormalized = cList
              .map((c: any) => ({ ...c, id: c.id || c._id }))
              // Safety: only include users whose role is 'court' (case-insensitive)
              .filter((c: any) => String(c.role || '').toLowerCase() === 'court');
            // Deduplicate by id just in case
            const seen = new Set<string>();
            const uniqueCourts = cNormalized.filter((c: any) => {
              const key = String(c.id);
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            setCourts(uniqueCourts);
          }
        }
  setAuthChecked(true);
      } catch (error: any) {
        console.error('Error fetching profile/clients:', error.message);
  setAuthChecked(true);
      }
    };
    fetchUserProfileAndClients();
    fetchCases();
  }, [location.search]);
  // Now fetches clients for lawyers

  // Derive accepted clients from active cases assigned to this lawyer
  useEffect(() => {
    if (userRole !== 'lawyer') return;
    const activeCases = Array.isArray(cases) ? cases.filter((c: any) => c.status === 'active') : [];
    const idSet = new Set(
      activeCases
        .map((c: any) => c?.client?.id || c?.client?._id || c?.clientId || c?.client_id)
        .filter(Boolean)
        .map((v: any) => String(v))
    );
    let filtered = idSet.size > 0
      ? allClients.filter((cl: any) => idSet.has(String(cl.id || cl._id)))
      : allClients.slice();
    // If we navigated here with a selected client (from Accept) but cases haven't reflected yet,
    // ensure that client still appears in the selector
    if (selectedClientId && !filtered.some(c => String(c.id) === String(selectedClientId))) {
      const found = allClients.find((c: any) => String(c.id) === String(selectedClientId));
      if (found) {
        filtered = [...filtered, found];
      } else {
        // Fetch the client by id and append so the dropdown is usable immediately
        (async () => {
          try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/profiles/${selectedClientId}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.ok) {
              const prof = await res.json();
              const normalized = { ...prof, id: prof.id || prof._id };
              setAllClients(prev => {
                const exists = prev.some((c: any) => String(c.id) === String(normalized.id));
                return exists ? prev : [...prev, normalized];
              });
              setClients(prev => {
                const exists = prev.some((c: any) => String(c.id) === String(normalized.id));
                return exists ? prev : [...prev, normalized];
              });
            }
          } catch {}
        })();
      }
    }
    setClients(filtered);
  }, [cases, allClients, userRole, selectedClientId]);

  // Ensure we have user details for any client IDs present in active cases
  useEffect(() => {
    if (userRole !== 'lawyer') return;
    const activeCases = Array.isArray(cases) ? cases.filter((c: any) => String(c.status).toLowerCase() === 'active') : [];
    const idsFromCases = Array.from(new Set(
      activeCases
        .map((c: any) => c?.client?.id || c?.client?._id || c?.clientId || c?.client_id)
        .filter(Boolean)
        .map((v: any) => String(v))
    ));
    const missing = idsFromCases.filter((id: string) => !allClients.some((c: any) => String(c.id) === id));
    if (missing.length === 0) return;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const fetched = await Promise.all(
          missing.map(async (id) => {
            try {
              const res = await fetch(`/api/users/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
              if (!res.ok) return null;
              const u = await res.json();
              return { ...u, id: u.id || u._id };
            } catch { return null; }
          })
        );
        const valid = fetched.filter(Boolean) as any[];
        if (valid.length > 0) {
          setAllClients((prev: any[]) => {
            const merged = [...prev];
            valid.forEach((n) => {
              if (!merged.some((c: any) => String(c.id) === String(n.id))) merged.push(n);
            });
            return merged;
          });
        }
      } catch {}
    })();
  }, [cases, allClients, userRole]);

  // Keep selectedClientId in sync with selectedClientCaseId
  useEffect(() => {
    if (!selectedClientCaseId) return;
    const list = Array.isArray(cases) ? cases : [];
    const found = list.find((c: any) => String(c.id || c._id) === String(selectedClientCaseId));
    const cid = found?.client?.id || found?.client?._id || found?.clientId || found?.client_id || '';
    if (cid && String(selectedClientId) !== String(cid)) {
      setSelectedClientId(String(cid));
    }
  }, [selectedClientCaseId, cases]);

  const fetchCases = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cases', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Failed to fetch cases');
      const data = await response.json();
  const list = Array.isArray(data?.cases) ? data.cases : (Array.isArray(data) ? data : []);
  const normalized = list.map((c: any) => ({ id: c.id || c._id || String(c._id || ''), ...c }));
  setCases(normalized);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load cases',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof caseFormSchema>) => {
    try {
      setLoading(true);
      // Get current authenticated user
      const token = localStorage.getItem('token');
      const meRes = await fetch('/api/auth/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!meRes.ok) throw new Error('You must be logged in to create a case');
      const meData = await meRes.json();
      const user = meData.user;
      if (!user) throw new Error('You must be logged in to create a case');

  // Only allow lawyers to submit
  if (userRole !== 'lawyer') {
        toast({
          title: 'Permission Denied',
          description: 'Only lawyers can create cases.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Court selection is required
      if (!selectedCourtId) {
        toast({
          title: 'Court Required',
          description: 'Please select a court for this case.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Create case data with correct field names
    if (!selectedClientId) {
        toast({
      title: 'Client Case Required',
      description: 'Please select a client case.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      const caseData: any = {
        title: values.title,
        description: values.description || '',
        case_type: values.case_type || '',
        practice_area: values.practice_area || '',
        status: values.status,
        clientId: selectedClientId,
        lawyerId: user.id || user._id || user.user_id,
        courtId: selectedCourtId,
      };

      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(caseData),
      });
      let responseText = await response.text();
      if (!response.ok) {
        let errorMsg = responseText;
        try {
          const errorJson = JSON.parse(responseText);
          if (errorJson.errors && Array.isArray(errorJson.errors)) {
            errorMsg = errorJson.errors.map((e: any) => e.msg).join(', ');
          } else if (errorJson.error) {
            errorMsg = errorJson.error;
          }
        } catch {}
        console.error('Backend response:', errorMsg);
        throw new Error(`Failed to create case: ${errorMsg}`);
      }
      // Parse created case to get its ID
      let createdCase: any = null;
      try { createdCase = JSON.parse(responseText); } catch {}
      const createdCaseId = createdCase?.id || createdCase?._id;
  toast({ title: 'Success', description: 'Case created successfully' });
      // If a document was selected, upload it now
      if (selectedFile && createdCaseId) {
        try {
          const fd = new FormData();
          fd.append('file', selectedFile);
          const uploadRes = await fetch(`/api/documents/${createdCaseId}`, {
            method: 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: fd
          });
          if (!uploadRes.ok) {
            const t = await uploadRes.text();
            throw new Error(t || 'Upload failed');
          }
          toast({ title: 'Document uploaded', description: selectedFile.name });
        } catch (e: any) {
          toast({ title: 'Document upload failed', description: e.message || String(e), variant: 'destructive' });
        }
      }
  await fetchCases();
  navigate('/cases?view=my-court-cases');
    } catch (error: any) {
      console.error('Error creating case:', error);
      toast({
        title: 'Error',
        description: `Failed to create case: ${error.message || error.toString()}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = () => {
    // This now just opens the form section
    document.getElementById("case-form-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Case Management</h1>
          <Button type="button" onClick={handleCreateCase}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Case
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                All Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{cases.length}</p>
              <p className="text-sm text-gray-500 mt-1">Total cases</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                Active Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {cases.filter((c: any) => c.status === 'active').length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Currently in progress</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Calendar className="h-5 w-5" />
                Recent Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {cases.filter((c: any) => {
                  const createdDate = new Date(c.created_at);
                  const oneMonthAgo = new Date();
                  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                  return createdDate > oneMonthAgo;
                }).length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Added in the last month</p>
            </CardContent>
          </Card>
        </div>

        {!authChecked ? (
          <div className="bg-white p-6 rounded-lg shadow-sm mb-8 text-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : userRole === 'lawyer' ? (
          <div id="case-form-section" className="bg-white p-6 rounded-lg shadow-sm mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Case</h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Client selection for lawyers */}
                <>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Select Client case</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={selectedClientCaseId}
                      onChange={e => {
                        const val = e.target.value;
                        setSelectedClientCaseId(val);
                        // derive clientId from selected case
                        const found = (Array.isArray(cases) ? cases : []).find((c: any) => String(c.id || c._id) === String(val));
                        const cid = found?.client?.id || found?.client?._id || found?.clientId || found?.client_id || '';
                        setSelectedClientId(cid ? String(cid) : '');
                      }}
                      required
                    >
                      <option value="">-- Select a client case --</option>
                      {(Array.isArray(cases) ? cases : [])
                        .filter((c: any) => String(c.status).toLowerCase() === 'active')
                        .map((c: any) => {
                          const cid = c?.client?.id || c?.client?._id || c?.clientId || c?.client_id;
                          const client = allClients.find((cl: any) => String(cl.id) === String(cid));
                          const clientLabel = client?.full_name || client?.email || String(cid || 'Unknown Client');
                          const label = `${clientLabel} — ${c.title || 'Untitled'}`;
                          const id = String(c.id || c._id);
                          return (
                            <option key={id} value={id}>{label}</option>
                          );
                        })}
                    </select>
                    {(!Array.isArray(cases) || cases.filter((c: any) => String(c.status).toLowerCase() === 'active').length === 0) && (
                      <p className="text-sm text-amber-700 mt-1">No active client cases found. Accept a client case first.</p>
                    )}
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Select Court <span className="text-red-600">*</span></label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={selectedCourtId}
                      onChange={e => setSelectedCourtId(e.target.value)}
                      required
                    >
                      <option value="">-- Select a court --</option>
                      {courts.map(court => {
                        const label = court.court_name || court.full_name || court.email || court.id;
                        return (
                          <option key={court.id} value={court.id}>
                            {label}{court.email ? ` (${court.email})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  {/* Optional: Upload initial document for this case */}
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Attach Document (optional)</label>
                    <input
                      type="file"
                      className="w-full border rounded px-3 py-2"
                      onChange={e => setSelectedFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                    />
                    <p className="text-xs text-gray-500 mt-1">You can upload a PDF, image, or doc. It will be attached after the case is created.</p>
                  </div>
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter case title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter case description" {...field} className="min-h-[100px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="case_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Civil, Criminal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="practice_area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Practice Area</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Family Law, Corporate" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select case status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full md:w-auto"
                  >
                    {loading ? "Creating..." : "Create Case"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
  ) : (
          <div id="case-form-section" className="bg-white p-6 rounded-lg shadow-sm mb-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Create New Case</h2>
            <p className="text-gray-600">Only lawyers can create new cases. If you are a client or court user, please contact your lawyer to initiate a case.</p>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Case List</h2>
          {cases.length > 0 ? (
            <div className="space-y-4">
              {cases.map((aCase: any, idx: number) => (
                <div 
                  key={aCase.id || aCase._id || idx} 
                  className="border p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg">{aCase.title}</h3>
                      <p className="text-gray-600 mt-1">{aCase.description || 'No description provided'}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-500">
                          Created: {new Date(aCase.created_at).toLocaleDateString()}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          aCase.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : aCase.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {aCase.status}
                        </span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => navigate(`/cases/${aCase.id}`)}
                      variant="outline"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-gray-50">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No cases found</p>
              <Button type="button" onClick={handleCreateCase}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Case
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
export default NewCase;
