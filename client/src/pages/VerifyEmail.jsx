import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/index.js';
import { apiError } from '../services/api.js';
import { Button, Card, Field, Input, NoticeBanner } from '../components/index.js';
import { AuthShell } from './Login.jsx';
import { DevInbox } from '../components/DevInbox.jsx';

export const VerifyEmail = () => {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const [token, setToken] = useState(params.get('token') || '');
  const [state, setState] = useState({ status: params.get('token') ? 'working' : 'idle', message: '' });

  const verify = async (t) => {
    setState({ status: 'working', message: '' });
    try {
      const { data } = await authApi.verifyEmail(t);
      setState({ status: 'done', message: data.message || 'Email verified. You can sign in now.' });
    } catch (err) {
      setState({ status: 'error', message: apiError(err).message });
    }
  };

  useEffect(() => {
    if (params.get('token')) verify(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthShell title="Verify your email" subtitle="Verification is required before your first sign-in.">
      <div className="space-y-4">
        {state.status === 'working' && <NoticeBanner tone="blue">Checking your verification link…</NoticeBanner>}
        {state.status === 'done' && (
          <div className="space-y-3">
            <NoticeBanner tone="blue">{state.message}</NoticeBanner>
            <Button className="w-full" onClick={() => navigate('/login')}>Go to sign in</Button>
          </div>
        )}
        {state.status === 'error' && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{state.message}</p>
        )}
        {state.status === 'idle' && (
          <Card className="p-4">
            <p className="mb-2 text-xs text-slate-500">
              Open the verification link from your email, or paste the token here.
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                verify(token.trim());
              }}
            >
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Verification token"
                aria-label="Verification token"
              />
              <Button type="submit" loading={state.status === 'working'}>Verify</Button>
            </form>
          </Card>
        )}
        <DevInbox />
        <p className="text-center text-xs font-semibold text-slate-500">
          <Link to="/login" className="hover:text-blue-600">Back to sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default VerifyEmail;
