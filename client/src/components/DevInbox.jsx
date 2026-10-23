import { useEffect, useState } from 'react';
import { Inbox, ExternalLink } from 'lucide-react';
import { authApi } from '../services/index.js';
import { SpinIcon } from './icons.jsx';

/**
 * Development-only inbox viewer. In this environment the app has no real SMTP
 * provider, so verification / reset mail is captured by the server's dev inbox
 * adapter (GET /api/auth/dev-inbox, enabled when NODE_ENV is dev or test).
 * This component is honest about what it is: a local demo transport, not a
 * production mail feature.
 */
export const DevInbox = ({ title = 'Dev inbox (local demo mail)' }) => {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    authApi.devInbox()
      .then(({ data }) => setItems(data.items || []))
      .catch(() => setError('Dev inbox is unavailable (production or server offline).'));
  }, []);

  if (error) return null;
  if (!items) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <SpinIcon className="h-3 w-3" /> Loading dev inbox…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        <Inbox className="h-3.5 w-3.5" /> {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">No mail captured yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.slice(0, 6).map((m) => (
            <li key={m._id} className="rounded-lg bg-white px-3 py-2 shadow-card">
              <p className="text-[11px] font-bold text-navy">{m.subject}</p>
              <p className="text-[10px] text-slate-500">to {m.to} · {new Date(m.createdAt).toLocaleTimeString()}</p>
              {m.actionUrl && (
                <a
                  href={m.actionUrl}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  Open link <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DevInbox;
