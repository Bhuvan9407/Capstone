import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Globe, GraduationCap, Flag, ExternalLink, CalendarRange } from 'lucide-react';
import { portfolioApi } from '../services/index.js';
import { Card, Badge, Skeleton, ErrorState, Button, NoticeBanner } from '../components/index.js';
import { AbuseReportModal } from '../components/AbuseReportModal.jsx';

const KIND_TONES = {
  project: 'blue',
  tech_skill: 'cyan',
  github_repo: 'purple',
  readme: 'slate',
  writeup: 'slate',
  portfolio_link: 'green',
  certification: 'amber',
  achievement: 'amber',
  course: 'slate',
};

export const PublicPortfolio = () => {
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, error: '', portfolio: null });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    portfolioApi.publicView(slug)
      .then(({ data }) => alive && setState({ loading: false, error: '', portfolio: data.portfolio }))
      .catch((err) =>
        alive &&
        setState({
          loading: false,
          error: err?.response?.status === 404
            ? 'This portfolio does not exist or is not published.'
            : 'Could not load this portfolio.',
          portfolio: null,
        }));
    return () => { alive = false; };
  }, [slug]);

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-card"><GraduationCap className="h-4 w-4" /></span>
            <span className="text-xs font-extrabold text-navy">Career Evidence Coach</span>
          </Link>
          <Link to="/register" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-card hover:bg-blue-700">
            Build your own portfolio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 pb-20">
        {state.loading && (
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
        )}
        {state.error && <ErrorState title="Portfolio unavailable" message={state.error} />}

        {state.portfolio && <PortfolioBody portfolio={state.portfolio} />}
      </main>
    </div>
  );
};

const PortfolioBody = ({ portfolio }) => {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy">{portfolio.displayName}</h1>
          {portfolio.headline && <p className="mt-1 text-sm font-semibold text-slate-600">{portfolio.headline}</p>}
          {portfolio.school && <p className="mt-0.5 text-xs text-slate-500">{portfolio.school}</p>}
          <p className="mt-2 flex flex-wrap gap-1.5">
            {(portfolio.expertise || []).map((x) => <Badge key={x} tone="blue">{x}</Badge>)}
          </p>
        </div>
        <button
          onClick={() => setReportOpen(true)}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Flag className="h-3.5 w-3.5" /> Report content
        </button>
      </div>

      {portfolio.intro && (
        <Card className="p-5"><p className="whitespace-pre-line text-sm text-slate-700">{portfolio.intro}</p></Card>
      )}

      {(portfolio.coursework || []).length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Relevant coursework</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {portfolio.coursework.map((c) => <Badge key={c} tone="slate">{c}</Badge>)}
          </ul>
        </Card>
      )}

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">
          <Globe className="h-4 w-4" /> Documented evidence ({portfolio.evidence?.length || 0})
        </h2>
        {(portfolio.evidence || []).length === 0 ? (
          <NoticeBanner>This portfolio lists its owner’s profile but no evidence entries beyond it, or entries are all drafts.</NoticeBanner>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {portfolio.evidence.map((e) => (
              <Card key={e.id || e._id} className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={KIND_TONES[e.kind] || 'slate'}>{e.kind.replace('_', ' ')}</Badge>
                  {e.status !== 'verified' && (
                    <span className="text-[10px] font-semibold text-slate-400">
                      {e.status === 'draft' ? 'draft' : e.status}
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-sm font-bold text-navy">{e.title}</h3>
                {e.organization && <p className="text-xs text-slate-500">{e.organization}</p>}
                {e.description && <p className="mt-2 line-clamp-4 text-xs text-slate-600">{e.description}</p>}
                <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                  <CalendarRange className="h-3 w-3" />
                  {e.startedAt ? new Date(e.startedAt).toLocaleDateString() : '—'}
                  {e.endedAt ? ` → ${new Date(e.endedAt).toLocaleDateString()}` : ' → ongoing'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(e.techSkills || []).slice(0, 6).map((s) => <Badge key={s} tone="cyan">{s}</Badge>)}
                </div>
                <div className="mt-3 flex gap-2">
                  {e.repoUrl && (
                    <a href={e.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline">
                      Repository <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {e.demoUrl && (
                    <a href={e.demoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline">
                      Demo <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <p className="border-t border-slate-100 pt-4 text-center text-[11px] text-slate-400">
        Every entry above was documented by the portfolio owner in the Career Evidence Coach;
        drafts are never shown publicly. Verified mentors review entries on request.
      </p>

      <AbuseReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetKind="portfolio"
        targetId={portfolio.id}
      />
    </div>
  );
};

export default PublicPortfolio;
