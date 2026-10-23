import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../services/index.js';
import { apiError } from '../services/api.js';
import { Button, Field, Input, NoticeBanner } from '../components/index.js';
import { AuthShell } from './Login.jsx';

export const MentorRegister = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', title: '' });
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setBusy(true);
    try {
      await authApi.registerMentor(form);
      setDone(true);
    } catch (err) {
      const er = apiError(err);
      setServerError(er.details?.length ? er.details.map((d) => d.message).join('; ') : er.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Register as a mentor" subtitle="Mentor access starts after an administrator verifies your account.">
      {done ? (
        <NoticeBanner tone="blue">
          Request received. An administrator verifies mentor accounts before any student
          access is possible — sign-in alone grants nothing until verification completes.
        </NoticeBanner>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Full name" required>
            <Input value={form.name} onChange={set('name')} autoComplete="name" />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={form.email} onChange={set('email')} autoComplete="email" />
          </Field>
          <Field label="Password" required hint="At least 8 characters with letters and numbers.">
            <Input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
          </Field>
          <Field label="Short title / affiliation" hint="Optional — e.g. 'Senior Engineer, Example Corp'.">
            <Input value={form.title} onChange={set('title')} />
          </Field>
          {serverError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{serverError}</p>
          )}
          <Button type="submit" loading={busy} className="w-full">Submit mentor request</Button>
        </form>
      )}
      <p className="mt-4 text-center text-xs font-semibold text-slate-500">
        <Link to="/register" className="hover:text-blue-600">Student sign-up instead</Link>
        <span className="mx-2 text-slate-300">|</span>
        <Link to="/login" className="hover:text-blue-600">Sign in</Link>
      </p>
    </AuthShell>
  );
};

export default MentorRegister;
