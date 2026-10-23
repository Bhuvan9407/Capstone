import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, FolderOpen, FileText, Target, GitCompare, MessageSquare,
  ClipboardList, Users, Star, Globe, Settings, LogOut, Menu, X, GraduationCap,
  ShieldCheck, HeartPulse, ListChecks, BadgeCheck, ScrollText, UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const STUDENT_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/evidence', label: 'Evidence Library', icon: FolderOpen },
  { to: '/resumes', label: 'Resume Review', icon: FileText },
  { to: '/targets', label: 'Job Targets', icon: Target },
  { to: '/compare', label: 'Requirements Compare', icon: GitCompare },
  { to: '/chat', label: 'Career Chat', icon: MessageSquare },
  { to: '/plans', label: 'Preparation Plan', icon: ClipboardList },
  { to: '/mentors', label: 'Mentors', icon: Users },
  { to: '/feedback', label: 'Feedback', icon: Star },
  { to: '/portfolio-editor', label: 'Portfolio', icon: Globe },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const MENTOR_NAV = [
  { to: '/mentor', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/mentor/invitations', label: 'Invitations', icon: UserCheck },
  { to: '/mentor/shared', label: 'Shared Evidence', icon: FolderOpen },
  { to: '/mentor/reviews', label: 'Reviews', icon: Star },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/mentors', label: 'Mentor Verification', icon: BadgeCheck },
  { to: '/admin/abuse', label: 'Abuse Reports', icon: ShieldCheck },
  { to: '/admin/moderation', label: 'Content Moderation', icon: ListChecks },
  { to: '/admin/health', label: 'Service Health', icon: HeartPulse },
  { to: '/admin/audit', label: 'Audit Events', icon: ScrollText },
];

const navFor = (role) =>
  role === 'admin' ? ADMIN_NAV : role === 'mentor' ? MENTOR_NAV : STUDENT_NAV;

const Sidebar = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = navFor(user?.role);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="flex h-full w-64 flex-col bg-navy text-white">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-card">
          <GraduationCap className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-extrabold leading-4">Career Evidence</span>
          <span className="block text-[10px] font-medium text-blue-200">&amp; Portfolio Coach</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Main">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition ${
                isActive ? 'bg-blue-600 text-white shadow-card' : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 px-2">
          <p className="truncate text-[13px] font-bold">{user?.name}</p>
          <p className="truncate text-[11px] text-blue-200">{user?.email}</p>
        </div>
        <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-blue-100 hover:bg-white/10">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
};

const MobileTopbar = ({ onOpen, role }) => (
  <header className="flex items-center justify-between bg-navy px-4 py-3 text-white lg:hidden">
    <span className="text-sm font-extrabold">Career Evidence Coach</span>
    <span className="text-[11px] font-semibold text-blue-200">{role}</span>
    <button onClick={onOpen} aria-label="Open menu" className="rounded-lg p-1.5 hover:bg-white/10">
      <Menu className="h-5 w-5" />
    </button>
  </header>
);

export const DashboardLayout = () => {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface">
      <div className="hidden lg:block fixed inset-y-0 w-64">
        <Sidebar />
      </div>
      <div className="flex min-h-screen w-full flex-col lg:pl-64">
        <MobileTopbar onOpen={() => setMobileOpen(true)} role={user?.role} />
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
        <footer className="px-6 pb-6 pt-2 text-center text-[11px] text-slate-400">
          Career Evidence and Portfolio Coach — every claim in this app is backed by your own documented evidence.
        </footer>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 shadow-pop">
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="absolute -right-10 rounded-lg bg-white/10 p-2 text-white">
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export const blankLayout = (el) => el;
