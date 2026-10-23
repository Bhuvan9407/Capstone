import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitCompare, CheckCircle2, AlertTriangle, CircleDashed, HelpCircle, Info } from 'lucide-react';
import { jobTargetApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import {
  PageHeading, Card, Badge, Button, EmptyState, ErrorState, Spinner, NoticeBanner,
} from '../../components/index.js';

const CAT_META = {
  supported: { tone: 'green', icon: CheckCircle2, label: 'Supported', blurb: 'Documented evidence shows this requirement.' },
  partial: { tone: 'amber', icon: AlertTriangle, label: 'Partial', blurb: 'Some related support, but too thin or off-target to call it covered.' },
  missing: { tone: 'rose', icon: CircleDashed, label: 'Missing', blurb: 'No supporting source found. Honest gap to close.' },
  unverified: { tone: 'slate', icon: HelpCircle, label: 'Unverified', blurb: 'Related mention exists, but without weight or details.' },
};

export const RequirementComparison = () => {
  const [targets, setTargets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [state, setState] = useState({ loading: true, error: '', result: null });

  const loadTargets = useCallback(async () => {
    try {
      const { data } = await jobTargetApi.list();
      const items = data.items || [];
      setTargets(items);
      const candidate = items.find((t) => t.status === 'confirmed' && (t.hardReqs || []).length) || items[0];
      setSelected(candidate ? candidate.id : '');
    } catch (err) {
      setState({ loading: false, error: apiError(err).message, result: null });
    }
  }, []);

  const compare = useCallback(async (id) => {
    if (!id) return;
    setState({ loading: true, error: '', result: null });
    try {
      const { data } = await jobTargetApi.compare(id);
      setState({ loading: false, error: '', result: data });
    } catch (err) {
      setState({ loading: false, error: apiError(err).message, result: null });
    }
  }, []);

  useEffect(() => {
    loadTargets().then(() => {});
  }, [loadTargets]);

  useEffect(() => {
    if (selected) compare(selected);
  }, [selected, compare]);

  if (!targets.length && !state.loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeading title="Requirements Compare" subtitle="Where your documented work meets the posted requirements." />
        <EmptyState
          icon={<GitCompare className="h-10 w-10" />}
          title="No job targets to compare"
          message="Create a job target, confirm its requirements, and compare them against your library here."
          action={<Link to="/targets"><Button>Go to job targets</Button></Link>}
        />
      </div>
    );
  }

  const { result } = state;
  const coverage = result?.coverage;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading
        title="Requirements Compare"
        subtitle="Supported / partial / missing is computed ONLY from evidence you documented — never a hiring probability."
      />

      <Card className="mb-4 p-4">
        <label htmlFor="target-select" className="mb-1.5 block text-sm font-semibold text-navy">Job target</label>
        <select
          id="target-select"
          value={selected || ''}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-navy"
        >
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}{t.organization ? ` — ${t.organization}` : ''} ({t.status.replace('_', ' ')})
            </option>
          ))}
        </select>
        <p className="mt-2 text-[11px] text-slate-400">
          Comparison uses the <b>confirmed</b> requirements of the target. If a target is still unconfirmed, confirm its requirements on the Job Targets page first.
        </p>
      </Card>

      {state.loading && <div className="flex justify-center py-10"><Spinner /></div>}
      {!state.loading && state.error && <ErrorState message={state.error} onRetry={() => compare(selected)} />}

      {result && (
        <>
          {coverage && (
            <Card className="mb-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Evidence coverage</p>
                    <p className="text-3xl font-extrabold text-navy">{coverage.ratio}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="green">supported {coverage.counts.supported}</Badge>
                    <Badge tone="amber">partial {coverage.counts.partial}</Badge>
                    <Badge tone="rose">missing {coverage.counts.missing}</Badge>
                    <Badge tone="slate">of {coverage.counts.total}</Badge>
                  </div>
                </div>
                <Badge tone="slate">NOT a fit score</Badge>
              </div>
              <p className="mt-3 flex items-start gap-2 rounded bg-slate-50 p-3 text-[11px] text-slate-600">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                {coverage.definition}
              </p>
            </Card>
          )}

          {result.retrieval?.mode === 'keyword' && (
            <div className="mb-4">
              <NoticeBanner>{result.retrieval.notice || 'Embedding model is offline; matching fell back to keyword mode — keep interpretations modest.'}</NoticeBanner>
            </div>
          )}

          <div className="space-y-3">
            {result.rows.map((row, i) => {
              const meta = CAT_META[row.category] || CAT_META.missing;
              const Icon = meta.icon;
              return (
                <Card key={i} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-bold text-navy">
                        <Icon className={`h-4 w-4 ${row.category === 'supported' ? 'text-emerald-600' : row.category === 'missing' ? 'text-rose-500' : row.category === 'partial' ? 'text-amber-500' : 'text-slate-400'}`} />
                        {row.requirement.statement}
                        {row.requirement.inferred && <Badge tone="amber">inferred</Badge>}
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {row.requirement.category} · weight {row.requirement.weight}
                      </p>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>

                  {row.support?.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {row.support.map((s, j) => (
                        <li key={j} className="rounded-lg bg-slate-50 p-3">
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            <Badge tone="slate">{s.sourceType}</Badge>
                            <span className="truncate">{s.title}</span>
                            {s.kind && <Badge tone="blue">{s.kind}</Badge>}
                          </div>
                          <p className="mt-1 line-clamp-3 text-[11px] text-slate-600">“{s.excerpt}”</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{meta.blurb}</p>
                  )}
                </Card>
              );
            })}
          </div>

          {result.rows.some((r) => r.category !== 'supported') && (
            <Card className="mt-4 p-4">
              <p className="text-xs font-bold text-navy">Close the gaps</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Run the preparation agent on this target to get a week-by-week plan for the missing items — it schedules real practice tasks, not invented skills.
              </p>
              <Link to="/plans" className="mt-2 inline-block text-xs font-bold text-blue-600 hover:underline">Open preparation plans →</Link>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default RequirementComparison;
