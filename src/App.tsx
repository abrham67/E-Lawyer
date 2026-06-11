import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";

const JudgeDashboard = lazy(() => import("@/pages/judge/JudgeDashboard"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const CourtDashboard = lazy(() => import("@/pages/court/Dashboard"));
const LawyerDashboard = lazy(() => import("@/pages/lawyer/Dashboard"));
const ClientDashboard = lazy(() => import("@/pages/client/Dashboard"));
const MyLawyer = lazy(() => import("@/pages/client/MyLawyer"));
const NewCase = lazy(() => import("@/pages/cases/new"));
const CasesList = lazy(() => import("@/pages/cases/index"));
const CaseDetail = lazy(() => import("@/pages/cases/[id]"));
const NewMeeting = lazy(() => import("@/pages/calendar/new"));
const MeetingsList = lazy(() => import("@/pages/calendar/index"));
const LawyerDirectory = lazy(() => import("@/pages/clients/index"));
const ClientDirectory = lazy(() => import("@/pages/clients/ClientDirectory"));
const ClientProfile = lazy(() => import("@/pages/clients/[id]"));
const Documents = lazy(() => import("@/pages/documents"));
const Profile = lazy(() => import("@/pages/Profile"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const VideoMeeting = lazy(() => import("@/pages/VideoMeeting"));
const Invite = lazy(() => import("@/pages/Invite"));
const LawyerProfile = lazy(() => import("@/pages/lawyers/[id]"));
const LawyerComparison = lazy(() => import("@/pages/lawyers/compare"));
const ReportsIndex = lazy(() => import("@/pages/reports/index"));
const MessageThread = lazy(() => import("@/pages/messages/[id]"));
const MessagesIndex = lazy(() => import("@/pages/messages/index"));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-muted-foreground">Loading...</div>
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/cases" element={<CasesList />} />
            <Route path="/cases/new" element={<NewCase />} />
            <Route path="/cases/create" element={<NewCase />} />
            <Route path="/cases/:id" element={<CaseDetail />} />
            <Route path="/calendar" element={<MeetingsList />} />
            <Route path="/calendar/new" element={<ProtectedRoute allowedRoles={["court", "admin"]}><NewMeeting /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute allowedRoles={["lawyer", "court", "admin"]}><ClientDirectory /></ProtectedRoute>} />
            <Route path="/lawyers" element={<LawyerDirectory />} />
            <Route path="/lawyers/:id" element={<LawyerProfile />} />
            <Route path="/lawyers/compare" element={<LawyerComparison />} />
            <Route path="/clients/:id" element={<ClientProfile />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/messages" element={<MessagesIndex />} />
            <Route path="/messages/:id" element={<MessageThread />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/meeting/:sessionId" element={<VideoMeeting />} />
            <Route path="/video/room/:roomId" element={<VideoMeeting />} />
            <Route path="/invite/:token" element={<Invite />} />
            <Route path="/reports" element={<ReportsIndex />} />
            <Route path="/judge" element={<JudgeDashboard />} />
            <Route path="/lawyer" element={<LawyerDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/client" element={<ClientDashboard />} />
            <Route path="/my-lawyer" element={<MyLawyer />} />
            <Route path="/court" element={<CourtDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
