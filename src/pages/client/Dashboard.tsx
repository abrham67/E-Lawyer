import React, { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import Chat from "@/components/Chat";
import { useAuth } from "@/hooks/useAuth";
import { CasesAPI, LawyersAPI } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import MobileTabBar from "@/components/MobileTabBar";

const ClientDashboard = () => {
  const [lawyers, setLawyers] = useState([]);
  const [cases, setCases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [messages, setMessages] = useState([]);
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const [recipient, setRecipient] = useState(null); // Placeholder for selected lawyer
  const [error, setError] = useState("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<any>(null);
  const [connectTitle, setConnectTitle] = useState("");
  const [connectDescription, setConnectDescription] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    // Fetch lawyers
    // Prefer backend-connected list for this client
    fetch('/api/cases/me/lawyers', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then((data) => {
        if (Array.isArray(data)) setLawyers(data);
        else if (Array.isArray(data?.lawyers)) setLawyers(data.lawyers);
        else return Promise.reject(new Error('fallback'));
      })
      .catch(() => {
        // Fallback to general lawyers list
        LawyersAPI.list(token)
          .then(data => setLawyers(data.lawyers || data || []))
          .catch(() => setError("Failed to load lawyers."));
      });
    // Fetch cases
    CasesAPI.list(token)
      .then(data => setCases(data.cases || data || []))
      .catch(() => setError("Failed to load cases."));
    // Fetch documents
    fetch("/api/documents", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        const docs = Array.isArray(data) ? data : (data.documents || []);
        setDocuments(docs);
      })
      .catch(() => setError("Failed to load documents."));
    // Fetch messages
    fetch("/api/communication", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setMessages(data.messages || []))
      .catch(() => setError("Failed to load messages."));
    // Fetch profile
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setProfile(data.user || null));
    // Fetch court sessions where client is invited
    fetch("/api/courtsessions", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setSessions(Array.isArray(data) ? data : (data.sessions || data || [])))
      .catch(() => setError("Failed to load court sessions."));
  }, []);

  // Derived connected lawyers from cases
  const connectedLawyerIds = React.useMemo(() => {
    const ids = new Set();
    cases.forEach(c => {
      if (c.lawyer_id) ids.add((c.lawyer_id || '').toString());
      if (c.lawyerId) ids.add((c.lawyerId || '').toString());
      if (c.lawyer && (c.lawyer._id || c.lawyer.id)) ids.add((c.lawyer._id || c.lawyer.id).toString());
    });
    return ids;
  }, [cases]);

  const isClient = user && typeof user.role === 'string' && user.role.toLowerCase().includes('client');

  // Build a robust connected lawyers list using the fetched lawyers filtered by connectedLawyerIds.
  // Fallback to deriving from cases if the lawyers list is empty or missing entries.
  const connectedLawyers = React.useMemo(() => {
    const ids = connectedLawyerIds;
    const source = Array.isArray(lawyers) ? lawyers : [];
    const filtered = source.filter((l: any) => ids.has(String(l._id || l.id || '')));
    if (filtered.length > 0) return filtered;
    // Fallback: derive unique lawyers from cases
    const map = new Map<string, any>();
    cases.forEach((c: any) => {
      const lid = String(c.lawyer_id || c.lawyerId || (c.lawyer && (c.lawyer._id || c.lawyer.id)) || '');
      if (!lid) return;
      if (!map.has(lid)) {
        map.set(lid, {
          _id: lid,
          full_name: c.lawyer?.full_name || c.lawyerName || c.lawyer_full_name || 'Lawyer',
          specialization: c.lawyer?.specialization || undefined,
        });
      }
    });
    return Array.from(map.values());
  }, [lawyers, cases, connectedLawyerIds]);

  const lawyerCaseCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    cases.forEach((c: any) => {
      const lid = String(c.lawyer_id || c.lawyerId || (c.lawyer && (c.lawyer._id || c.lawyer.id)) || '');
      if (!lid) return;
      counts.set(lid, (counts.get(lid) || 0) + 1);
    });
    return counts;
  }, [cases]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedCaseId) return;
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);
    // Optionally add more fields (e.g., title)
    const res = await fetch(`/api/documents/${selectedCaseId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      const newDoc = await res.json();
      setDocuments((prev) => [newDoc, ...prev]);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
  <main id="main-dashboard-section" className="container mx-auto px-4 py-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-primary">Client Dashboard</h1>
    {/* Single-column, one section per row */}
    <div className="flex flex-col gap-4">
          {/* Profile Quick View */}
          <section className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h.01M16 12h.01M12 16h.01" /></svg>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">Profile</h2>
            </div>
            {profile ? (
              <div className="grid grid-cols-1 gap-2 text-gray-700">
                <div><span className="font-semibold">Name:</span> {profile.full_name || profile.fullName}</div>
                <div><span className="font-semibold">Email:</span> {profile.email}</div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400 animate-pulse"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h.01M16 12h.01M12 16h.01" /></svg> Loading profile...</div>
            )}
          </section>
          {/* Real-Time Chat (Row 3) */}
          <section className="bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-lg p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8l-4 1 1.1-3.3A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">Real-Time Chat</h2>
            </div>
            {/* TODO: Add recipient selection UI */}
            {user && user.id ? (
              <Chat user={user} recipient={recipient || { id: "demo-lawyer", full_name: "Demo Lawyer" }} />
            ) : (
              <div className="text-gray-400">Loading chat...</div>
            )}
          </section>
          {/* My Lawyers */}
          <section className="bg-gradient-to-br from-teal-50 to-white rounded-2xl shadow-lg p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-7 h-7 text-teal-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8l-4 1 1.1-3.3A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">My Lawyers</h2>
            </div>
            <ul className="divide-y divide-teal-100">
              {connectedLawyers.length > 0 ? (
                connectedLawyers.map((l: any) => {
                  const lid = String(l._id || l.id || '');
                  const count = lawyerCaseCounts.get(lid) || 0;
                  return (
                    <li key={lid || l.email || l.full_name} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-teal-900">{l.full_name || l.name}</span>
                        <div className="text-xs text-gray-500">{l.specialization || '—'}</div>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">{count} case{count === 1 ? '' : 's'}</div>
                    </li>
                  );
                })
              ) : (
                <li className="text-gray-400">You have no connected lawyers.</li>
              )}
            </ul>
          </section>
  {/* My Cases (Row 4) */}
  <section className="bg-gradient-to-br from-purple-50 to-white rounded-2xl shadow-lg p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 3v4M8 3v4" /></svg>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold">My Cases</h2>
          </div>
          <div className="overflow-x-hidden">
            <table className="w-full table-fixed text-left rounded-lg">
              <thead className="bg-purple-100">
                <tr>
                  <th className="py-2 px-2 sm:px-3 font-semibold w-[40%] break-words">Title</th>
                  <th className="py-2 px-2 sm:px-3 font-semibold w-[30%]">Status</th>
                  <th className="py-2 px-2 sm:px-3 font-semibold hidden md:table-cell">Status Steps</th>
                  <th className="py-2 px-2 sm:px-3 font-semibold hidden md:table-cell">Progress</th>
                  <th className="py-2 px-2 sm:px-3 font-semibold hidden md:table-cell">Details</th>
                </tr>
              </thead>
              <tbody>
                {cases.length > 0 ? (
                  cases.map((c) => {
                    const statusList = [
                      { label: "Open", icon: "🟢", color: "text-green-600", tooltip: "Case has been opened." },
                      { label: "In Progress", icon: "🟡", color: "text-yellow-600", tooltip: "Case is being processed." },
                      { label: "Awaiting Judgment", icon: "🔵", color: "text-blue-600", tooltip: "Case is awaiting judgment." },
                      { label: "Closed", icon: "⚫", color: "text-gray-600", tooltip: "Case is closed." }
                    ];
                    const currentStep = Math.max(0, statusList.findIndex(s => s.label === c.status));
                    const progress = Math.max(0, currentStep) / (statusList.length - 1) * 100;
                    return (
                      <tr key={c.id || c._id} className="border-b last:border-b-0 hover:bg-purple-100 transition text-sm sm:text-base">
                        <td className="py-2 px-2 sm:px-3 font-medium text-purple-900 hover:underline cursor-pointer transition break-words" tabIndex={0}>{c.title}</td>
                        <td className={`py-2 px-2 sm:px-3 font-semibold ${statusList[currentStep]?.color || ''}`}>{statusList[currentStep]?.icon} {c.status}</td>
                        <td className="py-2 px-2 sm:px-3 hidden md:table-cell">
                          <div className="flex items-center space-x-2">
                            {statusList.map((step, idx) => (
                              <div key={step.label} className="flex flex-col items-center group">
                                <span
                                  className={`text-lg ${idx <= currentStep ? step.color : 'text-gray-300'}`}
                                  title={step.tooltip}
                                >
                                  {step.icon}
                                </span>
                                <span className="text-[10px] text-gray-500 group-hover:underline">{step.label}</span>
                                {idx < statusList.length - 1 && (
                                  <span className={`block w-4 h-0.5 ${idx < currentStep ? 'bg-blue-500' : 'bg-gray-200'}`}></span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-2 sm:px-3 w-32 hidden md:table-cell">
                          <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
                        </td>
                        <td className="py-2 px-2 sm:px-3 text-xs text-gray-700 hidden md:table-cell">
                          <div><span className="font-semibold">Filed:</span> {c.filedDate ? new Date(c.filedDate).toLocaleDateString() : 'N/A'}</div>
                          <div><span className="font-semibold">Lawyer:</span> {c.lawyerName || 'N/A'}</div>
                          <div><span className="font-semibold">Type:</span> {c.type || 'N/A'}</div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-400 py-4">No cases found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Virtual Court Sessions (client invited) */}
        <section className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 3v4M8 3v4" /><circle cx="12" cy="14" r="3" /></svg>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold">Virtual Court Sessions</h2>
          </div>
          <ul className="divide-y divide-blue-100">
            {sessions.filter(s => {
              const isClientInvolved = Array.isArray(s.involved_client_ids) && s.involved_client_ids.includes(user?.id);
              const isScheduled = String(s.status || '').toLowerCase() === 'scheduled';
              const isFuture = s.scheduled_date ? new Date(s.scheduled_date) > new Date() : true;
              return s.is_virtual && isClientInvolved && isScheduled && isFuture;
            }).length > 0 ? (
              sessions.filter(s => {
                const isClientInvolved = Array.isArray(s.involved_client_ids) && s.involved_client_ids.includes(user?.id);
                const isScheduled = String(s.status || '').toLowerCase() === 'scheduled';
                const isFuture = s.scheduled_date ? new Date(s.scheduled_date) > new Date() : true;
                return s.is_virtual && isClientInvolved && isScheduled && isFuture;
              }).map((s: any) => (
                <li key={s.id || s._id} className="py-2 flex justify-between items-center hover:bg-blue-100 rounded transition cursor-pointer" tabIndex={0}>
                  <span>
                    <span className="font-semibold text-blue-800">{s.case?.title || 'Court Session'}</span>
                    <span className="ml-2 text-xs text-gray-400">{s.scheduled_date ? new Date(s.scheduled_date).toLocaleString() : (s.date || '')}</span>
                  </span>
                  {s.is_virtual && (
                    <button
                      className="ml-2 px-4 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold shadow"
                      onClick={() => {
                        const sid = s.id || s._id;
                        const link = s.virtual_meeting_link || `/meeting/${sid}`;
                        window.location.href = link.startsWith('/meeting') ? link : `/meeting/${sid}`;
                      }}
                      tabIndex={0}
                      aria-label="Join virtual court session"
                    >
                      Join Virtual Session
                    </button>
                  )}
                </li>
              ))
            ) : (
              <li className="text-gray-400">No virtual court sessions found.</li>
            )}
          </ul>
        </section>
  {/* Documents (Row 5) */}
  <section className="bg-gradient-to-br from-pink-50 to-white rounded-2xl shadow-lg p-3 sm:p-5 overflow-x-hidden text-[13px] sm:text-sm">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-3">
            <svg className="w-7 h-7 text-pink-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 2v4M16 2v4M4 10h16" /></svg>
            <h2 className="text-sm sm:text-lg md:text-xl font-semibold">Documents</h2>
            <select
              className="sm:ml-auto border rounded px-2 py-1 w-full sm:w-auto text-xs sm:text-sm"
              value={selectedCaseId}
              onChange={async (e) => {
                setSelectedCaseId(e.target.value);
                // Fetch documents for this case
                const token = localStorage.getItem("token");
                if (e.target.value) {
                  const res = await fetch(`/api/documents/${e.target.value}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (res.ok) {
                    const docs = await res.json();
                    setDocuments(Array.isArray(docs) ? docs : (docs.documents || []));
                  } else {
                    setDocuments([]);
                  }
                } else {
                  setDocuments([]);
                }
              }}
            >
              <option value="">Select Case</option>
              {cases.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>{c.title}</option>
              ))}
            </select>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
              disabled={!selectedCaseId}
            />
            <button
              className="px-3 sm:px-4 py-2 bg-primary hover:bg-primary/80 focus:ring-2 focus:ring-primary/40 text-white rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-150 disabled:opacity-50 w-full sm:w-auto"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              disabled={!selectedCaseId}
              tabIndex={0}
              aria-label="Upload document"
            >
              + Upload Document
            </button>
          </div>
          <ul className="divide-y divide-pink-100 break-words">
            {documents.length > 0 ? (
              documents.map((d) => (
                <li key={d.id || d._id} className="py-2 flex justify-between items-center gap-2 hover:bg-pink-100 rounded transition cursor-pointer" tabIndex={0}>
                  <span className="font-medium text-pink-900 hover:underline transition max-w-[70%] sm:max-w-none break-words leading-snug">
                    {d.title || d.fileName || d.name || d.filename}
                  </span>
                  <a
                    href={d.url || d.filePath || d.downloadUrl || d.filepath || `#`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline ml-2 hover:text-pink-700 transition whitespace-nowrap text-xs sm:text-sm"
                    tabIndex={0}
                  >
                    View/Download
                  </a>
                </li>
              ))
            ) : (
              <li className="text-gray-400">No documents found.</li>
            )}
          </ul>
        </section>
  {/* Search Lawyers (Row 6) */}
  <section className="bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-lg p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8l-4 1 1.1-3.3A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold">Search Lawyers</h2>
          </div>
            <ul className="divide-y divide-green-100">
            {lawyers.length > 0 ? (
              lawyers.map((l) => (
                <li key={l.id || l._id} className="py-2 flex items-center justify-between hover:bg-green-100 rounded transition" tabIndex={0}>
                  <div>
                    <span className="font-medium text-green-900 hover:underline transition">{l.full_name || l.name}</span>
                    <div className="text-xs text-gray-500">{l.specialization}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connectedLawyerIds.has((l._id || l.id || '').toString()) ? (
                      <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">Connected</span>
                    ) : (
                      isClient ? (
            <button
                          className="px-2 py-1 bg-primary text-white rounded text-xs"
                          onClick={async () => {
              setSelectedLawyer(l);
              setConnectOpen(true);
                          }}
                        >
                          Connect
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Login as client to connect</span>
                      )
                    )}
                  </div>
                </li>
              ))
            ) : (
              <li className="text-gray-400">No lawyers found.</li>
            )}
            </ul>
        </section>
        </div>
        {/* leave space for fixed mobile tab bar */}
        <div className="pb-20 md:pb-0" />
      </main>
      {/* Fixed mobile tab bar */}
      <MobileTabBar />
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
          <button
            className="px-3 py-2 bg-primary text-white rounded"
            onClick={async () => {
              if (!selectedLawyer) return;
              const title = connectTitle.trim();
              const desc = connectDescription.trim();
              if (title.length < 3 || desc.length < 10) {
                setError('Please enter a title (>=3 chars) and description (>=10 chars).');
                return;
              }
              try {
                setConnecting(true);
                const token = localStorage.getItem('token');
                // Backend requires: lawyer_id, title (>=3), description (>=10)
                await CasesAPI.connect({
                  lawyer_id: selectedLawyer._id || selectedLawyer.id,
                  title,
                  description: desc
                }, token);
                // refresh cases
                const refreshed = await CasesAPI.list(token);
                setCases(refreshed.cases || refreshed || []);
                setConnectOpen(false);
                setConnectTitle("");
                setConnectDescription("");
              } catch (err) {
                setError('Failed to connect to lawyer.');
              } finally {
                setConnecting(false);
              }
            }}
            disabled={connecting}
          >
            {connecting ? 'Sending...' : 'Send request'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
};

export default ClientDashboard;
