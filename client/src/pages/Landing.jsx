import { Link } from 'react-router-dom';
import { GraduationCap, FolderOpen, Target, BotMessageSquare, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const Landing = () => {
  const { user } = useAuth();
  const home =
    user?.role === 'admin' ? '/admin' : user?.role === 'mentor' ? '/mentor' : '/dashboard';

  return (
    <div className="min-h-screen bg-surface">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-card"><GraduationCap className="h-5 w-5" /></span>
          <span className="text-sm font-extrabold text-navy">Career Evidence and Portfolio Coach</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/role-guides" className="text-sm font-semibold text-slate-600 hover:text-navy">Role guides</Link>
          {user ? (
            <Link to={home} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-card hover:bg-blue-700">Open app</Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-navy">Sign in</Link>
              <Link to="/register" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-card hover:bg-blue-700">Get started</Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="grid items-center gap-10 py-10 lg:grid-cols-2 lg:py-16">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Student career platform</p>
            <h1 className="text-4xl font-extrabold leading-tight text-navy sm:text-5xl">
              Your projects. <span className="text-blue-600">Your evidence.</span> Your career.
            </h1>
            <p className="mt-4 max-w-lg text-base text-slate-600">
              This app never invents your skills or achievements. It organizes the evidence you already have,
              shows exactly what an internship requires, and builds your preparation plan from real gaps in your
              documented projects.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-card hover:bg-blue-700">
                Create student account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/role-guides" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-navy shadow-card hover:bg-slate-50">
                Browse role guides
              </Link>
            </div>
            <dl className="mt-8 grid max-w-lg grid-cols-3 gap-4 text-center">
              {[
                ['Evidence-first', 'No fabricated skills — only what you document'],
                ['Real matching', 'Requirements vs. your actual projects'],
                ['Grounded AI', 'Answers with citations from your own work'],
              ].map(([t, d]) => (
                <div key={t} className="rounded-xl bg-white p-3 shadow-card">
                  <dt className="text-xs font-bold text-navy">{t}</dt>
                  <dd className="mt-1 text-[11px] text-slate-500">{d}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid gap-4">
            {[
              { icon: FolderOpen, title: 'Evidence Library', text: 'Projects, repos, READMEs, write-ups, certifications — one place with visual provenance.' },
              { icon: Target, title: 'Job Targets', text: 'Paste a posting; confirm the extracted requirements yourself.' },
              { icon: BotMessageSquare, title: 'Career Chat', text: 'Task-grounded practice advice, profiled from your own evidence — never from imagination.' },
              { icon: ShieldCheck, title: 'Mentors & Privacy', text: 'Share only the evidence you choose; revoke access with one click.' },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 rounded-xl bg-white p-5 shadow-card">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-navy">{f.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
