import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { CasesAPI, CourtSessionsAPI } from "@/lib/api";
import VideoConference from "@/components/VideoConference";
import { useTranslation } from 'react-i18next';

const JudgeDashboard = () => {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoRoom, setVideoRoom] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token") || undefined;
    Promise.all([
      CourtSessionsAPI.list(token),
      CasesAPI.list(token)
    ])
      .then(([sessionsData, casesData]) => {
        setSessions(sessionsData);
        setCases(casesData);
        setLoading(false);
      })
      .catch(err => {
          setError(err.message || t('judge_dashboard.failed_load'));
        setLoading(false);
      });
        }, [t]);

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">{t('judge_dashboard.loading')}</div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 text-red-500">{t('judge_dashboard.error')}: {error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main-dashboard-section" className="container mx-auto px-4 py-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-primary">{t('judge_dashboard.title')}</h1>
        <div className="mb-6">
        <h2 className="text-lg font-semibold">{t('judge_dashboard.court_sessions')}</h2>
        <ul>
          {sessions.map(s => (
            <li key={s.id || s._id} className="mb-2 border-b pb-2 flex justify-between items-center">
              <div>
                <strong>{t('judge_dashboard.date')}:</strong> {s.scheduleDate || t('judge_dashboard.na')}<br />
                <strong>{t('judge_dashboard.case')}:</strong> {s.caseId}<br />
                <strong>{t('judge_dashboard.location')}:</strong> {s.location || t('judge_dashboard.na')}<br />
                <strong>{t('judge_dashboard.judge')}:</strong> {s.judgeId || t('judge_dashboard.na')}
              </div>
              <button
                className="ml-2 px-3 py-1 bg-green-600 text-white rounded"
                onClick={() => setVideoRoom(s.id || s._id)}
              >
                {t('judge_dashboard.join_video_session')}
              </button>
            </li>
          ))}
        </ul>
        {sessions.length === 0 && <div>{t('judge_dashboard.no_sessions')}</div>}
        {videoRoom && (
          <div className="mt-4 p-4 border rounded bg-gray-50">
            <VideoConference
              roomId={videoRoom}
              isRecording={false}
              sharedDoc={null}
              onStopRecording={() => {}}
              onUnshareDocument={() => {}}
            />
              <button className="mt-2 px-3 py-1 bg-red-500 text-white rounded" onClick={() => setVideoRoom(null)}>
              {t('judge_dashboard.leave_session')}
            </button>
          </div>
        )}
        </div>
        <div>
        <h2 className="text-lg font-semibold">{t('judge_dashboard.cases')}</h2>
        <ul>
          {cases.map(c => (
            <li key={c.id || c._id} className="mb-2 border-b pb-2">
              <strong>{c.title}</strong> - {c.description}
              <div>{t('judge_dashboard.case_number')}: {c.caseNumber || t('judge_dashboard.na')}</div>
              <div>{t('judge_dashboard.status')}: {c.status || t('judge_dashboard.na')}</div>
            </li>
          ))}
        </ul>
        {cases.length === 0 && <div>{t('judge_dashboard.no_cases')}</div>}
        </div>
      </main>
    </div>
  );
};
export default JudgeDashboard;
