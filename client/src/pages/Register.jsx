import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/index.js';
import { apiError } from '../services/api.js';
import { Button, Card, Field, Input, NoticeBanner } from '../components/index.js';
import { AuthShell } from './Login.jsx';

export const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', institution: '' });
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setBusy(true);
    try {
      await authApi.register(form);
      setDone(true);
    } catch (err) {
      const er = apiError(err);
      setServerError(er.details?.length ? er.details.map((d) => d.message).join('; ') : er.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Check your inbox" subtitle="One step left before your first sign-in.">
        <NoticeBanner>
          We sent a verification link. In this demo environment email goes to the built-in
          dev inbox — open it below to verify your address.
        </NoticeBanner>
        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={() => navigate(`/verify-email?email=${encodeURIComponent(form.email)}`)}>
            Open verification page
          </Button>
          <Button variant="ghost" onClick={() => navigate('/login')}>Back to sign in</Button>
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-400">
          Registration responses are generic on purpose — the service never reveals whether an
          email address already has an account.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create student account" subtitle="Build your career case from documented evidence.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name" required>
          <Input value={form.name} onChange={set('name')} autoComplete="name" placeholder="Priya Sharma" />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@college.edu" />
        </Field>
        <Field label="Password" required hint="At least 8 characters with letters and numbers.">
          <Input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" placeholder="••••••••" />
        </Field>
        <Field label="Institution" hint="Optional — shown on your account and exports.">
          <Input value={form.institution} onChange={set('institution')} placeholder="Example State University" />
        </Field>
        {serverError && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{serverError}</p>
        )}
        <Button type="submit" loading={busy} className="w-full">Create account</Button>
      </form>
      <p className="mt-4 text-center text-xs font-semibold text-slate-500">
        <Link to="/login" className="hover:text-blue-600">Already have an account? Sign in</Link>
        <span className="mx-2 text-slate-300">|</span>
        <Link to="/register/mentor" className="hover:text-blue-600">Register as a mentor</Link>
      </p>
    </AuthShell>
  );
};

export default Register;
