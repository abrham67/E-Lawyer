import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import MobileTabBar from "@/components/MobileTabBar";
import { useAuth } from "@/hooks/useAuth";
import VideoConference from "@/components/VideoConference";
import { useApiClient } from "@/hooks/useApiClient";
import { useTranslation } from 'react-i18next';

const CourtDashboard = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { authedFetch } = useApiClient();
  const [assignedCases, setAssignedCases] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activity, setActivity] = useState(null);
  const [videoRoom, setVideoRoom] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user?.id) return;

    let cancelled = false;
    const load = async () => {
      try {
        const [sessionsRes, activityRes, casesRes] = await Promise.allSettled([
          authedFetch(`/api/courtsessions?court_id=${user.id}`),
          authedFetch('/api/activity/monthly'),
          authedFetch(`/api/cases?court_id=${user.id}`),
        ]);

        if (cancelled) return;

        if (sessionsRes.status === 'fulfilled') {
          const data = sessionsRes.value as any;
          setSessions(Array.isArray(data) ? data : (data.sessions || data || []));
        } else {
          setSessions([]);
          setError(t('court_dashboard.failed_load_sessions'));
        }

        if (activityRes.status === 'fulfilled') {
          const data = activityRes.value as any;
          setActivity(data.activity || null);
        } else {
          setActivity(null);
        }

        if (casesRes.status === 'fulfilled') {
          const data = casesRes.value as any;
          setAssignedCases(Array.isArray(data) ? data : (data.cases || []));
        } else {
          setAssignedCases([]);
        }
      } catch {
        if (!cancelled) setError(t('court_dashboard.failed_load_sessions'));
      }
    };

    load();
    return () => { cancelled = true; };
  }, [t, user?.id, authedFetch]);

      if (loading) return <div>{t('court_dashboard.loading')}</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
  <main id="main-dashboard-section" className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 md:pb-6">
    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-primary">{t('court_dashboard.title')}</h1>
  {/* Single-column, one section per row */}
  <div className="flex flex-col gap-4">
          {/* Profile Quick View */}
          <section className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h.01M16 12h.01M12 16h.01" /></svg>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">{t('court_dashboard.profile')}</h2>
            </div>
            {user ? (
              <div className="grid grid-cols-1 gap-2 text-gray-700">
                <div><span className="font-semibold">{t('court_dashboard.name')}:</span> {user.full_name || user.fullName}</div>
                <div><span className="font-semibold">{t('court_dashboard.email')}:</span> {user.email}</div>
                <div><span className="font-semibold">{t('court_dashboard.court_name')}:</span> {user.court_name}</div>
                <div><span className="font-semibold">{t('court_dashboard.jurisdiction')}:</span> {user.jurisdiction}</div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400 animate-pulse"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h.01M16 12h.01M12 16h.01" /></svg> {t('court_dashboard.loading_profile')}</div>
            )}
          </section>
          {/* Activity */}
          <section className="bg-gradient-to-br from-yellow-50 to-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">{t('court_dashboard.monthly_activity')}</h2>
            </div>
            {activity ? (
              <div>{t('court_dashboard.activity_chart')}</div>
            ) : (
              <p className="text-gray-400">{t('court_dashboard.no_activity')}</p>
            )}
          </section>
          {/* Assigned Cases */}
          <section className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" /></svg>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">{t('court_dashboard.assigned_cases') || 'Assigned Cases'}</h2>
            </div>
            {assignedCases.length > 0 ? (
              <div className="space-y-2">
                {assignedCases.slice(0, 5).map((c: any) => (
                  <div key={c._id || c.id} className="p-3 rounded-xl bg-white border border-emerald-100">
                    <div className="font-medium text-emerald-900">{c.title || c.case_number || 'Case'}</div>
                    <div className="text-xs text-gray-500 mt-1">{c.status || 'open'} • {c.practice_area || c.case_type || ''}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">{t('court_dashboard.no_assigned_cases') || 'No assigned cases found'}</p>
            )}
          </section>
        </div>
        {/* Upcoming Sessions */}
        <section className="bg-gradient-to-br from-purple-50 to-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 3v4M8 3v4" /></svg>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold">{t('court_dashboard.upcoming_sessions')}</h2>
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
                    <span className="font-medium text-purple-900">{s.case?.title || t('court_dashboard.court_session')}</span>
                    <span className="ml-2 text-xs text-gray-400">{s.scheduled_date ? new Date(s.scheduled_date).toLocaleString() : (s.date || '')}</span>
                    {s.is_virtual && <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-blue-200 text-blue-800">{t('court_dashboard.virtual')}</span>}
                    <div className="mt-1 text-xs text-gray-600 flex gap-4 flex-wrap">
                      <span>{s.case?.case_type || t('court_dashboard.no_case_type')}</span>
                      <span>{s.case?.client?.full_name || t('court_dashboard.no_client_assigned')}</span>
                      <span>{s.case?.practice_area || t('court_dashboard.no_practice_area')}</span>
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
                      aria-label={t('court_dashboard.join_video_session')}
                    >
                      {t('court_dashboard.join_video_session')}
                    </button>
                  )}
                </li>
              ))
              ) : (
                <li className="text-gray-400">{t('court_dashboard.no_upcoming_sessions')}</li>
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
                {t('court_dashboard.leave_session')}
              </button>
            </div>
          )}
        </section>
        {/* Scheduled Sessions */}
  <section className="bg-gradient-to-br from-cyan-50 to-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 3v4M8 3v4" /></svg>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold">{t('court_dashboard.scheduled_sessions')}</h2>
          </div>
          <p className="text-cyan-700">{(sessions || []).filter((s: any) => String(s.status || '').toLowerCase() === 'scheduled' && (s.scheduled_date ? new Date(s.scheduled_date) > new Date() : true)).length} {t('court_dashboard.upcoming_court_sessions')}</p>
        </section>
      </main>
      <MobileTabBar />
    </div>
  );
};

export default CourtDashboard;
