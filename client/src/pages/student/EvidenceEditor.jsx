import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { evidenceApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import {
  PageHeading, Card, Badge, Button, Field, Input, Textarea, Select, ErrorState, Spinner, NoticeBanner,
} from '../../components/index.js';

const KINDS = [
  ['project', 'Project'], ['tech_skill', 'Tech skill'], ['github_repo', 'GitHub repo'],
  ['readme', 'README'], ['writeup', 'Write-up'], ['portfolio_link', 'Portfolio link'],
  ['certification', 'Certification'], ['achievement', 'Achievement'], ['course', 'Course'],
];
const STATUSES = [
  ['draft', 'Draft — not visible anywhere'],
  ['unverified', 'Unverified — recorded, no mentor review yet'],
  ['claimed', 'Claimed — documented, awaiting proof link'],
  ['verified', 'Verified — mentor confirmed this entry'],
];

const empty = {
  kind: 'project',
  title: '',
  organization: '',
  description: '',
  repoUrl: '',
  demoUrl: '',
  techSkills: [],
  startedAt: '',
  endedAt: '',
  status: 'unverified',
  statusNotes: '',
};

export const EvidenceEditor = () => {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [skillDraft, setSkillDraft] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (!isNew) {
      evidenceApi.get(id)
        .then(({ data }) =>
          setForm({
            ...empty,
            ...data.evidence,
            startedAt: data.evidence.startedAt ? data.evidence.startedAt.slice(0, 10) : '',
            endedAt: data.evidence.endedAt ? data.evidence.endedAt.slice(0, 10) : '',
          }))
        .catch((err) => setLoadError(apiError(err).message))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addSkill = () => {
    const v = skillDraft.trim();
    if (!v || form.techSkills.includes(v) || form.techSkills.length >= 30) return;
    setForm((f) => ({ ...f, techSkills: [...f.techSkills, v] }));
    setSkillDraft('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!form.title.trim()) {
      setServerError('Give the entry a title.');
      return;
    }
    setBusy(true);
    const payload = {
      ...form,
      startedAt: form.startedAt || undefined,
      endedAt: form.endedAt || undefined,
    };
    if (form.endedAt && !form.startedAt) delete payload.endedAt;
    try {
      if (isNew) {
        const { data } = await evidenceApi.create(payload);
        navigate(`/evidence/${data.evidence.id}`, { replace: true });
      } else {
        await evidenceApi.update(id, payload);
        navigate('/evidence');
      }
    } catch (err) {
      const er = apiError(err);
      setServerError(er.details?.length ? er.details.map((d) => d.message).join('; ') : er.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <PageHeading
        title={isNew ? 'Add evidence' : 'Edit evidence'}
        subtitle="Record only what is true and documentable — this record is what the matching engine trusts."
      />

      <form onSubmit={onSubmit} className="space-y-4">
        <Card className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Kind" required>
              <Select value={form.kind} onChange={set('kind')}>
                {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Title" required error={undefined}>
              <Input value={form.title} onChange={set('title')} maxLength={140} placeholder="Campus event booking platform" />
            </Field>
            <Field label="Organization">
              <Input value={form.organization} onChange={set('organization')} maxLength={140} placeholder="Example University · if relevant" />
            </Field>
          </div>
          <Field label="Description" hint="What was actually built or achieved? Concrete details make this evidence useful.">
            <Textarea rows={5} value={form.description} onChange={set('description')} maxLength={4000} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Repository URL" hint="https://github.com/…">
              <Input value={form.repoUrl} onChange={set('repoUrl')} type="url" placeholder="https://github.com/user/repo" />
            </Field>
            <Field label="Demo / deployed URL">
              <Input value={form.demoUrl} onChange={set('demoUrl')} type="url" placeholder="https://demo.example.com" />
            </Field>
          </div>
          <Field label="Technologies / skills demonstrated">
            <div>
              <div className="flex gap-2">
                <Input
                  value={skillDraft}
                  onChange={(e) => setSkillDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="e.g. React, PostgreSQL, Vitest"
                />
                <Button type="button" variant="secondary" onClick={addSkill}>Add</Button>
              </div>
              {form.techSkills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.techSkills.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, techSkills: f.techSkills.filter((x) => x !== s) }))}
                      className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
                    >
                      {s} <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Started">
              <Input type="date" value={form.startedAt} onChange={set('startedAt')} />
            </Field>
            <Field label="Ended" hint="Leave empty if ongoing.">
              <Input type="date" value={form.endedAt} onChange={set('endedAt')} />
            </Field>
            <Field label="Status" required>
              <Select value={form.status} onChange={set('status')}>
                {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Status notes" hint="e.g. why a repo is private, who can confirm this, what link proves it.">
            <Textarea rows={2} value={form.statusNotes} onChange={set('statusNotes')} maxLength={500} />
          </Field>
        </Card>

        {serverError && <NoticeBanner>{serverError}</NoticeBanner>}

        <div className="flex items-center justify-between">
          <Badge tone="slate">Entries stay yours — mentors and admins can only read what you explicitly share.</Badge>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" loading={busy}>{isNew ? 'Create entry' : 'Save changes'}</Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EvidenceEditor;
