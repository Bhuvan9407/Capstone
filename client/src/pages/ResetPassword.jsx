import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/index.js';
import { apiError } from '../services/api.js';
import { Button, Card, Field, Input, NoticeBanner } from '../components/index.js';
import { AuthShell } from './Login.jsx';
import { DevInbox } from '../components/DevInbox.jsx';

export const ResetPassword = () => {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const [form, setForm] = useState({ token: params.get('token') || '', newPassword: '', confirm: '' });
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const mismatch = form.confirm && form.newPassword !== form.confirm
    ? 'Passwords do not match'
    : '';

  const onSubmit = async (e) => {
    e.preventDefault();
    if (mismatch) {
      setServerError(mismatch);
      return;
    }
    setServerError('');
    setBusy(true);
    try {
      await authApi.reset(form.token.trim(), form.newPassword);
      setDone(true);
    } catch (err) {
      setServerError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="Use your new password from now on.">
        <NoticeBanner tone="blue">
          All existing sessions for your account were revoked when the password changed.
        </NoticeBanner>
        <Button className="mt-4 w-full" onClick={() => navigate('/login')}>Go to sign in</Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Paste the token from the reset email, then set a new password.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Reset token" required hint="Copy it from the reset email (the dev inbox below can help).">
          <Input value={form.token} onChange={set('token')} placeholder="Reset token" />
        </Field>
        <Field label="New password" required hint="At least 8 characters with letters and numbers.">
          <Input type="password" value={form.newPassword} onChange={set('newPassword')} autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password" required error={mismatch || undefined}>
          <Input type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
        </Field>
        {serverError && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{serverError}</p>
        )}
        <Button type="submit" loading={busy} className="w-full">Update password</Button>
        <DevInbox />
        <Link to="/login" className="block text-center text-xs font-semibold text-slate-500 hover:text-blue-600">
          Back to sign in
        </Link>
      </form>
    </AuthShell>
  );
};

export default ResetPassword;
