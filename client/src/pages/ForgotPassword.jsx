import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../services/api.js';
import { Button, Field, Input } from '../components/index.js';
import { AuthShell } from './Login.jsx';
import { DevInbox } from '../components/DevInbox.jsx';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setDone(true);
    } catch (err) {
      setServerError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Reset your password" subtitle="We email a single-use reset link valid for 60 minutes.">
      {done ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
            If an account exists for that email, a reset link has been sent. The response is
            identical either way so sign-in pages never reveal which addresses are registered.
          </p>
          <DevInbox title="Dev inbox (local demo mail)" />
          <Link to="/login" className="block text-center text-xs font-semibold text-slate-500 hover:text-blue-600">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@college.edu" />
          </Field>
          {serverError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{serverError}</p>
          )}
          <Button type="submit" loading={busy} className="w-full">Send reset link</Button>
          <Link to="/login" className="block text-center text-xs font-semibold text-slate-500 hover:text-blue-600">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
