import { useCallback, useEffect, useState } from 'react';
import { Star, MessageSquare, Send, CheckCircle2, Lightbulb, Reply } from 'lucide-react';
import { mentorApi } from '../services/index.js';
import { apiError } from '../services/api.js';
import { Card, Badge, Button, Textarea, Field, Spinner, NoticeBanner } from './index.js';

/**
 * Review detail with comment thread. Both roles comment through the same
 * endpoint; the server enforces participation by ownership.
 */
export const ReviewThread = ({ reviewId, role, onChanged }) => {
  const [review, setReview] = useState(null);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await mentorApi.review(reviewId);
      setReview(data.review);
    } catch (err) {
      setError(apiError(err).message);
    }
  }, [reviewId]);

  useEffect(() => { load(); }, [load]);

  if (error) return <NoticeBanner>{error}</NoticeBanner>;
  if (!review) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-navy">{review.title}</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {role === 'mentor' ? 'Student' : 'Mentor'}:{' '}
              <span className="font-semibold">{review.studentId?.name || review.mentorId?.name || '—'}</span>
              {' '}· opened {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Badge tone={review.status === 'completed' ? 'green' : 'amber'}>{review.status}</Badge>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Reviewing {(review.evidenceIds || []).length} evidence entr{(review.evidenceIds || []).length === 1 ? 'y' : 'ies'} shared with this grant.</p>
      </Card>

      {role === 'mentor' && review.status === 'open' && (
        <Card className="p-4">
          <p className="flex items-center gap-2 text-xs font-bold text-navy"><Lightbulb className="h-4 w-4 text-blue-600" /> Practice suggestion</p>
          <SuggestionBox reviewId={reviewId} onDone={load} />
        </Card>
      )}

      {role === 'mentor' && (
        <CompleteButton reviewId={reviewId} status={review.status} onComplete={load} />
      )}

      {review.mentorFeedback?.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-bold text-navy">Plan-level feedback given by the mentor</p>
          <ul className="mt-2 space-y-2">
            {review.mentorFeedback.map((f, i) => (
              <li key={i} className="rounded-lg bg-purple-50 p-2.5 text-xs text-purple-900">{f.text}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          <MessageSquare className="h-4 w-4" /> Comments
        </h3>
        <div className="mt-3 space-y-3">
          {(review.comments || []).length === 0 && (
            <p className="text-xs text-slate-500">No comments yet.</p>
          )}
          {(review.comments || []).map((c) => (
            <div key={String(c._id)} className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-navy">
                  <Reply className="h-3 w-3 text-slate-400" />
                  {c.authorId?.name || 'User'}
                  <Badge tone={c.authorRole === 'mentor' ? 'purple' : 'blue'}>{c.authorRole}</Badge>
                </p>
                <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-line text-xs text-slate-700">{c.body}</p>
            </div>
          ))}
        </div>

        <form
          className="mt-4 space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!comment.trim()) return;
            setBusy(true);
            try {
              await mentorApi.comment(reviewId, comment.trim());
              setComment('');
              await load();
              onChanged?.();
            } catch (err) {
              setError(apiError(err).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Add a comment" required>
            <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={4000} placeholder={role === 'mentor' ? 'Concrete, kind feedback on the shared evidence…' : 'Respond to your mentor, or ask a question…'} />
          </Field>
          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
          <div>
            <Button type="submit" loading={busy} size="sm"><Send className="h-3.5 w-3.5" /> Post comment</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const SuggestionBox = ({ reviewId, onDone }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setBusy(true);
        setError('');
        try {
          await mentorApi.suggest(reviewId, text.trim());
          setText('');
          onDone?.();
        } catch (err) {
          setError(apiError(err).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="One concrete practice task the student could do next…" />
      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      <Button type="submit" size="sm" variant="secondary" loading={busy}><Star className="h-3.5 w-3.5" /> Suggest</Button>
    </form>
  );
};

const CompleteButton = ({ reviewId, status, onComplete }) => {
  const [busy, setBusy] = useState(false);
  if (status === 'completed') return null;
  return (
    <div className="flex justify-end">
      <Button
        size="sm"
        variant="dark"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await mentorApi.completeReview(reviewId);
            onComplete?.();
          } finally {
            setBusy(false);
          }
        }}
      >
        <CheckCircle2 className="h-3.5 w-3.5" /> Mark review complete
      </Button>
    </div>
  );
};

export default ReviewThread;
