import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FolderOpen, Star, UserCheck, ArrowRight, ShieldQuestion } from 'lucide-react';
import { mentorApi, authApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  PageHeading, Card, Badge, Button, EmptyState, Spinner, NoticeBanner,
} from '../../components/index.js';

export const MentorDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ grants: 0, invites: 0, reviews: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [g, inv, r] = await Promise.all([
        mentorApi.grants(),
        mentorApi.pendingInvitations(),
        mentorApi.reviews(),
      ]);
      setStats({
        grants: (g.data.items || []).length,
        invites: (inv.data.items || []).length,
        reviews: (r.data.items || []).length,
      });
      setLoading(false);
    } catch (err) {
      setError(apiError(err).message);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cards = [
    { to: '/mentor/invitations', label: 'Pending invitations', icon: UserCheck, count: stats.invites, hint: 'Students waiting on your accept token' },
    { to: '/mentor/shared', label: 'Active grants', icon: FolderOpen, count: stats.grants, hint: 'Evidence students explicitly shared' },
    { to: '/mentor/reviews', label: 'Reviews', icon: Star, count: stats.reviews, hint: 'Open and completed reviews' },
  ];

  return (
    <div>
      <PageHeading
        title={`Mentor workspace — ${user?.name?.split(' ')[0] || 'mentor'}`}
        subtitle="You only ever see what each student explicitly shared; access can be revoked by them at any moment."
        actions={<Badge tone={user?.mentorVerified ? 'green' : 'amber'}>{user?.mentorVerified ? 'verified mentor' : 'awaiting verification'}</Badge>}
      />

      {!user?.mentorVerified && (
        <div className="mb-4">
          <NoticeBanner>
            <ShieldQuestion className="mr-1 inline h-3.5 w-3.5" />
            An administrator must verify your mentor account before invitation acceptance and reviews work.
          </NoticeBanner>
        </div>
      )}

      {error && <div className="mb-4"><NoticeBanner>{error}</NoticeBanner></div>}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.to} to={c.to}>
              <Card className="p-5 transition hover:shadow-pop" role="link">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <c.icon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-3xl font-extrabold text-navy">{c.count}</p>
                <p className="flex items-center gap-1 text-sm font-bold text-navy">{c.label} <ArrowRight className="h-3.5 w-3.5 text-slate-300" /></p>
                <p className="mt-1 text-[11px] text-slate-500">{c.hint}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6">
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Mentor access rules"
          message="Students control sharing. You can comment on reviews of shared evidence and leave feedback on confirmed plans of students you mentor — read-only influence, never editing."
          action={null}
        />
      </div>
    </div>
  );
};

export default MentorDashboard;
