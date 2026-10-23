import { BrowserRouter, Routes as Switch, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { Spinner } from './components/index.js';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';

// ----- public pages ---------------------------------------------------------
import { Landing } from './pages/Landing.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { MentorRegister } from './pages/MentorRegister.jsx';
import { VerifyEmail } from './pages/VerifyEmail.jsx';
import { ForgotPassword } from './pages/ForgotPassword.jsx';
import { ResetPassword } from './pages/ResetPassword.jsx';
import { RoleGuides } from './pages/RoleGuides.jsx';
import { PublicPortfolio } from './pages/PublicPortfolio.jsx';

// ----- student pages --------------------------------------------------------
import { Dashboard } from './pages/student/Dashboard.jsx';
import { EvidenceLibrary } from './pages/student/EvidenceLibrary.jsx';
import { EvidenceEditor } from './pages/student/EvidenceEditor.jsx';
import { ResumeReview } from './pages/student/ResumeReview.jsx';
import { JobTargets } from './pages/student/JobTargets.jsx';
import { RequirementComparison } from './pages/student/RequirementComparison.jsx';
import { CareerChat } from './pages/student/CareerChat.jsx';
import { PreparationPlan } from './pages/student/PreparationPlan.jsx';
import { Mentors as StudentMentors } from './pages/student/Mentors.jsx';
import { MentorReviews as StudentMentorReviews } from './pages/student/MentorReviews.jsx';
import { PortfolioEditor } from './pages/student/PortfolioEditor.jsx';
import { AccountSettings } from './pages/student/AccountSettings.jsx';

// ----- mentor pages ---------------------------------------------------------
import { MentorDashboard } from './pages/mentor/MentorDashboard.jsx';
import { MentorInvitations } from './pages/mentor/MentorInvitations.jsx';
import { SharedEvidence } from './pages/mentor/SharedEvidence.jsx';
import { MentorReviews } from './pages/mentor/MentorReviews.jsx';

// ----- admin pages ----------------------------------------------------------
import { AdminDashboard } from './pages/admin/AdminDashboard.jsx';
import { MentorVerification } from './pages/admin/MentorVerification.jsx';
import { AbuseReports } from './pages/admin/AbuseReports.jsx';
import { ContentModeration } from './pages/admin/ContentModeration.jsx';
import { AdminHealth } from './pages/admin/AdminHealth.jsx';
import { AuditEvents } from './pages/admin/AuditEvents.jsx';

// Route guards use the session's own role claim refreshed from /auth/me —
// never a role sent by the client in URL, query or state.
const RequireAuth = ({ children, role }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-surface"><Spinner className="h-8 w-8" /></div>;
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (role && user.role !== role) {
    // Honest redirect: send the user to their own home, never to a foreign role's pages.
    const home = user.role === 'admin' ? '/admin' : user.role === 'mentor' ? '/mentor' : '/dashboard';
    return <Navigate to={home} replace />;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Switch>
        {/* public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/mentor" element={<MentorRegister />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/role-guides" element={<RoleGuides />} />
        <Route path="/portfolio/:slug" element={<PublicPortfolio />} />

        {/* student */}
        <Route
          element={
            <RequireAuth role="student">
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/evidence" element={<EvidenceLibrary />} />
          <Route path="/evidence/new" element={<EvidenceEditor />} />
          <Route path="/evidence/:id" element={<EvidenceEditor />} />
          <Route path="/resumes" element={<ResumeReview />} />
          <Route path="/targets" element={<JobTargets />} />
          <Route path="/compare" element={<RequirementComparison />} />
          <Route path="/chat" element={<CareerChat />} />
          <Route path="/plans" element={<PreparationPlan />} />
          <Route path="/mentors" element={<StudentMentors />} />
          <Route path="/feedback" element={<StudentMentorReviews />} />
          <Route path="/portfolio-editor" element={<PortfolioEditor />} />
          <Route path="/settings" element={<AccountSettings />} />
        </Route>

        {/* mentor */}
        <Route
          element={
            <RequireAuth role="mentor">
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route path="/mentor" element={<MentorDashboard />} />
          <Route path="/mentor/invitations" element={<MentorInvitations />} />
          <Route path="/mentor/shared" element={<SharedEvidence />} />
          <Route path="/mentor/reviews" element={<MentorReviews />} />
        </Route>

        {/* admin */}
        <Route
          element={
            <RequireAuth role="admin">
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/mentors" element={<MentorVerification />} />
          <Route path="/admin/abuse" element={<AbuseReports />} />
          <Route path="/admin/moderation" element={<ContentModeration />} />
          <Route path="/admin/health" element={<AdminHealth />} />
          <Route path="/admin/audit" element={<AuditEvents />} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Switch>
    </BrowserRouter>
  );
}
