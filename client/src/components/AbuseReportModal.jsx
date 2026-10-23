import { useState } from 'react';
import { publicApi } from '../services/index.js';
import { apiError } from '../services/api.js';
import { Button, Field, Select, Textarea, NoticeBanner } from './index.js';

const REASONS = [
  ['abusive', 'Abusive or harassing content'],
  ['plagiarism', 'Plagiarism / fabricated evidence'],
  ['privacy', 'Private information exposed'],
  ['other', 'Something else'],
];

/** Public abuse reporting — students, mentors, and anonymous visitors can file. */
export const AbuseReportModal = ({ open, onClose, targetKind, targetId }) => {
  const [reason, setReason] = useState('abusive');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (detail.trim().length < 10) {
      setError('Please describe the problem (at least 10 characters).');
      return;
    }
    setBusy(true);
    try {
      await publicApi.report({ targetKind, targetId, reason, detail: detail.trim() });
      setDone(true);
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-navy/60" onClick={() => !busy && onClose()} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-pop">
        <h2 className="text-lg font-extrabold text-navy">Report this content</h2>
        <p className="mt-1 text-xs text-slate-500">
          Reports go to staff moderators. No automated action is taken on the report alone.
        </p>
        {done ? (
          <>
            <NoticeBanner tone="blue">Report received. A moderator will review it.</NoticeBanner>
            <Button className="mt-4 w-full" onClick={onClose}>Close</Button>
          </>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <Field label="Reason" required>
              <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </Select>
            </Field>
            <Field label="Details" required>
              <Textarea rows={4} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="What is wrong with this content?" />
            </Field>
            {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" loading={busy} variant="danger" className="flex-1">Submit report</Button>
              <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AbuseReportModal;
