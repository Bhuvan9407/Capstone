import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, ShieldOff } from 'lucide-react';
import { adminApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  PageHeading, Card, Badge, Button, Spinner, EmptyState, ErrorState, NoticeBanner,
} from '../../components/index.js';

export const MentorVerification = () => {
  const { refresh } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    adminApi.pendingMentors()
      .then(({ data }) => setState({ loading: false, error: '', items: data.items || [] }))
      .catch((err) => setState({ loading: false, error: apiError(err).message, items: [] }));
  }, []);

  useEffect(load, [load]);

  const decide = async (mentorId, verified) => {
    setBusyId(mentorId);
    setNotice('');
    try {
      const { data } = await adminApi.verifyMentor(mentorId, verified);
      setNotice(
        verified
          ? `${data.mentor?.name || 'Mentor'} verified. They can now accept invitation tokens.`
          : 'Mentor marked unverified — their grants cannot be used until approved.'
      );
      load();
      refresh();
    } catch (err) {
      setNotice(apiError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading
        title="Mentor verification"
        subtitle="Mentor self-registrations wait here. Verified mentors can accept invitations; unverified mentors can do nothing with student data."
      />
      {notice && <div className="mb-4"><NoticeBanner tone="blue">{notice}</NoticeBanner></div>}
      {state.loading && <div className="flex justify-center py-10"><Spinner /></div>}
      {!state.loading && state.error && <ErrorState message={state.error} onRetry={load} />}
      {!state.loading && !state.error && state.items.length === 0 && (
        <EmptyState
          icon={<BadgeCheck className="h-10 w-10" />}
          title="No pending mentors"
          message="New mentor sign-ups land here for manual staff approval."
        />
      )}
      <div className="space-y-3">
        {state.items.map((m) => (
          <Card key={String(m._id)} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-bold text-navy">{m.name}</p>
              <p className="text-[11px] text-slate-500">{m.email}{m.mentorBio ? ` · ${m.mentorBio}` : ''}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">registered {new Date(m.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => decide(String(m._id), true)} loading={busyId === String(m._id)}>
                <BadgeCheck className="h-3.5 w-3.5" /> Verify
              </Button>
              <Button size="sm" variant="danger" onClick={() => decide(String(m._id), false)} disabled={busyId === String(m._id)}>
                <ShieldOff className="h-3.5 w-3.5" /> Reject
              </Button>
            </div>
            <div className="w-full">
              <Badge tone="amber">pending</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MentorVerification;
