import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Lock, Save, ShieldCheck, LogOut } from 'lucide-react';
import { authApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  PageHeading, Card, Badge, Button, Field, Input, Textarea, NoticeBanner,
} from '../../components/index.js';

export const AccountSettings = () => {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '', headline: user?.headline || '', bio: user?.bio || '', institution: user?.institution || '',
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [profileBusy, setProfileBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [pwError, setPwError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setPW = (k) => (e) => setPw((p) => ({ ...p, [k]: e.target.value }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileBusy(true);
    setError('');
    setNotice('');
    try {
      await authApi.updateMe(form);
      await refresh();
      setNotice('Profile saved.');
    } catch (err) {
      const er = apiError(err);
      setError(er.details?.length ? er.details.map((d) => d.message).join('; ') : er.message);
    } finally {
      setProfileBusy(false);
    }
  };

  const changePw = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pw.newPassword !== pw.confirm) {
      setPwError('New passwords do not match');
      return;
    }
    setPwBusy(true);
    try {
      await authApi.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      await logout();
      navigate('/login?reason=expired');
    } catch (err) {
      setPwError(apiError(err).message);
      setPwBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading
        title="Account settings"
        subtitle="Your profile details are shared with mentors only through what you explicitly grant."
        actions={<Badge tone="blue">{user?.role || 'student'}</Badge>}
      />

      {notice && <div className="mb-4"><NoticeBanner tone="blue">{notice}</NoticeBanner></div>}
      {error && <div className="mb-4"><NoticeBanner>{error}</NoticeBanner></div>}

      <form onSubmit={saveProfile}>
        <Card className="mb-6 p-5">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-navy"><Settings className="h-4 w-4 text-blue-600" /> Profile</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <Input value={form.name} onChange={set('name')} />
            </Field>
            <Field label="Institution">
              <Input value={form.institution} onChange={set('institution')} />
            </Field>
          </div>
          <Field label="Headline" className="mt-4">
            <Input value={form.headline} onChange={set('headline')} maxLength={140} placeholder="e.g. CS junior focused on backend systems" />
          </Field>
          <Field label="Bio" className="mt-4" hint="Max 800 characters.">
            <Textarea rows={4} value={form.bio} onChange={set('bio')} maxLength={800} />
          </Field>
          <div className="mt-4">
            <Button type="submit" loading={profileBusy}><Save className="h-4 w-4" /> Save profile</Button>
          </div>
        </Card>
      </form>

      <form onSubmit={changePw}>
        <Card className="mb-6 p-5">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-navy"><Lock className="h-4 w-4 text-blue-600" /> Change password</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Changing your password revokes ALL other sessions immediately (including this one — you will be signed out).
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Current password" required>
              <Input type="password" value={pw.currentPassword} onChange={setPW('currentPassword')} autoComplete="current-password" />
            </Field>
            <Field label="New password" required hint="8+ chars, letters and numbers.">
              <Input type="password" value={pw.newPassword} onChange={setPW('newPassword')} autoComplete="new-password" />
            </Field>
            <Field label="Confirm new" required>
              <Input type="password" value={pw.confirm} onChange={setPW('confirm')} autoComplete="new-password" />
            </Field>
          </div>
          {pwError && <p className="mt-2 text-xs font-semibold text-rose-600">{pwError}</p>}
          <div className="mt-4">
            <Button type="submit" variant="dark" loading={pwBusy}><ShieldCheck className="h-4 w-4" /> Update password</Button>
          </div>
        </Card>
      </form>

      <Card className="p-5">
        <h2 className="text-sm font-extrabold text-navy">Session</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Sessions are opaque, hashed server-side records — no user data is stored inside the cookie.
        </p>
        <Button
          variant="secondary"
          className="mt-3"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </Card>
    </div>
  );
};

export default AccountSettings;
