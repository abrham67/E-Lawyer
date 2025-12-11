import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { CasesAPI, CourtSessionsAPI } from "@/lib/api";
import VideoConference from "@/components/VideoConference";

const JudgeDashboard = () => {
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
        setError(err.message || "Failed to load dashboard data");
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">Loading dashboard...</div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 text-red-500">Error: {error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main-dashboard-section" className="container mx-auto px-4 py-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-primary">Judge Dashboard</h1>
        <div className="mb-6">
        <h2 className="text-lg font-semibold">Court Sessions</h2>
        <ul>
          {sessions.map(s => (
            <li key={s.id || s._id} className="mb-2 border-b pb-2 flex justify-between items-center">
              <div>
                <strong>Date:</strong> {s.scheduleDate || 'N/A'}<br />
                <strong>Case:</strong> {s.caseId}<br />
                <strong>Location:</strong> {s.location || 'N/A'}<br />
                <strong>Judge:</strong> {s.judgeId || 'N/A'}
              </div>
              <button
                className="ml-2 px-3 py-1 bg-green-600 text-white rounded"
                onClick={() => setVideoRoom(s.id || s._id)}
              >
                Join Video Session
              </button>
            </li>
          ))}
        </ul>
        {sessions.length === 0 && <div>No court sessions found.</div>}
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
              Leave Session
            </button>
          </div>
        )}
        </div>
        <div>
        <h2 className="text-lg font-semibold">Cases</h2>
        <ul>
          {cases.map(c => (
            <li key={c.id || c._id} className="mb-2 border-b pb-2">
              <strong>{c.title}</strong> - {c.description}
              <div>Case Number: {c.caseNumber || 'N/A'}</div>
              <div>Status: {c.status || 'N/A'}</div>
            </li>
          ))}
        </ul>
        {cases.length === 0 && <div>No cases found.</div>}
        </div>
      </main>
    </div>
  );
};
export default JudgeDashboard;
