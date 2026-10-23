import { useCallback, useEffect, useState } from 'react';
import { Globe, ExternalLink, Eye, Save, EyeOff, X } from 'lucide-react';
import { portfolioApi, evidenceApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import {
  PageHeading, Card, Badge, Button, Field, Input, Textarea, Spinner, NoticeBanner,
} from '../../components/index.js';

export const PortfolioEditor = () => {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [publicUrl, setPublicUrl] = useState(null);
  const [evidenceOptions, setEvidenceOptions] = useState([]);
  const [skillDraft, setSkillDraft] = useState('');
  const [courseDraft, setCourseDraft] = useState('');

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const [{ data: pv }, { data: ev }] = await Promise.all([
        portfolioApi.own(),
        evidenceApi.list({ limit: 100 }).catch(() => ({ data: { items: [] } })),
      ]);
      const p = pv.portfolio;
      setForm({
        publicName: p.publicName || '',
        headline: p.headline || '',
        intro: p.intro || '',
        emailPublic: p.emailPublic || '',
        githubUrl: p.githubUrl || '',
        linkedinUrl: p.linkedinUrl || '',
        school: p.school || '',
        coursework: p.coursework || [],
        expertise: p.expertise || [],
        evidenceIds: (p.evidenceIds || []).map(String),
        isPublished: Boolean(p.isPublished),
      });
      setEvidenceOptions(
        (ev.items || []).filter((e) => e.status !== 'draft').map((e) => ({ id: e.id, title: e.title, kind: e.kind, status: e.status }))
      );
      setState({ loading: false, error: '', data: p });
    } catch (err) {
      setState({ loading: false, error: apiError(err).message, data: null });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (action) => {
    setBusy(true);
    setError('');
    try {
      const { data } = await portfolioApi.visibility(action || (form.isPublished ? 'publish' : 'unpublish'), {
        publicName: form.publicName,
        headline: form.headline,
        intro: form.intro,
        emailPublic: form.emailPublic,
        githubUrl: form.githubUrl,
        linkedinUrl: form.linkedinUrl,
        school: form.school,
        coursework: form.coursework,
        expertise: form.expertise,
        evidenceIds: form.evidenceIds,
      });
      setPublicUrl(data.publicUrl);
      setForm((f) => ({ ...f, isPublished: data.portfolio.isPublished }));
      setState((s) => ({ ...s, data: data.portfolio }));
    } catch (err) {
      const er = apiError(err);
      setError(er.details?.length ? er.details.map((d) => d.message).join('; ') : er.message);
    } finally {
      setBusy(false);
    }
  };

  if (state.loading || !form) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (state.error) return <NoticeBanner>{state.error} — reload the page to retry.</NoticeBanner>;

  const published = form.isPublished;
  const slug = state.data?.slug;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading
        title="Portfolio"
        subtitle="Publishing is explicit, reversible, and only ever shows what you select below."
        actions={
          <span className="flex items-center gap-2">
            <Badge tone={published ? 'green' : 'slate'}>{published ? 'published' : 'private'}</Badge>
            {published ? (
              <Button size="sm" variant="secondary" loading={busy} onClick={() => save('unpublish')}>
                <EyeOff className="h-3.5 w-3.5" /> Unpublish
              </Button>
            ) : (
              <Button size="sm" loading={busy} onClick={() => save('publish')}>
                <Eye className="h-3.5 w-3.5" /> Publish
              </Button>
            )}
          </span>
        }
      />

      {publicUrl && (
        <div className="mb-4">
          <NoticeBanner tone="blue">
            {published
              ? <>Public URL ready: <a className="font-bold underline" href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a></>
              : 'Portfolio unpublished — the public URL no longer serves content.'}
          </NoticeBanner>
        </div>
      )}
      {published && slug && !publicUrl && (
        <div className="mb-4">
          <NoticeBanner tone="blue">
            Live at <a className="font-bold underline" href={`/portfolio/${slug}`} target="_blank" rel="noreferrer">{`/portfolio/${slug}`}</a>
            <ExternalLink className="ml-1 inline h-3 w-3" />
          </NoticeBanner>
        </div>
      )}
      {error && <div className="mb-4"><NoticeBanner>{error}</NoticeBanner></div>}

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save(published ? 'publish' : undefined);
        }}
      >
        <Card className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Public display name" required hint="Shown instead of your account name.">
              <Input value={form.publicName} onChange={set('publicName')} maxLength={80} placeholder="Priya Sharma" />
            </Field>
            <Field label="Email shown publicly" hint="Leave blank to show nothing.">
              <Input value={form.emailPublic} onChange={set('emailPublic')} placeholder="you@college.edu" />
            </Field>
          </div>
          <Field label="Headline" hint="One line under your name.">
            <Input value={form.headline} onChange={set('headline')} maxLength={160} placeholder="CS junior · backend projects in Node.js" />
          </Field>
          <Field label="Intro">
            <Textarea rows={4} value={form.intro} onChange={set('intro')} maxLength={1200} placeholder="Short first-person summary of what you build." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="School">
              <Input value={form.school} onChange={set('school')} maxLength={140} />
            </Field>
            <Field label="GitHub URL">
              <Input value={form.githubUrl} onChange={set('githubUrl')} placeholder="https://github.com/username" />
            </Field>
            <Field label="LinkedIn URL">
              <Input value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/username" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Expertise tags">
              <div>
                <div className="flex gap-2">
                  <Input value={skillDraft} onChange={(e) => setSkillDraft(e.target.value)} onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addTag(setForm, 'expertise', skillDraft, setSkillDraft, 40); }
                  }} placeholder="Node.js, Testing…" />
                  <Button type="button" variant="secondary" onClick={() => addTag(setForm, 'expertise', skillDraft, setSkillDraft, 40)}>Add</Button>
                </div>
                <TagRow tags={form.expertise} onRemove={(t) => setForm((f) => ({ ...f, expertise: f.expertise.filter((x) => x !== t) }))} />
              </div>
            </Field>
            <Field label="Relevant coursework">
              <div>
                <div className="flex gap-2">
                  <Input value={courseDraft} onChange={(e) => setCourseDraft(e.target.value)} onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addTag(setForm, 'coursework', courseDraft, setCourseDraft, 40); }
                  }} placeholder="DBMS, Operating Systems…" />
                  <Button type="button" variant="secondary" onClick={() => addTag(setForm, 'coursework', courseDraft, setCourseDraft, 40)}>Add</Button>
                </div>
                <TagRow tags={form.coursework} onRemove={(t) => setForm((f) => ({ ...f, coursework: f.coursework.filter((x) => x !== t) }))} />
              </div>
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-navy">
            <Globe className="h-4 w-4 text-blue-600" /> Evidence shown on the public page
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Only non-draft entries can be selected. Drafts stay private no matter what.
          </p>
          {evidenceOptions.length === 0 ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No non-draft evidence entries yet. Add evidence first — that is exactly what the public page is for.
            </p>
          ) : (
            <div className="mt-3 max-h-56 space-y-0.5 overflow-y-auto rounded-lg bg-slate-50 p-2">
              {evidenceOptions.map((e) => (
                <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-blue-50/50">
                  <input
                    type="checkbox"
                    checked={form.evidenceIds.includes(e.id)}
                    onChange={() => setForm((f) => ({
                      ...f,
                      evidenceIds: f.evidenceIds.includes(e.id) ? f.evidenceIds.filter((x) => x !== e.id) : [...f.evidenceIds, e.id],
                    }))}
                    className="h-3.5 w-3.5 accent-blue-600"
                  />
                  <span className="truncate font-semibold text-navy">{e.title}</span>
                  <Badge tone="slate">{e.kind}</Badge>
                  {e.status === 'verified' && <Badge tone="green">verified</Badge>}
                </label>
              ))}
            </div>
          )}
        </Card>

        <div className="flex justify-end gap-2 pb-4">
          <Button type="submit" loading={busy}><Save className="h-4 w-4" /> {published ? 'Save & keep published' : 'Save settings'}</Button>
        </div>
      </form>
    </div>
  );
};

const addTag = (setForm, key, draft, clear, max) => {
  const v = draft.trim();
  if (!v) return;
  setForm((f) => {
    if ((f[key] || []).includes(v) || f[key].length >= max) return f;
    return { ...f, [key]: [...f[key], v] };
  });
  clear('');
};

const TagRow = ({ tags, onRemove }) => (
  (tags || []).length > 0 ? (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <button key={t} type="button" onClick={() => onRemove(t)} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">
          {t} <X className="h-3 w-3" />
        </button>
      ))}
    </div>
  ) : null
);

export default PortfolioEditor;
