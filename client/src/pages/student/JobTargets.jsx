import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, Plus, Trash2, RefreshCw, CheckCircle2, Sparkles, FileSearch, BadgeCheck } from 'lucide-react';
import { jobTargetApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import {
  PageHeading, Card, Badge, Button, EmptyState, ErrorState, Spinner, NoticeBanner, Field, Input, Textarea,
} from '../../components/index.js';

const CATS = [
  ['language', 'Language'], ['framework', 'Framework'], ['database', 'Database'],
  ['testing', 'Testing'], ['devops', 'DevOps'], ['ai_ml', 'AI/ML'], ['security', 'Security'],
  ['performance', 'Performance'], ['tools', 'Tools'], ['soft_skills', 'Soft skills'],
  ['education', 'Education'], ['experience', 'Experience'], ['other', 'Other'],
];

const STATUS_TONES = { draft: 'slate', extracting: 'amber', awaiting_confirmation: 'amber', confirmed: 'green' };

export const JobTargets = () => {
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', organization: '', city: '', jobDescription: '' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [workingOn, setWorkingOn] = useState(null);
  const [confirming, setConfirming] = useState(null); // target being confirmed

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data } = await jobTargetApi.list();
      setState({ loading: false, error: '', items: data.items || [] });
    } catch (err) {
      setState({ loading: false, error: apiError(err).message, items: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      await jobTargetApi.create(form);
      setForm({ title: '', organization: '', city: '', jobDescription: '' });
      setCreating(false);
      await load();
    } catch (err) {
      const er = apiError(err);
      setNotice(er.details?.length ? er.details.map((d) => d.message).join('; ') : er.message);
    } finally {
      setBusy(false);
    }
  };

  const extract = async (id) => {
    setWorkingOn(id);
    setNotice('');
    try {
      await jobTargetApi.extract(id);
      await load();
    } catch (err) {
      const er = apiError(err);
      setNotice(er.status === 503
        ? 'Ollama is unavailable, so requirements could not be extracted. Start Ollama and retry — requirements are never fabricated.'
        : er.message);
    } finally {
      setWorkingOn(null);
    }
  };

  const remove = async (id) => {
    setWorkingOn(id);
    try {
      await jobTargetApi.remove(id);
      await load();
    } catch (err) {
      setNotice(apiError(err).message);
    } finally {
      setWorkingOn(null);
    }
  };

  if (confirming) {
    return <RequirementsConfirm target={confirming} onDone={() => { setConfirming(null); load(); }} onCancel={() => setConfirming(null)} />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading
        title="Job Targets"
        subtitle="Paste real postings. Extraction only pre-fills — you confirm every requirement yourself."
        actions={
          !creating && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New job target</Button>
        }
      />

      {notice && <div className="mb-4"><NoticeBanner>{notice}</NoticeBanner></div>}

      {creating && (
        <Card className="mb-6 p-5">
          <h3 className="text-sm font-extrabold text-navy">Paste a job posting</h3>
          <form onSubmit={onSubmit} className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Role title" required>
                <Input value={form.title} onChange={set('title')} placeholder="Backend Intern" />
              </Field>
              <Field label="Company">
                <Input value={form.organization} onChange={set('organization')} placeholder="Example Corp" />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={set('city')} placeholder="Bengaluru" />
              </Field>
            </div>
            <Field label="Full job description" required hint="Paste the complete text — content requirements are read from it.">
              <Textarea rows={8} value={form.jobDescription} onChange={set('jobDescription')} placeholder="Paste the posting here (at least 10 characters)…" />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" loading={busy}>Create target</Button>
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {state.loading && <div className="flex justify-center py-10"><Spinner /></div>}
      {!state.loading && state.error && <ErrorState message={state.error} onRetry={load} />}

      {!state.loading && !state.error && state.items.length === 0 && (
        <EmptyState
          icon={<Target className="h-10 w-10" />}
          title="No job targets yet"
          message="Paste a real internship or job posting to see how your documented evidence lines up with its requirements."
          action={<Button onClick={() => setCreating(true)}>Add your first target</Button>}
        />
      )}

      <div className="space-y-4">
        {state.items.map((t) => (
          <Card key={t.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-navy">{t.title}</h3>
                <p className="text-xs text-slate-500">
                  {[t.organization, t.city].filter(Boolean).join(' · ')}
                  {t.organization || t.city ? ' · ' : ''}
                  {new Date(t.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={STATUS_TONES[t.status] || 'slate'}>{t.status.replace('_', ' ')}</Badge>
                  <Badge tone="slate">{(t.hardReqs || []).length} requirements</Badge>
                  <Badge tone="slate">{(t.consolidatedSkills || []).length} skills</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/compare"><Button size="sm" variant="secondary">Compare <BadgeCheck className="h-3.5 w-3.5" /></Button></Link>
                {t.status !== 'confirmed' && (
                  <Button size="sm" onClick={() => setConfirming(t)}>Confirm requirements</Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => extract(t.id)}
                  loading={workingOn === t.id}
                  disabled={workingOn === t.id}
                >
                  <Sparkles className="h-3.5 w-3.5" /> Re-extract
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove(t.id)} disabled={workingOn === t.id}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-slate-400 hover:text-slate-600">
                View pasted description & discovered requirements
              </summary>
              <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">{t.rawDescription}</p>
              {(t.hardReqs || []).length > 0 && (
                <ul className="mt-2 space-y-1">
                  {t.hardReqs.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <FileSearch className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                      <span>
                        {r.statement}
                        {r.inferred && <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">inferred</span>}
                        <span className="ml-1.5 text-[9px] font-bold uppercase text-slate-400">{r.category}{r.weight ? ` · w${r.weight}` : ''}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {t.realizationError && (
                <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                  Extraction problem: {t.realizationError}
                </p>
              )}
            </details>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ---- Requirements confirmation: extraction pre-fills; the student edits and
// ---- confirms the final requirement list. Nothing is stored as fact before this.
const RequirementsConfirm = ({ target, onDone, onCancel }) => {
  const [skills, setSkills] = useState((target.consolidatedSkills || []).join(', '));
  const [reqs, setReqs] = useState(
    (target.hardReqs || []).length
      ? target.hardReqs.map((r) => ({ statement: r.statement, category: r.category || 'other', weight: r.weight || 2, inferred: Boolean(r.inferred), keep: true }))
      : []
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = (i, patch) => setReqs((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addReq = () => setReqs((rs) => [...rs, { statement: '', category: 'other', weight: 2, inferred: false, keep: true }]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const kept = reqs.filter((r) => r.keep && r.statement.trim());
    if (kept.length === 0) {
      setError('Confirm at least one requirement.');
      return;
    }
    setBusy(true);
    try {
      await jobTargetApi.confirm(target.id, {
        consolidatedSkills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        requirements: kept.map(({ statement, category, weight, inferred }) => ({
          statement: statement.trim(), category, weight, inferred,
        })),
      });
      onDone();
    } catch (err) {
      const er = apiError(err);
      setError(er.details?.length ? er.details.map((d) => d.message).join('; ') : er.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={onCancel} className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy">
        <RefreshCw className="h-3.5 w-3.5 rotate-45" /> Back to targets
      </button>
      <PageHeading
        title={`Confirm requirements — ${target.title}`}
        subtitle="AI extraction never finalizes anything. Deselect wrong rows, edit statements, and add what it missed."
      />
      <form onSubmit={submit} className="space-y-4">
        <Card className="p-4">
          <Field label="Consolidated skills" hint="Comma-separated list of skills this role needs.">
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Node.js, Express, MongoDB, Git" />
          </Field>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-navy">Requirements ({reqs.filter((r) => r.keep).length} confirmed)</h3>
            <Button size="sm" variant="secondary" onClick={addReq} type="button"><Plus className="h-3.5 w-3.5" /> Add requirement</Button>
          </div>
          <div className="space-y-2">
            {reqs.map((r, i) => (
              <div key={i} className={`flex gap-2 rounded-lg border p-2 ${r.keep ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-50'}`}>
                <input
                  type="checkbox"
                  checked={r.keep}
                  onChange={(e) => update(i, { keep: e.target.checked })}
                  className="mt-2 h-4 w-4 accent-blue-600"
                  aria-label={`Keep requirement: ${r.statement}`}
                />
                <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_140px_100px]">
                  <Input value={r.statement} onChange={(e) => update(i, { statement: e.target.value })} placeholder="Requirement statement" />
                  <Select value={r.category} onChange={(e) => update(i, { category: e.target.value })}>
                    {CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                  <Select value={r.weight} onChange={(e) => update(i, { weight: Number(e.target.value) })}>
                    <option value={3}>Weight 3 (must)</option>
                    <option value={2}>Weight 2 (should)</option>
                    <option value={1}>Weight 1 (nice)</option>
                  </Select>
                </div>
                {r.inferred && <Badge tone="amber" className="mt-2 hidden sm:inline-flex">inferred</Badge>}
              </div>
            ))}
            {reqs.length === 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                No requirements extracted (or model offline). Add them manually — the confirmed list is what the comparison uses.
              </p>
            )}
          </div>
        </Card>
        {error && <NoticeBanner>{error}</NoticeBanner>}
        <div className="flex gap-2">
          <Button type="submit" loading={busy}><CheckCircle2 className="h-4 w-4" /> Save confirmed requirements</Button>
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </div>
  );
};

export default JobTargets;
