import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap } from 'lucide-react';
import { authApi } from '../services/index.js';
import { apiError } from '../services/api.js';
import { Button, Card, Field, Input } from '../components/index.js';
import { useAuth } from '../context/AuthContext.jsx';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await authApi.login(values);
      const me = await refresh();
      const to =
        me?.role === 'admin' ? '/admin' : me?.role === 'mentor' ? '/mentor' : '/dashboard';
      navigate(location.state?.from || to, { replace: true });
    } catch (err) {
      const e = apiError(err);
      if (e.code === 'EMAIL_UNVERIFIED') navigate(`/verify-email?email=${encodeURIComponent(values.email)}`);
      setServerError(e.message);
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Welcome back — continue with your evidence.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Email" required error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@college.edu" {...register('email')} />
        </Field>
        <Field label="Password" required error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} />
        </Field>
        {serverError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{serverError}</p>}
        <Button type="submit" loading={isSubmitting} className="w-full">Sign in</Button>
      </form>
      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
        <Link to="/forgot-password" className="hover:text-blue-600">Forgot password?</Link>
        <Link to="/register" className="hover:text-blue-600">Create student account</Link>
      </div>
      {new URLSearchParams(location.search).get('reason') === 'expired' && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Your session expired — sign in again.</p>
      )}
    </AuthShell>
  );
};

export const AuthShell = ({ title, subtitle, children }) => (
  <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
    <div className="w-full max-w-md">
      <Link to="/" className="mb-6 flex items-center justify-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-card"><GraduationCap className="h-5 w-5" /></span>
        <span className="text-base font-extrabold text-navy">Career Evidence and Portfolio Coach</span>
      </Link>
      <Card className="p-6 sm:p-8">
        <h1 className="text-xl font-extrabold text-navy">{title}</h1>
        <p className="mb-5 mt-1 text-sm text-slate-500">{subtitle}</p>
        {children}
      </Card>
    </div>
  </div>
);
