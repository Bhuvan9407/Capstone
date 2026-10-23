import { useCallback, useEffect, useState } from 'react';
import { HeartPulse, Database, Bot, RefreshCw } from 'lucide-react';
import { adminApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import { PageHeading, Card, Badge, Button, Spinner, NoticeBanner } from '../../components/index.js';

export const AdminHealth = () => {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [at, setAt] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data } = await adminApi.health();
      setState({ loading: false, error: '', data });
      setAt(new Date());
    } catch (err) {
      setState({ loading: false, error: apiError(err).message, data: null });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const h = state.data;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading
        title="Service health"
        subtitle="A read-only operational snapshot. AI service state is reported as-is — offline means offline."
        actions={
          <Button size="sm" variant="secondary" onClick={load} loading={state.loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />
      {at && !state.loading && (
        <p className="mb-3 text-[11px] text-slate-400">checked {at.toLocaleTimeString()}</p>
      )}
      {state.loading && !h && <div className="flex justify-center py-10"><Spinner /></div>}
      {state.error && <NoticeBanner>{state.error}</NoticeBanner>}

      {h && (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-navy"><Database className="h-4 w-4 text-blue-600" /> Database</h2>
            <div className="mt-3 flex items-center gap-3">
              <Badge tone={h.db?.healthy ? 'green' : 'rose'}>{h.db?.healthy ? 'connected' : `state ${h.db?.state ?? '?'}`}</Badge>
              <span className="text-xs text-slate-500">MongoDB connection readyState {h.db?.state}</span>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-navy"><Bot className="h-4 w-4 text-blue-600" /> Bounded agent</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone={(h.agent?.runningRuns || 0) > 0 ? 'amber' : 'slate'}>{h.agent?.runningRuns ?? 0} running</Badge>
              <Badge tone={(h.agent?.failedRuns || 0) > 0 ? 'rose' : 'green'}>{h.agent?.failedRuns ?? 0} failed</Badge>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Runs are bounded (max steps + wall-clock budget). A failed tool call is recorded and never reported as success.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-navy"><HeartPulse className="h-4 w-4 text-blue-600" /> Totals</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(h.counts || {}).map(([k, v]) => <Badge key={k} tone="slate">{k}: {v}</Badge>)}
              <Badge tone={h.abuse?.openReports > 0 ? 'amber' : 'green'}>open abuse reports: {h.abuse?.openReports ?? 0}</Badge>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminHealth;
