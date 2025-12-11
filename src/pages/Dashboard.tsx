import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { CasesAPI, ProfilesAPI } from "@/lib/api";
import { useEffect, useState } from "react";
import LiveParticipantsPanel from "@/components/LiveParticipantsPanel";
import MobileTabBar from "@/components/MobileTabBar";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [cases, setCases] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || undefined;
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch cases and profile based on role
        if (
          user?.role === "lawyer" ||
          user?.role === "client" ||
          user?.role === "admin" ||
          user?.role === "court" ||
          user?.role === "judge"
        ) {
          const casesData = await CasesAPI.list(token || undefined);
          setCases(casesData);
        }
        const profiles = await ProfilesAPI.list(token);
        setProfile(profiles[0] || null);
        // Determine if user has an in-progress virtual court session and keep its id for live participants
        try {
          const res = await fetch('/api/courtsessions', { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
          if (res.ok) {
            const list = await res.json();
            const inProg = Array.isArray(list) ? list.find((s) => String(s.status || '').toLowerCase() === 'in_progress' && s.is_virtual) : null;
            setActiveSessionId(inProg ? (inProg.id || inProg._id) : null);
          }
        } catch {}
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchData();
  }, [user]);

  if (authLoading || loading) return <div className="p-8">Loading...</div>;

  // Redirect to role dashboard if not on it
  if (user?.role && window.location.pathname === "/") {
    let dashboardRoute = "/";
    switch (user.role) {
      case "judge":
        dashboardRoute = "/judge";
        break;
      case "lawyer":
        dashboardRoute = "/lawyer";
        break;
      case "admin":
        dashboardRoute = "/admin";
        break;
      case "client":
        dashboardRoute = "/client";
        break;
      case "court":
        dashboardRoute = "/court";
        break;
      default:
        dashboardRoute = "/";
    }
    if (dashboardRoute !== "/") {
      navigate(dashboardRoute, { replace: true });
      return null;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div id="main-dashboard-section" className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          Welcome,{" "}
          {user?.full_name || user?.username || "User"}{" "}
          <span className="text-base font-normal text-gray-500">
            ({user?.role})
          </span>
        </h1>
        <button
          onClick={signOut}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
        {/* Role-aware navigation cards */}
        {user?.role === "lawyer" && (
          <>
            <DashboardCard
              title="My Cases"
              onClick={() => navigate("/cases")}
            />
            <DashboardCard
              title="Court Sessions"
              onClick={() => navigate("/calendar")}
            />
            <DashboardCard
              title="Documents"
              onClick={() => navigate("/documents")}
            />
            <DashboardCard
              title="Profile"
              onClick={() => navigate("/profile")}
            />
          </>
        )}
        {user?.role === "client" && (
          <>
            <DashboardCard
              title="Search Lawyers"
              onClick={() => navigate("/lawyers")}
            />
            <DashboardCard
              title="My Cases"
              onClick={() => navigate("/cases")}
            />
            <DashboardCard
              title="Documents"
              onClick={() => navigate("/documents")}
            />
            <DashboardCard
              title="Profile"
              onClick={() => navigate("/profile")}
            />
          </>
        )}
        {user?.role === "judge" && (
          <>
            <DashboardCard
              title="Court Sessions"
              onClick={() => navigate("/calendar")}
            />
            <DashboardCard
              title="Case Files"
              onClick={() => navigate("/cases")}
            />
            <DashboardCard
              title="Rulings"
              onClick={() => navigate("/reports")}
            />
            <DashboardCard
              title="Profile"
              onClick={() => navigate("/profile")}
            />
          </>
        )}
        {user?.role === "admin" && (
          <>
            <DashboardCard
              title="User Management"
              onClick={() => navigate("/admin")}
            />
            <DashboardCard
              title="Court Schedules"
              onClick={() => navigate("/calendar")}
            />
            <DashboardCard
              title="Reports"
              onClick={() => navigate("/reports")}
            />
            <DashboardCard
              title="System Settings"
              onClick={() => navigate("/profile")}
            />
          </>
        )}
        {/* Court users get admin rights; expose Admin entry */}
        {user?.role === "court" && (
          <>
            <DashboardCard
              title="Admin"
              onClick={() => navigate("/admin")}
            />
          </>
        )}
        {user?.role === "court" && (
          <>
            <DashboardCard
              title="Sessions"
              onClick={() => navigate("/court")}
            />
            <DashboardCard
              title="Case Management"
              onClick={() => navigate("/cases")}
            />
            <DashboardCard
              title="Reports"
              onClick={() => navigate("/reports")}
            />
            <DashboardCard
              title="Profile"
              onClick={() => navigate("/profile")}
            />
          </>
        )}
      </div>
      {/* Optionally, show a summary or quick stats here */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Profile</h2>
        {profile ? (
          <div className="border p-4 rounded bg-gray-50">
            <div>
              <strong>Name:</strong> {profile.details || profile.full_name || profile.name}
            </div>
            <div>
              <strong>Bar Number:</strong> {profile.barNumber || profile.bar_number || "N/A"}
            </div>
            <div>
              <strong>Specialization:</strong> {profile.specialization || "N/A"}
            </div>
            <div>
              <strong>Rating:</strong> {profile.rating || "N/A"}
            </div>
            <div>
              <strong>Reviews:</strong> {profile.reviews ? profile.reviews.length : "N/A"}
            </div>
          </div>
        ) : (
          <div>No profile found.</div>
        )}
      </div>
      {activeSessionId && (
        <div className="mb-6">
          <LiveParticipantsPanel sessionId={activeSessionId} />
        </div>
      )}
      <div className="pb-20 md:pb-0">{/* leave space for mobile tab bar */}
        <h2 className="text-lg font-semibold">Cases</h2>
        <ul>
          {cases.map((c) => (
            <li key={c.id || c._id} className="mb-2 border-b pb-2">
              <strong>{c.title}</strong> - {c.description}
              <div>Case Number: {c.caseNumber || "N/A"}</div>
              <div>Status: {c.status || "N/A"}</div>
            </li>
          ))}
        </ul>
        {cases.length === 0 && <div>No cases found.</div>}
      </div>
    </div>
    {/* Fixed mobile tab bar */}
    <MobileTabBar />
    </div>
  );
};

function DashboardCard({
  title,
  onClick,
}: {
  title: string;
  onClick: () => void;
}) {
  return (
    <div
      className="border rounded shadow hover:shadow-lg transition cursor-pointer p-6 bg-white"
      onClick={onClick}
    >
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <div className="text-gray-500">Go to {title}</div>
    </div>
  );
}

export default Dashboard;
