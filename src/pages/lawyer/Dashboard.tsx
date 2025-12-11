import React, { useEffect, useRef, useState } from "react";
// Custom Modal (no external dependencies)
import Navbar from "@/components/Navbar";
import Chat from "@/components/Chat";
import { useAuth } from "@/hooks/useAuth";
import VideoConference from "@/components/VideoConference";
import MobileTabBar from "@/components/MobileTabBar";

const LawyerDashboard = () => {
  const [cases, setCases] = useState([]);
  const [rawCases, setRawCases] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [videoRoom, setVideoRoom] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sharedDoc, setSharedDoc] = useState(null);
  const [openCaseModal, setOpenCaseModal] = useState(false);
  const [newCase, setNewCase] = useState({ title: "", description: "", clientId: "", courtId: "", case_type: "", practice_area: "" });
  const [caseLoading, setCaseLoading] = useState(false);
  const [courts, setCourts] = useState<any[]>([]);
  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const [recipient, setRecipient] = useState(null); // Placeholder for selected client
  const [error, setError] = useState("");

  // Handle create case
  const handleCreateCase = async (e) => {
    e.preventDefault();
    setCaseLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newCase.title,
          description: newCase.description,
          clientId: newCase.clientId,
          courtId: newCase.courtId,
          case_type: newCase.case_type,
          practice_area: newCase.practice_area,
        })
      });
      if (res.ok) {
        const created = await res.json();
        setCases(prev => [...prev, created]);
        setOpenCaseModal(false);
        setNewCase({ title: "", description: "", clientId: "", courtId: "", case_type: "", practice_area: "" });
      } else {
        setError("Failed to create case.");
      }
    } catch {
      setError("Failed to create case.");
    }
    setCaseLoading(false);
  };

  // Handle file upload for documents
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedCaseId) return;
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/documents/${selectedCaseId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const doc = await res.json();
        setDocuments(prev => [...prev, doc]);
      } else {
        setError("Failed to upload document.");
      }
    } catch {
      setError("Failed to upload document.");
    }
    // Reset file input value so the same file can be uploaded again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    // Fetch profile
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setProfile(data.user || null))
      .catch(() => setError("Failed to load profile."));
    // Fetch cases
    fetch("/api/cases", { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      .then((res) => res.json())
      .then((data) => setRawCases(data.cases || []))
      .catch(() => setError("Failed to load cases."));
    // Fetch sessions (API returns an array directly); defaults to lawyer's sessions for lawyer role
    fetch("/api/courtsessions", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setSessions(Array.isArray(data) ? data : (data.sessions || data || [])))
      .catch(() => setError("Failed to load court sessions."));
    // Fetch messages
    fetch("/api/communication", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setMessages(data.messages || []));
    // Fetch calendar
    fetch("/api/calendar", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setCalendar(data.events || []));
    // Fetch documents
    fetch("/api/documents", { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      .then((res) => res.json())
      .then((data) => setDocuments(data.documents || []));
    // Fetch courts list for case creation
    fetch('/api/users?role=court')
      .then(res => res.json())
      .then((data) => setCourts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // When profile (lawyer) is available, filter rawCases to only the lawyer's cases and sort them.
  useEffect(() => {
    if (!profile) {
      // If no profile yet, show raw cases
      setCases(rawCases);
      return;
    }
    const role = String(profile.role || '').toLowerCase();
    if (role === 'lawyer') {
      const myId = String(profile.id || profile._id || profile.userId || profile.uid || '');
      const filtered = rawCases.filter((c: any) => {
        const lid = String(c.lawyer_id || c.lawyerId || (c.lawyer && (c.lawyer._id || c.lawyer.id)) || '');
        return lid === myId;
      });

      // Sort by status (Open first) then by created date (newest first)
      const statusOrder = ['Open', 'In Progress', 'Awaiting Judgment', 'Closed'];
      const sorted = filtered.sort((a: any, b: any) => {
        const sa = statusOrder.indexOf(a.status || '');
        const sb = statusOrder.indexOf(b.status || '');
        if (sa !== sb) return sa - sb;
        const da = new Date(a.createdAt || a.created_at || 0).getTime() || 0;
        const db = new Date(b.createdAt || b.created_at || 0).getTime() || 0;
        return db - da;
      });
      setCases(sorted);
    } else {
      // Non-lawyer roles see all cases as before
      setCases(rawCases);
    }
  }, [rawCases, profile]);

  return (
    <>
      <Navbar />
      {/* Mobile-only heading to match client format */}
      <div className="md:hidden container mx-auto px-4 pt-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 text-primary">Lawyer Dashboard</h1>
      </div>
      <div className="flex justify-end p-2">
        <button
          className="px-4 py-2 bg-red-600 text-white rounded font-semibold shadow"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
  <main id="main-dashboard-section" className="container mx-auto px-4 py-6 overflow-x-hidden">
        {/* Single-column, one section per row */}
        <div className="flex flex-col gap-4">
          {/* Profile Section */}
          <section className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4" aria-labelledby="profile-heading">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 text-2xl font-bold mr-2">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </span>
                <h2 id="profile-heading" className="text-base sm:text-lg md:text-xl font-semibold" tabIndex={0}>Profile</h2>
                <a href="/docs/lawyer-manual.md" target="_blank" aria-label="Help: Profile" className="ml-2 text-blue-600 text-lg" tabIndex={0} title="Help">?</a>
              </div>
              <button
                className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow"
                onClick={() => window.location.href = '/lawyer/profile'}
              >
                Edit Profile
              </button>
            </div>
            {profile ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700">
                <div><span className="font-semibold">Name:</span> {profile.full_name || profile.fullName}</div>
                <div><span className="font-semibold">Email:</span> {profile.email}</div>
                <div><span className="font-semibold">Specialization:</span> {profile.specialization}</div>
                <div><span className="font-semibold">Bar Number:</span> {profile.bar_number || profile.barNumber}</div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400 animate-pulse"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h.01M16 12h.01M12 16h.01" /></svg> Loading profile...</div>
            )}
          </section>
          {/* Messaging */}
          <section className="bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4" aria-labelledby="chat-heading">
            <div className="flex items-center mb-4 gap-2">
              <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8l-4 1 1.1-3.3A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <h2 id="chat-heading" className="text-base sm:text-lg md:text-xl font-semibold" tabIndex={0}>Real-Time Chat</h2>
              <a href="/docs/lawyer-manual.md#communicating-with-clients" target="_blank" aria-label="Help: Chat" className="ml-2 text-blue-600 text-lg" tabIndex={0} title="Help">?</a>
            </div>
            {/* TODO: Add recipient selection UI */}
            {user && user.id ? (
              <Chat user={user} recipient={recipient || { id: "demo-client", full_name: "Demo Client" }} />
            ) : (
              <div className="text-gray-400">Loading chat...</div>
            )}
          </section>
          {/* Case List */}
          <section className="bg-gradient-to-br from-purple-50 to-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4" aria-labelledby="cases-heading">
            <div className="flex items-center mb-4 gap-2">
              <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 3v4M8 3v4" /></svg>
              <h2 id="cases-heading" className="text-base sm:text-lg md:text-xl font-semibold" tabIndex={0}>My Cases</h2>
              <a href="/docs/lawyer-manual.md#managing-cases" target="_blank" aria-label="Help: Cases" className="ml-2 text-blue-600 text-lg" tabIndex={0} title="Help">?</a>
              <button
                className="ml-auto px-4 py-1 bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-300 text-white rounded-lg text-sm font-semibold shadow transition-all duration-150"
                onClick={() => setOpenCaseModal(true)}
                tabIndex={0}
                aria-label="Create new case"
              >
                + Create Case
              </button>
            </div>
            <div className="overflow-x-hidden">
              <table className="w-full table-fixed text-left rounded-lg">
                <thead className="bg-purple-100">
                  <tr>
                    <th className="py-2 px-2 sm:px-3 font-semibold w-[45%] break-words">Title</th>
                    <th className="py-2 px-2 sm:px-3 font-semibold w-[25%]">Status</th>
                    <th className="py-2 px-2 sm:px-3 font-semibold hidden md:table-cell">Progress</th>
                    <th className="py-2 px-2 sm:px-3 font-semibold hidden md:table-cell">Next Session</th>
                    {false && <th className="py-2 px-3 font-semibold">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {cases.length > 0 ? (
                    cases.map((c, idx) => {
                      // Canonical backend statuses
                      const statusOptions = ['active', 'closed', 'rejected'] as const;
                      const statusLabels: Record<string, string> = { active: 'Active', closed: 'Closed', rejected: 'Rejected' };
                      const currentStatus = String(c.status || '').toLowerCase();
                      const sIndex = Math.max(0, statusOptions.indexOf(currentStatus as any));
                      const progress = (() => {
                        switch (currentStatus) {
                          case 'active': return 75;
                          case 'closed':
                          case 'rejected': return 100;
                          default: return 0;
                        }
                      })();
                      return (
                        <tr key={c.id || c._id} className="border-b last:border-b-0 hover:bg-purple-50 transition text-sm sm:text-base">
                          <td className="py-2 px-2 sm:px-3 font-medium text-purple-900 hover:underline cursor-pointer transition break-words" tabIndex={0}>{c.title}</td>
                          <td className="py-2 px-2 sm:px-3">
                            <select
                              aria-label="Change case status"
                              value={currentStatus}
                              onChange={async (e) => {
                                const newStatus = String(e.target.value).toLowerCase();
                                const token = localStorage.getItem("token");
                                const res = await fetch(`/api/cases/${encodeURIComponent(c.id || c._id)}/status`, {
                                  method: "PATCH",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`
                                  },
                                  body: JSON.stringify({ status: newStatus })
                                });
                                if (res.ok) {
                                  setCases(prev => prev.map((cc, i) => i === idx ? { ...cc, status: newStatus } : cc));
                                } else {
                                  setError('Failed to update status');
                                }
                              }}
                              className="border rounded px-2 py-1 bg-white focus:border-purple-400 hover:bg-purple-50 transition"
                            >
                              {statusOptions.map((s) => (
                                <option key={s} value={s}>{statusLabels[s]}</option>
                              ))}
                            </select>
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
                          <td className="py-2 px-2 sm:px-3 hidden md:table-cell">{c.nextSession || c.next_session || "-"}</td>
                          {false && (
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <button className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-sm disabled:opacity-60">Close</button>
                                <button className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm">Delete</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-400 py-4">{profile && String(profile.role || '').toLowerCase() === 'lawyer' ? 'No open cases.' : 'No cases found.'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          {/* Create Case Modal (custom, no external dependencies) */}
          {openCaseModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-all">
              <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg relative animate-fadeIn">
                <button
                  className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-2xl font-bold focus:outline-none"
                  onClick={() => setOpenCaseModal(false)}
                  aria-label="Close"
                  tabIndex={0}
                >
                  ×
                </button>
                <h2 className="text-2xl font-bold mb-4 text-center text-primary">Create New Case</h2>
                <form onSubmit={handleCreateCase} className="space-y-4">
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      className="border-2 border-primary/30 focus:border-primary rounded-lg px-3 py-2 w-full transition-all focus:outline-none"
                      required
                      value={newCase.title}
                      onChange={e => setNewCase({ ...newCase, title: e.target.value })}
                      placeholder="Enter case title"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Description</label>
                    <textarea
                      className="border-2 border-primary/30 focus:border-primary rounded-lg px-3 py-2 w-full transition-all focus:outline-none resize-vertical min-h-[60px]"
                      required
                      value={newCase.description}
                      onChange={e => setNewCase({ ...newCase, description: e.target.value })}
                      placeholder="Describe the case"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Client ID</label>
                    <input
                      type="text"
                      className="border-2 border-primary/30 focus:border-primary rounded-lg px-3 py-2 w-full transition-all focus:outline-none"
                      required
                      value={newCase.clientId}
                      onChange={e => setNewCase({ ...newCase, clientId: e.target.value })}
                      placeholder="Enter client ID"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Assign Court</label>
                    <select
                      className="border-2 border-primary/30 focus:border-primary rounded-lg px-3 py-2 w-full transition-all focus:outline-none"
                      required
                      value={newCase.courtId}
                      onChange={e => setNewCase({ ...newCase, courtId: e.target.value })}
                    >
                      <option value="">Select court</option>
                      {courts.map((ct: any) => (
                        <option key={ct.id || ct._id} value={ct.id || ct._id}>
                          {ct.full_name || ct.court_name || ct.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 font-medium text-gray-700">Case Type</label>
                      <input
                        type="text"
                        className="border-2 border-primary/30 focus:border-primary rounded-lg px-3 py-2 w-full transition-all focus:outline-none"
                        value={newCase.case_type}
                        onChange={e => setNewCase({ ...newCase, case_type: e.target.value })}
                        placeholder="e.g., Civil, Criminal"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-medium text-gray-700">Practice Area</label>
                      <input
                        type="text"
                        className="border-2 border-primary/30 focus:border-primary rounded-lg px-3 py-2 w-full transition-all focus:outline-none"
                        value={newCase.practice_area}
                        onChange={e => setNewCase({ ...newCase, practice_area: e.target.value })}
                        placeholder="e.g., Family, Corporate"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all"
                      onClick={() => setOpenCaseModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all"
                      disabled={caseLoading}
                    >
                      {caseLoading ? 'Creating...' : 'Create Case'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Calendar */}
          <section className="bg-gradient-to-br from-cyan-50 to-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4" aria-labelledby="calendar-heading">
            <div className="flex items-center mb-4 gap-2">
              <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 3v4M8 3v4" /></svg>
              <h2 id="calendar-heading" className="text-base sm:text-lg md:text-xl font-semibold" tabIndex={0}>Calendar</h2>
              <a href="/docs/lawyer-manual.md#dashboard-overview" target="_blank" aria-label="Help: Calendar" className="ml-2 text-blue-600 text-lg" tabIndex={0} title="Help">?</a>
              {/* Lawyers should not schedule sessions; button removed for this role */}
            </div>
            <ul className="divide-y divide-cyan-100">
              {calendar.length > 0 ? (
                calendar.map((ev) => (
                  <li key={ev.id || ev._id} className="py-2 flex items-center justify-between hover:bg-cyan-100 rounded transition cursor-pointer" tabIndex={0}>
                    <span className="font-medium text-cyan-700">{ev.event}</span>
                    <span className="ml-2 text-xs text-gray-400">{ev.date}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-400">No calendar events.</li>
              )}
            </ul>
          </section>
          {/* Virtual Court Sessions */}
          <section className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4" aria-labelledby="sessions-heading">
            <div className="flex items-center mb-4 gap-2">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 3v4M8 3v4" /><circle cx="12" cy="14" r="3" /></svg>
              <h2 id="sessions-heading" className="text-base sm:text-lg md:text-xl font-semibold" tabIndex={0}>Upcoming Virtual Court Sessions</h2>
              <a href="/docs/lawyer-manual.md#attending-virtual-court-sessions" target="_blank" aria-label="Help: Virtual Court Sessions" className="ml-2 text-blue-600 text-lg" tabIndex={0} title="Help">?</a>
            </div>
            <ul className="divide-y divide-blue-100">
              {sessions.length > 0 ? (
                sessions.filter((s: any) => {
                  const isScheduled = String(s.status || '').toLowerCase() === 'scheduled';
                  const isFuture = s.scheduled_date ? new Date(s.scheduled_date) > new Date() : true;
                  return isScheduled && isFuture;
                }).map((s: any) => (
                  <li
                    key={s.id || s._id}
                    className={`py-2 flex justify-between items-center transition ${selectedSession && selectedSession.id === (s.id || s._id) ? 'bg-blue-100' : ''}`}
                    onClick={() => setSelectedSession(s)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span>
                      <span className="font-semibold text-blue-800">{s.case?.title || 'Court Session'}</span>{' '}
                      <span className="ml-2 text-xs text-gray-400">{s.scheduled_date ? new Date(s.scheduled_date).toLocaleString() : (s.date || '')}</span>
                      {s.is_virtual && <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-blue-200 text-blue-800">VIRTUAL</span>}
                      {selectedSession && selectedSession.id === (s.id || s._id) && (
                        <span className="ml-2 text-xs text-blue-600">Selected</span>
                      )}
                    </span>
                    {String(s.status || '').toLowerCase() !== 'completed' && String(s.status || '').toLowerCase() !== 'cancelled' && (
                      <button
                        className="ml-2 px-4 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold shadow"
                        onClick={e => {
                          e.stopPropagation();
                          // Prefer navigating to the unified meeting page when virtual
                          const sid = s.id || s._id;
                          if (s.is_virtual) {
                            // Prefer invite link if provided by backend shape
                            const invite = (s as any).invite_token ? `/invite/${(s as any).invite_token}` : undefined;
                            const link = invite || s.virtual_meeting_link || `/meeting/${sid}`;
                            window.location.href = link.startsWith('/meeting') || link.startsWith('/invite') ? link : `/meeting/${sid}`;
                          } else {
                            setVideoRoom(sid);
                            setSelectedSession(s);
                          }
                        }}
                      >
                        Join Video Session
                      </button>
                    )}
                  </li>
                ))
              ) : (
                <li className="text-gray-400">No sessions scheduled.</li>
              )}
            </ul>
            {/* For physical sessions or legacy mode, we still show the embedded component */}
            {videoRoom && selectedSession && !selectedSession.is_virtual && (
              <div className="mt-4 p-4 border rounded-xl bg-blue-50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
                  <div>
                    <span className="font-semibold">Session:</span> {selectedSession.case?.title || 'Court Session'} <span className="ml-2 text-xs text-gray-400">{selectedSession.scheduled_date ? new Date(selectedSession.scheduled_date).toLocaleString() : (selectedSession.date || '')}</span>
                  </div>
                  <div className="flex gap-2 mt-2 md:mt-0">
                    <button
                      className={`px-3 py-1 rounded ${isRecording ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                      onClick={() => setIsRecording(r => !r)}
                    >
                      {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </button>
                    <label className="px-3 py-1 bg-blue-200 text-blue-800 rounded cursor-pointer">
                      Share Document
                      <input
                        type="file"
                        style={{ display: 'none' }}
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setSharedDoc(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                    {sharedDoc && (
                      <span className="text-xs text-green-700">{sharedDoc.name} shared</span>
                    )}
                  </div>
                </div>
                <VideoConference
                  roomId={videoRoom}
                  isRecording={isRecording}
                  sharedDoc={sharedDoc}
                  onStopRecording={() => setIsRecording(false)}
                  onUnshareDocument={() => setSharedDoc(null)}
                />
                <button className="mt-2 px-3 py-1 bg-red-500 text-white rounded" onClick={() => { setVideoRoom(null); setSelectedSession(null); setIsRecording(false); setSharedDoc(null); }}>
                  Leave Session
                </button>
              </div>
            )}
          </section>
          {/* Documents Upload & List */}
          <section className="bg-gradient-to-br from-pink-50 to-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4" aria-labelledby="documents-heading">
            <div className="flex items-center mb-4 gap-2">
              <svg className="w-7 h-7 text-pink-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 2v4M16 2v4M4 10h16" /></svg>
              <h2 id="documents-heading" className="text-base sm:text-lg md:text-xl font-semibold" tabIndex={0}>Documents</h2>
              <a href="/docs/lawyer-manual.md#uploading-and-sharing-documents" target="_blank" aria-label="Help: Documents" className="ml-2 text-blue-600 text-lg" tabIndex={0} title="Help">?</a>
              <select
                className="ml-auto border rounded px-2 py-1 text-sm"
                value={selectedCaseId}
                onChange={async (e) => {
                  setSelectedCaseId(e.target.value);
                  // Load docs for this case if selected
                  const token = localStorage.getItem('token');
                  if (e.target.value) {
                    const res = await fetch(`/api/documents/${e.target.value}`, { headers: { Authorization: `Bearer ${token}` } });
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
                {cases.map((c: any) => (
                  <option key={c.id || c._id} value={c.id || c._id}>{c.title}</option>
                ))}
              </select>
              <button
                className="ml-auto px-4 py-1 bg-primary hover:bg-primary/80 focus:ring-2 focus:ring-primary/40 text-white rounded-lg text-sm font-semibold shadow transition-all duration-150"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                aria-label="Open file dialog to upload document"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current && fileInputRef.current.click(); }}
              >
                + Upload Document
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>
            <ul className="divide-y divide-pink-100">
              {documents.length > 0 ? (
                documents.map((d, idx) => (
                  <li key={d.id || d._id} className="py-2 flex justify-between items-center hover:bg-pink-100 rounded transition cursor-pointer" tabIndex={0}>
                    <span className="font-medium text-pink-900">{d.title || d.fileName || d.name}</span>
                    <div className="flex items-center space-x-2">
                      <a
                        href={d.url || d.filepath || d.filePath || d.downloadUrl || `#`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:text-pink-700 transition"
                        tabIndex={0}
                      >
                        View/Download
                      </a>
                      <button
                        className="text-blue-600 underline text-xs hover:text-blue-800 focus:underline focus:text-blue-800 transition"
                        onClick={() => {
                          const newTitle = prompt("Rename document:", d.title || d.fileName || d.name);
                          if (newTitle && newTitle !== (d.title || d.fileName || d.name)) {
                            const token = localStorage.getItem("token");
                            fetch(`/api/documents/${d.id || d._id}`, {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`
                              },
                              body: JSON.stringify({ title: newTitle })
                            })
                              .then(res => res.json())
                              .then(updated => {
                                setDocuments(prev => prev.map((doc, i) => i === idx ? { ...doc, title: updated.title } : doc));
                              });
                          }
                        }}
                        tabIndex={0}
                      >Edit</button>
                      <button
                        className="text-red-600 underline text-xs hover:text-red-800 focus:underline focus:text-red-800 transition"
                        onClick={() => {
                          if (window.confirm("Delete this document?")) {
                            const token = localStorage.getItem("token");
                            fetch(`/api/documents/${d.id || d._id}`, {
                              method: "DELETE",
                              headers: { Authorization: `Bearer ${token}` }
                            })
                              .then(res => {
                                if (res.ok) setDocuments(prev => prev.filter((doc, i) => i !== idx));
                              });
                          }
                        }}
                        tabIndex={0}
                      >Delete</button>
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-gray-400">No documents found.</li>
              )}
            </ul>
          </section>
        </div>
      </main>
      {/* leave space for fixed mobile tab bar */}
      <div className="pb-20 md:pb-0" />
      {/* Fixed mobile tab bar */}
      <MobileTabBar />
    </>
  );
};

export default LawyerDashboard;
