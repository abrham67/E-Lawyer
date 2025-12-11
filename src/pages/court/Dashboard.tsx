import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import MobileTabBar from "@/components/MobileTabBar";
import { useAuth } from "@/hooks/useAuth";
import VideoConference from "@/components/VideoConference";

const CourtDashboard = () => {
  const { user, loading } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activity, setActivity] = useState(null);
  const [videoRoom, setVideoRoom] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Fetch court sessions
    fetch("/api/courtsessions", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setSessions(Array.isArray(data) ? data : (data.sessions || data || [])))
      .catch(() => setError("Failed to load court sessions."));

    // Fetch monthly activity (if implemented)
    fetch("/api/activity/monthly", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setActivity(data.activity || null))
      .catch(() => setError("Failed to load activity."));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
  <main id="main-dashboard-section" className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 md:pb-6">
    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-primary">Court Dashboard</h1>
  {/* Single-column, one section per row */}
  <div className="flex flex-col gap-4">
          {/* Profile Quick View */}
          <section className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h.01M16 12h.01M12 16h.01" /></svg>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">Profile</h2>
            </div>
            {user ? (
              <div className="grid grid-cols-1 gap-2 text-gray-700">
                <div><span className="font-semibold">Name:</span> {user.full_name || user.fullName}</div>
                <div><span className="font-semibold">Email:</span> {user.email}</div>
                <div><span className="font-semibold">Court Name:</span> {user.court_name}</div>
                <div><span className="font-semibold">Jurisdiction:</span> {user.jurisdiction}</div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400 animate-pulse"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h.01M16 12h.01M12 16h.01" /></svg> Loading profile...</div>
            )}
          </section>
          {/* Activity */}
          <section className="bg-gradient-to-br from-yellow-50 to-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">Monthly Activity</h2>
            </div>
            {activity ? (
              <div>Activity chart will be displayed here</div>
            ) : (
              <p className="text-gray-400">No activity data.</p>
            )}
          </section>
        </div>
        {/* Upcoming Sessions */}
        <section className="bg-gradient-to-br from-purple-50 to-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 3v4M8 3v4" /></svg>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold">Upcoming Sessions</h2>
          </div>
          <ul className="divide-y divide-purple-100">
            {(() => {
              const futureSessions = (sessions || []).filter((s: any) => {
                const isScheduled = String(s.status || '').toLowerCase() === 'scheduled';
                const isFuture = s.scheduled_date ? new Date(s.scheduled_date) > new Date() : true;
                return isScheduled && isFuture;
              });
              return futureSessions.length > 0 ? (
              futureSessions.map((s: any) => (
                <li key={s._id || s.id} className="py-2 flex justify-between items-center hover:bg-purple-100 rounded transition cursor-pointer" tabIndex={0}>
                  <span>
                    <span className="font-medium text-purple-900">{s.case?.title || 'Court Session'}</span>
                    <span className="ml-2 text-xs text-gray-400">{s.scheduled_date ? new Date(s.scheduled_date).toLocaleString() : (s.date || '')}</span>
                    {s.is_virtual && <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-blue-200 text-blue-800">VIRTUAL</span>}
                    <div className="mt-1 text-xs text-gray-600 flex gap-4 flex-wrap">
                      <span>{s.case?.case_type || 'No case type'}</span>
                      <span>{s.case?.client?.full_name || 'No client assigned'}</span>
                      <span>{s.case?.practice_area || 'No practice area'}</span>
                    </div>
                  </span>
                  {String(s.status || '').toLowerCase() !== 'completed' && String(s.status || '').toLowerCase() !== 'cancelled' && (
                    <button
                      className="ml-2 px-4 py-1 bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-300 text-white rounded-lg text-sm font-semibold shadow transition-all duration-150"
                      onClick={() => {
                        const sid = s.id || s._id;
                        if (s.is_virtual) {
                          const link = s.virtual_meeting_link || `/meeting/${sid}`;
                          window.location.href = link.startsWith('/meeting') ? link : `/meeting/${sid}`;
                        } else {
                          setVideoRoom(sid);
                        }
                      }}
                      tabIndex={0}
                      aria-label="Join video session"
                    >
                      Join Video Session
                    </button>
                  )}
                </li>
              ))
              ) : (
                <li className="text-gray-400">No upcoming sessions</li>
              )
            })()}
          </ul>
          {videoRoom && (
            <div className="mt-4 p-4 border rounded-xl bg-purple-50">
              <VideoConference
                roomId={videoRoom}
                isRecording={false}
                sharedDoc={null}
                onStopRecording={() => {}}
                onUnshareDocument={() => {}}
              />
              <button className="mt-2 px-3 py-1 bg-red-500 text-white rounded" onClick={() => setVideoRoom(null)}>
                Leave Session
              </button>
            </div>
          )}
        </section>
        {/* Scheduled Sessions */}
  <section className="bg-gradient-to-br from-cyan-50 to-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 3v4M8 3v4" /></svg>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold">Scheduled Sessions</h2>
          </div>
          <p className="text-cyan-700">{(sessions || []).filter((s: any) => String(s.status || '').toLowerCase() === 'scheduled' && (s.scheduled_date ? new Date(s.scheduled_date) > new Date() : true)).length} Upcoming court sessions</p>
        </section>
      </main>
      <MobileTabBar />
    </div>
  );
};

export default CourtDashboard;
