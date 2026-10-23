import { useCallback, useEffect, useState } from 'react';
import { Star, ChevronDown, ChevronRight } from 'lucide-react';
import { mentorApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import { PageHeading, Card, Badge, Spinner, NoticeBanner, EmptyState, ErrorState, Button } from '../../components/index.js';
import { ReviewThread } from '../../components/ReviewThread.jsx';

export const MentorReviews = () => {
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  const [openId, setOpenId] = useState(null);

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
        title="Mentor Feedback"
        subtitle="Reviews your verified mentors open over shared evidence. You can always reply in the thread."
      />
      {state.loading && <div className="flex justify-center py-10"><Spinner /></div>}
      {!state.loading && state.error && <ErrorState message={state.error} onRetry={load} />}
      {!state.loading && !state.error && state.items.length === 0 && (
        <EmptyState
          icon={<Star className="h-10 w-10" />}
          title="No reviews yet"
          message="When a mentor you invited opens a review of your shared evidence, it appears here with its comment thread."
          action={<a href="/mentors"><Button variant="secondary">Manage mentors</Button></a>}
        />
      )}
      <div className="space-y-3">
        {state.items.map((r) => {
          const id = String(r._id);
          const open = openId === id;
          return (
            <Card key={id}>
              <button
                onClick={() => setOpenId(open ? null : id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-navy">{r.title}</p>
                  <p className="text-[11px] text-slate-500">
                    mentor: {r.mentorId?.name || '—'} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={r.status === 'completed' ? 'green' : 'amber'}>{r.status}</Badge>
                  {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </div>
              </button>
              {open && <div className="border-t border-slate-100 bg-slate-50/50 p-4"><ReviewThread reviewId={id} role="student" onChanged={load} /></div>}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MentorReviews;
