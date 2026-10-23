import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, EyeOff } from 'lucide-react';
import { adminApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import {
  PageHeading, Card, Badge, Button, Select, Field, Textarea, Spinner, EmptyState, NoticeBanner,
} from '../../components/index.js';

const REASON_TONES = { abusive: 'rose', plagiarism: 'amber', privacy: 'purple', other: 'slate' };
const STATUS_TONES = { open: 'amber', resolved: 'green', dismissed: 'slate' };

export const AbuseReports = () => {
  const [status, setStatus] = useState('open');
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  const [notice, setNotice] = useState('');
  const [openCard, setOpenCard] = useState(null);
  const [resolution, setResolution] = useState({ note: '' });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    adminApi.reports(status || undefined)
      .then(({ data }) => setState({ loading: false, error: '', items: data.items || [] }))
      .catch((err) => setState({ loading: false, error: apiError(err).message, items: [] }));
  }, [status]);

  useEffect(load, [load]);

  const process = async (reportId, newStatus) => {
    setNotice('');
    try {
      await adminApi.processReport(reportId, newStatus, resolution.note.trim());
      setNotice(`Report marked ${newStatus}.`);
      setOpenCard(null);
      setResolution({ note: '' });
      load();
    } catch (err) {
      setNotice(apiError(err).message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading
        title="Abuse reports"
        subtitle="Reports come from public visitors, students, and mentors. Moderation actions are audited."
        actions={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter reports by status" className="w-40">
            <option value="">all statuses</option>
            <option value="open">open</option>
            <option value="resolved">resolved</option>
            <option value="dismissed">dismissed</option>
          </Select>
        }
      />
      {notice && <div className="mb-4"><NoticeBanner tone="blue">{notice}</NoticeBanner></div>}
      {state.loading && <div className="flex justify-center py-10"><Spinner /></div>}
      {state.items.length === 0 && !state.loading && (
        <EmptyState icon={<ShieldCheck className="h-10 w-10" />} title={status ? `No ${status} reports` : 'No reports'} message="A clear queue is good news." />
      )}

      <div className="space-y-3">
        {state.items.map((r) => {
          const id = String(r._id);
          const open = openCard === id;
          return (
            <Card key={id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-bold text-navy">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    {r.targetKind} <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">{r.targetId}</code>
                    <Badge tone={REASON_TONES[r.reason] || 'slate'}>{r.reason}</Badge>
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{r.detail}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    filed {new Date(r.createdAt).toLocaleString()}{r.reporterId ? ' · signed-in reporter' : ' · anonymous'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONES[r.status] || 'slate'}>{r.status}</Badge>
                  {r.status === 'open' && (
                    <Button size="sm" variant="secondary" onClick={() => setOpenCard(open ? null : id)}>
                      Process
                    </Button>
                  )}
                </div>
              </div>

              {r.status !== 'open' && r.resolutionNote && (
                <p className="mt-2 rounded bg-slate-50 p-2 text-[11px] text-slate-600">Resolution: {r.resolutionNote}</p>
              )}

              {open && r.status === 'open' && (
                <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
                  <Field label="Resolution note" hint="Optional, max 1000 characters.">
                    <Textarea rows={2} value={resolution.note} onChange={(e) => setResolution({ note: e.target.value })} maxLength={1000} />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => process(id, 'resolved')}><CheckCircle2 className="h-3.5 w-3.5" /> Resolve</Button>
                    <Button size="sm" variant="secondary" onClick={() => process(id, 'dismissed')}>Dismiss</Button>
                    <Button size="sm" variant="danger" onClick={() => process(id, 'open')}>Re-open</Button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    To actually disable flagged public content, use <b>Content Moderation</b> — this queue records the decision trail only.
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
