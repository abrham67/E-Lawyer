import { BrowserRouter, Routes, Route } from "react-router-dom";
import JudgeDashboard from "@/pages/judge/JudgeDashboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import CourtDashboard from "@/pages/court/Dashboard";
import LawyerDashboard from "@/pages/lawyer/Dashboard";
import ClientDashboard from "@/pages/client/Dashboard";
import MyLawyer from "@/pages/client/MyLawyer";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import NewCase from "@/pages/cases/new";
import CasesList from "@/pages/cases/index";
import CaseDetail from "@/pages/cases/[id]";
import NewMeeting from "@/pages/calendar/new";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import MeetingsList from "@/pages/calendar/index";
import LawyerDirectory from "@/pages/clients/index";
import ClientDirectory from "@/pages/clients/ClientDirectory";
import ClientProfile from "@/pages/clients/[id]";
import Documents from "@/pages/documents";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";
import VideoMeeting from "@/pages/VideoMeeting";
import Invite from "@/pages/Invite";
import LawyerProfile from "@/pages/lawyers/[id]";
import LawyerComparison from "@/pages/lawyers/compare";
import ReportsIndex from "@/pages/reports/index";
import { Toaster } from "@/components/ui/toaster";
import MessageThread from "@/pages/messages/[id]";
import MessagesIndex from "@/pages/messages/index";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
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
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
