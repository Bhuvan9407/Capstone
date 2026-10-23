import { useCallback, useEffect, useState } from 'react';
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import { PageHeading, Card, Badge, Button, EmptyState, Spinner, NoticeBanner } from '../../components/index.js';

const ACTION_TONES = {
  'mentor.verified': 'green',
  'mentor.unverified': 'amber',
  'abuse.processed': 'blue',
  'abuse.filed': 'amber',
  'portfolio.disable': 'rose',
  'portfolio.enable': 'green',
  'comment.disable': 'rose',
  'comment.enable': 'green',
  'password.reset': 'purple',
};

export const AuditEvents = () => {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', data: null });

  const load = useCallback(async (p) => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data } = await adminApi.audit(p);
      setState({ loading: false, error: '', data });
    } catch (err) {
      setState({ loading: false, error: apiError(err).message, data: null });
    }
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const data = state.data;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading
        title="Audit events"
        subtitle="Append-only operational trail: verifications, moderation, abuse processing, password resets."
      />
      {state.loading && !data && <div className="flex justify-center py-10"><Spinner /></div>}
      {state.error && <NoticeBanner>{state.error}</NoticeBanner>}

      {state.loading && data && <p className="mb-2 text-center text-xs text-slate-400">Loading…</p>}
      {data?.items?.length === 0 && <EmptyState icon={<ScrollText className="h-10 w-10" />} title="No audit events" />}

      <div className="space-y-2">
        {(data?.items || []).map((a) => (
          <Card key={String(a._id)} className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-bold text-navy">
                <Badge tone={ACTION_TONES[a.action] || 'slate'}>{a.action}</Badge>
                <span className="text-slate-600">
                  {a.actor?.name || 'system'}
                  {a.targetType ? ` → ${a.targetType}` : ''}
                  {a.detail && Object.keys(a.detail).length ? ` (${JSON.stringify(a.detail)})` : ''}
                </span>
              </p>
              <span className="text-[10px] text-slate-400">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          </Card>
        ))}
      </div>

      {data && data.total > 50 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </Button>
          <span className="text-xs font-semibold text-slate-500">page {page} of {Math.ceil(data.total / 50)} ({data.total} events)</span>
          <Button size="sm" variant="secondary" disabled={page >= Math.ceil(data.total / 50)} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AuditEvents;
