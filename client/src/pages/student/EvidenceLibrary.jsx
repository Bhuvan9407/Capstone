import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderOpen, Plus, Search, Trash2, Pencil, ExternalLink,
} from 'lucide-react';
import { evidenceApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import {
  PageHeading, Card, Badge, Button, Input, Select, EmptyState, ErrorState, Spinner, NoticeBanner,
} from '../../components/index.js';

const KIND_LABELS = {
  project: 'Project', tech_skill: 'Tech skill', github_repo: 'GitHub repo',
  readme: 'README', writeup: 'Write-up', portfolio_link: 'Portfolio link',
  certification: 'Certification', achievement: 'Achievement', course: 'Course',
};

const STATUS_TONES = { draft: 'slate', unverified: 'amber', claimed: 'blue', verified: 'green' };

export const EvidenceLibrary = () => {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [facets, setFacets] = useState({ skills: [], byType: [] });
  const [filters, setFilters] = useState({ q: '', type: '', status: '', skill: '', sort: 'newest' });
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v && v !== 'all'));
    try {
      const { data } = await evidenceApi.list(params);
      const f = await evidenceApi.facets().catch(() => ({ data: { skills: [], byType: [] } }));
      setState({ loading: false, error: '', data });
      setFacets(f.data);
    } catch (err) {
      setState({ loading: false, error: apiError(err).message, data: null });
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 200); // light debounce on typing
    return () => clearTimeout(t);
  }, [load]);

  const onFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const remove = async (id) => {
    setDeleting(id);
    try {
      await evidenceApi.remove(id);
      await load();
    } catch (err) {
      setState((s) => ({ ...s, error: apiError(err).message }));
    } finally {
      setDeleting(null);
    }
  };

  const updateFacet = (key, value) => {
    setFilters((f) => ({ ...f, [key]: f[key] === value ? '' : value }));
  };

  return (
    <div>
      <PageHeading
        title="Evidence Library"
        subtitle="Your verified record. Status shows what has provenance and what is still a claim."
        actions={
          <Link to="/evidence/new"><Button><Plus className="h-4 w-4" /> Add evidence</Button></Link>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={filters.q} onChange={onFilter('q')} placeholder="Search title, skills…" className="pl-9" aria-label="Search evidence" />
          </div>
          <Select value={filters.type} onChange={onFilter('type')} aria-label="Filter by type">
            <option value="">All types</option>
            {Object.entries(KIND_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </Select>
          <Select value={filters.status} onChange={onFilter('status')} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="unverified">Unverified</option>
            <option value="claimed">Claimed</option>
            <option value="verified">Verified</option>
          </Select>
          <Select value={filters.skill} onChange={onFilter('skill')} aria-label="Filter by skill">
            <option value="">All skills</option>
            {(facets.skills || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={filters.sort} onChange={onFilter('sort')} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="updated">Recently updated</option>
            <option value="title">Title A→Z</option>
          </Select>
        </div>
      </Card>

      {state.loading && <div className="flex justify-center py-10"><Spinner /></div>}
      {!state.loading && state.error && <ErrorState message={state.error} onRetry={load} />}

      {!state.loading && !state.error && state.data && (
        state.data.items.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-10 w-10" />}
            title="No matching evidence"
            message={state.data.total === 0
              ? 'Add your first project, repository, or certification to start building your record.'
              : 'Try clearing the filters above.'}
            action={<Link to="/evidence/new"><Button>Add evidence</Button></Link>}
          />
        ) : (
          <>
            <p className="mb-3 text-xs font-semibold text-slate-500">
              {state.data.total} entr{state.data.total === 1 ? 'y' : 'ies'} · page {state.data.page} of {state.data.pages}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {state.data.items.map((e) => (
                <Card key={e.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="blue">{KIND_LABELS[e.kind] || e.kind}</Badge>
                      <Badge tone={STATUS_TONES[e.status] || 'slate'}>{e.status}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Link to={`/evidence/${e.id}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-blue-600" aria-label={`Edit ${e.title}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => remove(e.id)}
                        disabled={deleting === e.id}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Delete ${e.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-navy">{e.title}</h3>
                  {e.organization && <p className="text-xs text-slate-500">{e.organization}</p>}
                  <p className="mt-1.5 line-clamp-3 flex-1 text-xs text-slate-600">{e.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(e.techSkills || []).map((s) => <Badge key={s} tone="cyan">{s}</Badge>)}
                  </div>
                  {(e.repoUrl || e.demoUrl) && (
                    <div className="mt-2 flex gap-3">
                      {e.repoUrl && <a href={e.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline">Repo <ExternalLink className="h-3 w-3" /></a>}
                      {e.demoUrl && <a href={e.demoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline">Demo <ExternalLink className="h-3 w-3" /></a>}
                    </div>
                  )}
                  {e.mentorFeedback?.length > 0 && (
                    <p className="mt-2 rounded bg-purple-50 px-2 py-1 text-[10px] font-semibold text-purple-700">
                      {e.mentorFeedback.length} mentor note{e.mentorFeedback.length > 1 ? 's' : ''}
                    </p>
                  )}
                </Card>
              ))}
            </div>

            {state.data.pages > 1 && (
              <div className="mt-4 flex justify-center gap-2">
                {Array.from({ length: state.data.pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilters((f) => ({ ...f, page: p }))}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${p === state.data.page ? 'bg-blue-600 text-white' : 'bg-white text-navy hover:bg-slate-50'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            {filters.q && (
              <p className="mt-3 text-[11px] text-slate-400">
                Hint: keyword search matches titles, descriptions and skills of entries you recorded yourself.
              </p>
            )}
          </>
        )
      )}

      {facets.byType?.length > 0 && (
        <NoticeBanner>
          Library snapshot: {facets.byType.map((t) => `${t.count} ${KIND_LABELS[t._id] || t._id}`).join(' · ')}
        </NoticeBanner>
      )}
    </div>
  );
};

export default EvidenceLibrary;
