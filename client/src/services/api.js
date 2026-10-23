import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Double-submit CSRF: read the readable csrf cookie and echo it as a header.
const csrfFromCookie = () => {
  const m = document.cookie.match(/(?:^|; )coach_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
};

api.interceptors.request.use((config) => {
  if (!['get', 'head', 'options'].includes(config.method)) {
    config.headers['X-CSRF-Token'] = csrfFromCookie();
  }
  return config;
});

// Normalized error extraction used by every screen.
export const apiError = (err) => {
  const e = err?.response?.data?.error || err?.response?.data || {};
  return {
    status: err?.response?.status || 0,
    code: e.code || 'NETWORK_ERROR',
    message: e.message || (err?.message === 'Network Error' ? 'Server unreachable — is the backend running?' : err?.message || 'Unexpected error'),
    details: e.details || [],
  };
};

api.interceptors.response.use(undefined, (err) => {
  if (err?.response?.status === 401 && !String(err.config?.url || '').includes('/auth/')) {
    // Session expired; send users to login with a hint.
    window.dispatchEvent(new CustomEvent('coach:session-expired'));
  }
  return Promise.reject(err);
});

export default api;
