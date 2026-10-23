import { Link } from 'react-router-dom';
import {
  FolderOpen, Target, ClipboardList, Globe, ArrowRight, FileText,
  Loader2, BotMessageSquare, GitCompare, Upload,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { PageHeading, Card, Badge, EmptyState } from '../../components/index.js';

const STATS = [
  { key: 'evidence', label: 'Evidence entries', icon: FolderOpen, to: '/evidence', hint: 'Projects, repos, certs you have documented' },
  { key: 'targets', label: 'Job targets', icon: Target, to: '/targets', hint: 'Pasted postings you are working toward' },
  { key: 'confirmedPlans', label: 'Confirmed plans', icon: ClipboardList, to: '/plans', hint: 'Approved preparation plans' },
];

const QUICK = [
  { to: '/evidence', label: 'Add evidence', icon: Upload, text: 'Record a project, repo, or certification with provenance.' },
  { to: '/targets', label: 'Add a job target', icon: Target, text: 'Paste a posting so its requirements can be compared to your record.' },
  { to: '/chat', label: 'Career chat', icon: BotMessageSquare, text: 'Grounded answers over your own documents — with citations.' },
  { to: '/compare', label: 'Compare to requirements', icon: GitCompare, text: 'See supported / partial / missing status per requirement.' },
];

export const Dashboard = () => {
  const { user } = useAuth();
  const stats = user?.stats || { evidence: 0, targets: 0, confirmedPlans: 0 };
  const processing = user?.processingDocs || [];

  return (
    <div>
      <PageHeading
        title={`Welcome, ${user?.name?.split(' ')[0] || 'student'}`}
        subtitle={
          user?.emailVerified === false
            ? 'Verify your email to record evidence and share with mentors.'
            : 'Everything here is backed by your own documented work — the app never invents skills for you.'
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {STATS.map((s) => (
          <Link key={s.key} to={s.to} className="group">
            <Card className="flex h-full flex-col p-5 transition group-hover:shadow-pop">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <s.icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-blue-600" />
              </div>
              <p className="mt-3 text-3xl font-extrabold text-navy">{s.stats ?? stats[s.key] ?? 0}</p>
              <p className="text-sm font-bold text-navy">{s.label}</p>
              <p className="mt-1 text-[11px] text-slate-500">{s.hint}</p>
            </Card>
          </Link>
        ))}
      </div>

      {processing.length > 0 && (
        <Card className="mt-4 p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Documents processing
          </p>
          <ul className="mt-2 space-y-1">
            {processing.map((d) => (
              <li key={d._id} className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">{d._id ? d.status : d.status}</span>
                <Badge tone="amber">{d.status}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-400">
            Resume text and embeddings are being prepared. Screens that need them stay honest until they are ready.
          </p>
        </Card>
      )}

      <h2 className="mb-3 mt-8 text-sm font-extrabold uppercase tracking-wide text-slate-500">Quick actions</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to} className="group">
            <Card className="flex h-full gap-4 p-5 transition group-hover:shadow-pop">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <q.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-navy">
                  {q.label} <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-600" />
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{q.text}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {stats.evidence === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={<FileText className="h-10 w-10" />}
            title="Your evidence library is empty"
            message="Add real projects, repositories, or certifications first — matching, chat, and plans all work from this record."
          />
        </div>
      )}

      {(user?.stats?.evidence ?? 0) > 0 && user?.portfolioPublished === false && (
        <Card className="mt-6 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-navy"><Globe className="h-4 w-4 text-blue-600" /> Your portfolio is not published</p>
          <p className="mt-1 text-xs text-slate-500">Publishing is explicit and reversible at any time.</p>
          <Link to="/portfolio-editor" className="mt-2 inline-block text-xs font-bold text-blue-600 hover:underline">Open portfolio editor →</Link>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
