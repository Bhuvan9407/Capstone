import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, ShieldCheck, HeartPulse, ScrollText } from 'lucide-react';
import { adminApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import { PageHeading, Card, Badge, Spinner, NoticeBanner } from '../../components/index.js';

export const AdminDashboard = () => {
  const [state, setState] = useState({ loading: true, error: '', health: null, pending: 0 });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const [{ data: health }, { data: mentors }] = await Promise.all([
        adminApi.health(),
        adminApi.pendingMentors(),
      ]);
      setState({ loading: false, error: '', health, pending: (mentors.items || []).length });
    } catch (err) {
      setState({ loading: false, error: apiError(err).message, health: null, pending: 0 });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const h = state.health;
  const cards = h
    ? [
        { icon: ShieldCheck, label: 'Open abuse reports', value: h.abuse?.openReports, to: '/admin/abuse', tone: 'amber' },
        { icon: BadgeCheck, label: 'Mentors awaiting verification', value: state.pending, to: '/admin/mentors', tone: 'blue' },
        { icon: HeartPulse, label: 'Database', value: h.db?.healthy ? 'healthy' : 'unhealthy', to: '/admin/health', tone: h.db?.healthy ? 'green' : 'rose' },
        { icon: HeartPulse, label: 'Agent runs', value: `${h.agent?.runningRuns ?? 0} running / ${h.agent?.failedRuns ?? 0} failed`, to: '/admin/health', tone: 'slate' },
      ]
    : [];

  return (
    <div>
      <PageHeading
        title="Admin overview"
        subtitle="Operational state of the platform. Admins NEVER gain automatic access to student private documents."
      />
      <div className="mb-4">
        <NoticeBanner>
          <b>Least-privilege reminder:</b> the admin role can verify mentors and moderate public content, but
          cannot read private evidence, resumes, chats, or grants — those belong to students and their
          chosen mentors only.
        </NoticeBanner>
      </div>

      {state.loading && <div className="flex justify-center py-10"><Spinner /></div>}
      {state.error && <NoticeBanner>{state.error}</NoticeBanner>}

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <a key={c.label} href={c.to}>
            <Card className="flex items-center gap-4 p-5 transition hover:shadow-pop">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><c.icon className="h-5 w-5" /></span>
              <div>
                <p className="text-lg font-extrabold text-navy">{c.value ?? '—'}</p>
                <p className="text-xs font-bold text-slate-600">{c.label}</p>
              </div>
            </Card>
          </a>
        ))}
      </div>

      {h?.counts && (
        <Card className="mt-4 p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Totals</h2>
          <p className="mt-2 flex flex-wrap gap-2">
            <Badge tone="slate">users {h.counts.users}</Badge>
            <Badge tone="slate">sessions {h.counts.sessions}</Badge>
            <Badge tone="slate">reviews {h.counts.reviews}</Badge>
            <Badge tone="slate">active grants {h.counts.activeGrants}</Badge>
          </p>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
