import { useCallback, useEffect, useState } from 'react';
import { UserCheck, KeyRound, Lock } from 'lucide-react';
import { mentorApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import {
  PageHeading, Card, Badge, Button, Field, Input, Spinner, EmptyState, NoticeBanner,
} from '../../components/index.js';

export const MentorInvitations = () => {
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    mentorApi.pendingInvitations()
      .then(({ data }) => setState({ loading: false, error: '', items: data.items || [] }))
      .catch((err) => setState({ loading: false, error: apiError(err).message, items: [] }));
  }, []);

  useEffect(load, [load]);

  const accept = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const { data } = await mentorApi.acceptInvitation(token.trim());
      setToken('');
      setNotice(`${data.message} — grant created with an EMPTY scope. The student adds content on their side.`);
      load();
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading
        title="Invitations"
        subtitle="Students invite you by email; accept with the token from your invitation email (dev inbox in demo mode)."
      />

      <form onSubmit={accept}>
        <Card className="mb-6 p-5">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-navy"><KeyRound className="h-4 w-4 text-blue-600" /> Accept with token</h2>
          <div className="mt-3 flex gap-2">
            <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Invitation token" required />
            <Button type="submit" loading={busy}>Accept</Button>
          </div>
          {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
          {notice && (
            <div className="mt-2"><NoticeBanner tone="blue">{notice}</NoticeBanner></div>
          )}
        </Card>
      </form>

      {state.loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : state.items.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="h-10 w-10" />}
          title="No pending invitations"
          message="Invited students appear here while their token is still valid (7 days)."
        />
      ) : (
        <div className="space-y-3">
          {state.items.map((i) => (
            <Card key={i.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-navy">{i.studentName}</p>
                  {i.note && <p className="mt-0.5 max-w-md text-xs text-slate-600">“{i.note}”</p>}
                  <p className="mt-1 text-[10px] text-slate-400">expires {new Date(i.expiresAt).toLocaleDateString()}</p>
                </div>
                <Badge tone="amber">pending</Badge>
              </div>
            </Card>
          ))}
          <p className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            Accepting creates the grant but shows nothing imprudent — documents only appear once the student grants scope.
          </p>
        </div>
      )}
    </div>
  );
};

export default MentorInvitations;
