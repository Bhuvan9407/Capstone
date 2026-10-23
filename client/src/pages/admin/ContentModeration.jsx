import { useState } from 'react';
import { ListChecks, Ban, RotateCcw } from 'lucide-react';
import { adminApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import {
  PageHeading, Card, Badge, Button, Field, Input, Select, Textarea, NoticeBanner,
} from '../../components/index.js';

/**
 * Manual moderation: staff disable/enable a portfolio or comment by content id.
 * Actions create a ModerationAction record + audit trail entry. Admins do not
 * need (and never get) read access to the underlying private content.
 */
export const ContentModeration = () => {
  const [form, setForm] = useState({ contentType: 'portfolio', contentId: '', action: 'disable', reason: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const { data } = await adminApi.moderation(form);
      setResult(data.result);
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeading
        title="Content moderation"
        subtitle="Disable or re-enable public content by id. Every action is written to the audit trail."
      />

      <form onSubmit={submit}>
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Content type" required>
              <Select value={form.contentType} onChange={set('contentType')}>
                <option value="portfolio">Portfolio (public page)</option>
                <option value="comment">Review comment</option>
              </Select>
            </Field>
            <Field label="Action" required>
              <Select value={form.action} onChange={set('action')}>
                <option value="disable"><Ban className="mr-1 inline h-3 w-3" />Disable (unpublish / flag)</option>
                <option value="enable">Enable (restore)</option>
              </Select>
            </Field>
          </div>
          <Field label="Content id (Mongo id)" required className="mt-4" hint="24-character id, e.g. from an abuse report target.">
            <Input value={form.contentId} onChange={set('contentId')} placeholder="665f1c… " required />
          </Field>
          <Field label="Reason" className="mt-4" hint="Stored on the moderation record; max 500 chars.">
            <Textarea rows={2} value={form.reason} onChange={set('reason')} maxLength={500} />
          </Field>
          {error && <div className="mt-3"><NoticeBanner>{error}</NoticeBanner></div>}
          {result && (
            <div className="mt-3">
              <NoticeBanner tone="blue">
                Done — moderation action recorded{typeof result === 'object' && result && 'isPublished' in result ? (`, portfolio isPublished = ${result.isPublished}`) : '.'}
              </NoticeBanner>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button type="submit" variant={form.action === 'disable' ? 'danger' : 'dark'} loading={busy}>
              {form.action === 'disable' ? <><Ban className="h-4 w-4" /> Disable content</> : <><RotateCcw className="h-4 w-4" /> Re-enable content</>}
            </Button>
          </div>
        </Card>
      </form>

      <Card className="mt-4 p-4">
        <p className="flex items-start gap-2 text-[11px] text-slate-500">
          <Badge tone="blue" className="shrink-0">privacy</Badge>
          Moderating a portfolio never exposes its private fields: the public projection is the only thing that can be changed.
        </p>
        <p className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
          <ListChecks className="h-3.5 w-3.5" /> Audit entries: <code className="rounded bg-slate-100 px-1">portfolio.disable / portfolio.enable / comment.disable / comment.enable</code>
        </p>
      </Card>
    </div>
  );
};

export default ContentModeration;
