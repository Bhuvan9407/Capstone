import { useCallback, useEffect, useState } from 'react';
import { Star, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { mentorApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import {
  PageHeading, Card, Badge, Button, Field, Input, Select, Spinner, EmptyState, NoticeBanner,
} from '../../components/index.js';
import { ReviewThread } from '../../components/ReviewThread.jsx';

export const MentorReviews = () => {
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    mentorApi.reviews()
      .then(({ data }) => setState({ loading: false, error: '', items: data.items || [] }))
      .catch((err) => setState({ loading: false, error: apiError(err).message, items: [] }));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading
        title="Reviews"
        subtitle="Start a review over evidence a student shared with you, then comment and complete it."
        actions={
          <>
            {!creating && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New review</Button>}
          </>
        }
      />

      <NewReviewPanel open={creating} onClose={() => setCreating(false)} onDone={load} />

      {state.loading && <div className="flex justify-center py-10"><Spinner /></div>}
      {!state.loading && !state.error && state.items.length === 0 && !creating && (
        <EmptyState
          icon={<Star className="h-10 w-10" />}
          title="No reviews yet"
          message="Open a review over a student's shared evidence to start giving feedback."
        />
      )}

      <div className="space-y-3">
        {state.items.map((r) => {
          const id = String(r._id);
          const open = openId === id;
          const studentName =
            typeof r.studentId === 'object' ? r.studentId?.name : undefined;
          return (
            <Card key={id}>
              <button onClick={() => setOpenId(open ? null : id)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-navy">{r.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {studentName || 'student'} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={r.status === 'completed' ? 'green' : 'amber'}>{r.status}</Badge>
                  {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </div>
              </button>
              {open && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                  <ReviewThread reviewId={id} role="mentor" onChanged={load} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const NewReviewPanel = ({ open, onClose, onDone }) => {
  const [grants, setGrants] = useState(null);
  const [shared, setShared] = useState(null);
  const [form, setForm] = useState({ grantId: '', title: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    Promise.all([mentorApi.grants(), mentorApi.shared()])
      .then(([g, s]) => {
        const gs = (g.data.items || []).filter((x) => x.status === 'active');
        setGrants(gs);
        setShared(s.data || { items: [], resumes: [] });
        if (gs.length && !form.grantId) setForm((f) => ({ ...f, grantId: String(gs[0]._id) }));
      })
      .catch((err) => setError(apiError(err).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const selectedGrantId = String(form.grantId || grants?.[0]?._id || '');
  const studentAck = grants?.find((g) => String(g._id) === selectedGrantId);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await mentorApi.createReview({
        grantId: selectedGrantId,
        studentId: studentAck?.studentId,
        title: form.title,
      });
      setForm({ grantId: '', title: '' });
      onClose();
      onDone?.();
      void data;
    } catch (err) {
      const er = apiError(err);
      setError(er.details?.length ? er.details.map((d) => d.message).join('; ') : er.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-6 p-5">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-navy"><Plus className="h-4 w-4 text-blue-600" /> Start a review</h2>
      {!grants ? (
        <div className="mt-3"><Spinner /></div>
      ) : (grants || []).length === 0 ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          No active grants. Reviews require an active sharing grant from a student.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <Field label="Grant (student)" required>
            <Select value={selectedGrantId} onChange={(e) => setForm((f) => ({ ...f, grantId: e.target.value }))}>
              {grants.map((g) => (
                <option key={String(g._id)} value={String(g._id)}>
                  {g.studentName || g.studentId} — {(g.evidenceIds || []).length} evidence shared
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Review title" required hint={`Hint: mention the focus, e.g. "${(shared?.items || [])[0]?.title || 'portfolio'}".`}>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} maxLength={160} placeholder="Feedback round on backend projects" />
          </Field>
          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={busy}>Open review</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
          <p className="text-[10px] text-slate-400">
            A review can only reference evidence inside the chosen grant — the server blocks anything outside it.
          </p>
        </form>
      )}
    </Card>
  );
};

export default MentorReviews;
