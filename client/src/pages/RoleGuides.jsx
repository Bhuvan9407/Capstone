import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Sparkles, FolderPlus, GraduationCap } from 'lucide-react';
import { publicApi } from '../services/index.js';
import { Button, Card, Badge, Skeleton, EmptyState, ErrorState, NoticeBanner } from '../components/index.js';

export const RoleGuides = () => (
  <div className="min-h-screen bg-surface">
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
      <Link to="/" className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-card"><GraduationCap className="h-5 w-5" /></span>
        <span className="text-sm font-extrabold text-navy">Career Evidence and Portfolio Coach</span>
      </Link>
      <Link to="/login" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-card hover:bg-blue-700">Sign in</Link>
    </header>
    <main className="mx-auto max-w-5xl px-6 pb-20 pt-2">
      <div className="mb-6">
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
          <Compass className="h-3.5 w-3.5" /> Public role guides
        </p>
        <h1 className="text-3xl font-extrabold text-navy">Pick a destination role</h1>
        <p className="mt-2 max-w-xl text-sm text-slate-600">
          Each guide lists the skills a role expects and — more importantly — concrete
          evidence ideas you can turn into library entries. Guides are maintained by
          verified mentors.
        </p>
      </div>
      <GuideList />
    </main>
  </div>
);

const GuideList = () => {
  const [state, setState] = useState({ loading: true, error: '', items: [] });

  const load = () => {
    setState({ loading: true, error: '', items: [] });
    publicApi.roleGuides()
      .then(({ data }) => setState({ loading: false, error: '', items: data.items || [] }))
      .catch(() => setState({ loading: false, error: 'Could not load role guides.', items: [] }));
  };

  useEffect(load, []);

  if (state.loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => <Card key={i} className="p-6"><Skeleton className="h-5 w-1/3" /><Skeleton className="mt-3 h-16" /></Card>)}
      </div>
    );
  }
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;

  return (
    <>
      <NoticeBanner tone="blue">
        Guides describe paths, not guarantees. The coordination with your own record happens
        inside the app — requirements are always compared against evidence you logged yourself.
      </NoticeBanner>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {state.items.map((g) => (
          <Card key={g._id} className="flex flex-col p-5">
            <h3 className="text-base font-extrabold text-navy">{g.title}</h3>
            {g.headline && <p className="mt-0.5 text-xs font-semibold text-slate-500">{g.headline}</p>}
            <p className="mt-3 flex-1 text-sm text-slate-600">{g.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(g.skills || []).slice(0, 8).map((s) => (
                <Badge key={s} tone="blue">{s}</Badge>
              ))}
            </div>
            {(g.evidenceIdeas || []).length > 0 && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <Sparkles className="h-3.5 w-3.5" /> Evidence ideas
                </p>
                <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-slate-600">
                  {g.evidenceIdeas.slice(0, 4).map((idea) => (
                    <li key={idea}><FolderPlus className="mr-1 inline h-3 w-3 text-slate-400" />{idea}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        ))}
      </div>
      {state.items.length === 0 && (
        <EmptyState
          icon={<Compass className="h-10 w-10" />}
          title="No role guides yet"
          message="Mentors publish guides once verified. Check back soon."
          action={<Link to="/"><Button variant="secondary">Back home</Button></Link>}
        />
      )}
    </>
  );
};

export default RoleGuides;
