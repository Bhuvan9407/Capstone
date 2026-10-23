import { useCallback, useEffect, useState } from 'react';
import { Plus, Send, Trash2, KeyRound, Save, Inbox } from 'lucide-react';
import { mentorApi, evidenceApi, resumeApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import {
  PageHeading, Card, Badge, Button, Field, Input, Textarea, Spinner, NoticeBanner, EmptyState,
} from '../../components/index.js';

/**
 * Students manage two things here:
 *  1. Invitations — emails to mentors; a verified mentor accepts with the token
 *     from the email, which creates the grant (empty scope at first).
 *  2. Grants — the exact scope (evidence ids + resume ids) any mentor can read.
 *     POST /api/grants replace-upserts the scope for a given mentor pair.
 */
export const Mentors = () => {
  const [invites, setInvites] = useState(null);
  const [grants, setGrants] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [inv, gr] = await Promise.all([mentorApi.myInvitations(), mentorApi.grants()]);
      setInvites(inv.data.items || []);
      setGrants(gr.data.items || []);
    } catch (err) {
      setError(apiError(err).message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading
        title="Mentors"
        subtitle="Invite mentors, then decide exactly which of your evidence and resumes they can read. Nothing is shared until you say so."
      />
      {error && <div className="mb-4"><NoticeBanner>{error}</NoticeBanner></div>}
      {notice && <div className="mb-4"><NoticeBanner tone="blue">{notice}</NoticeBanner></div>}

      <InvitePanel onSent={(msg) => { setNotice(msg); load(); }} />

      <Invitations invites={invites} reload={load} />

      <Grants grants={grants} reload={load} />

      <EmptyState
        icon={<Inbox className="h-8 w-8" />}
        title="How sharing works"
        message="An accepted invitation creates an EMPTY grant — the mentor can chat with you but sees no documents until you tick them below. Revoking a grant removes API and retrieval access immediately."
      />
    </div>
  );
};

const InvitePanel = ({ onSent }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ mentorEmail: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await mentorApi.invite(form);
      setForm({ mentorEmail: '', note: '' });
      setOpen(false);
      onSent('Invitation sent. The mentor accepts it with the token emailed to them (dev inbox in demo mode).');
    } catch (err) {
      const er = apiError(err);
      setError(er.details?.length ? er.details.map((d) => d.message).join('; ') : er.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-6 p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-navy">
          <Send className="h-4 w-4 text-blue-600" /> Invite a mentor
        </h2>
        {!open && <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Invite</Button>}
      </div>
      {open && (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <Field label="Mentor email" required hint="Only verified mentors can accept. An unverified mentor's account must be approved by staff first.">
            <Input type="email" value={form.mentorEmail} onChange={(e) => setForm((f) => ({ ...f, mentorEmail: e.target.value }))} placeholder="mentor@example.org" />
          </Field>
          <Field label="Note" hint="Shown to the mentor when accepting.">
            <Textarea rows={2} maxLength={400} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="I'd like feedback on my Node.js portfolio projects." />
          </Field>
          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={busy}>Send invitation</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </Card>
  );
};

const Invitations = ({ invites, reload }) => {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const revoke = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await mentorApi.revokeInvitation(id);
      reload();
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  if (!invites) return null;

  return (
    <Card className="mb-6 p-5">
      <h2 className="text-sm font-extrabold text-navy">Invitations</h2>
      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
      {invites.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">None sent yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-navy">{i.mentorEmail}</p>
                <p className="text-[10px] text-slate-500">
                  sent {new Date(i.createdAt).toLocaleDateString()} · expires {new Date(i.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={i.status === 'pending' ? 'amber' : i.status === 'accepted' ? 'green' : 'slate'}>{i.status}</Badge>
                {i.status === 'pending' && (
                  <Button size="sm" variant="secondary" onClick={() => revoke(i.id)} disabled={busyId === i.id}>
                    Revoke
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

const Grants = ({ grants, reload }) => {
  const [evidence, setEvidence] = useState(null);
  const [resumes, setResumes] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    Promise.all([evidenceApi.list({ limit: 100 }), resumeApi.list()])
      .then(([e, r]) => {
        setEvidence(e.data.items || []);
        setResumes(r.data.items || []);
      })
      .catch(() => {
        setEvidence([]);
        setResumes([]);
      });
  }, []);

  if (!grants) return null;

  return (
    <Card className="mb-6 p-5">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-navy">
        <KeyRound className="h-4 w-4 text-blue-600" /> Sharing scope
      </h2>
      <p className="mt-1 text-[11px] text-slate-500">
        Editing a scope REPLACES it with the exact selection you save — full control, no surprises.
      </p>
      {grants.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">
          No active grants yet. When a verified mentor accepts your invitation, an empty grant appears here for you to fill.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {grants.map((g) => {
            const id = String(g._id || g.id);
            const mentor = g.mentorId;
            const mentorName = typeof mentor === 'object' ? mentor?.name : mentor;
            const mentorId = typeof mentor === 'object' ? String(mentor?._id) : String(mentor);
            const verified = typeof mentor === 'object' ? mentor?.mentorVerified : false;
            return (
              <li key={id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-navy">{mentorName || 'Mentor'}{verified && <Badge tone="green" className="ml-1.5">verified</Badge>}</p>
                    <p className="text-[10px] text-slate-500">
                      {(g.evidenceIds || []).length} evidence · {(g.resumeIds || []).length} resumes
                      {g.note ? ` · “${g.note}”` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {editingId !== id && (
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(id)}>Adjust scope</Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={async () => {
                        try {
                          const { data } = await mentorApi.revokeGrant(id);
                          reload();
                          // server message explains the effect
                          void data;
                        } catch { /* reload below regardless */ }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Revoke
                    </Button>
                  </div>
                </div>
                {editingId === id && (
                  <ScopeEditor
                    grant={{ mentorId, note: g.note || '' }}
                    evidence={evidence || []}
                    resumes={resumes || []}
                    initial={{
                      evidenceIds: (g.evidenceIds || []).map(String),
                      resumeIds: (g.resumeIds || []).map(String),
                    }}
                    onDone={() => { setEditingId(null); reload(); }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

const ScopeEditor = ({ grant, evidence, resumes, initial, onDone }) => {
  const [checked, setChecked] = useState({
    evidenceIds: new Set(initial.evidenceIds),
    resumeIds: new Set(initial.resumeIds),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = (kind, id) =>
    setChecked((c) => {
      const next = new Set(c[kind]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...c, [kind]: next };
    });

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await mentorApi.saveGrant({
        mentorId: grant.mentorId,
        evidenceIds: [...checked.evidenceIds],
        resumeIds: [...checked.resumeIds],
        note: grant.note,
      });
      onDone();
    } catch (err) {
      setError(apiError(err).message);
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3">
      {evidence.length === 0 && resumes.length === 0 ? (
        <p className="text-xs text-slate-500">You have no evidence or resumes to share yet.</p>
      ) : (
        <>
          {evidence.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Evidence entries</p>
              <div className="max-h-40 space-y-0.5 overflow-y-auto rounded bg-white p-1">
                {evidence.map((e) => (
                  <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-blue-50/50">
                    <input
                      type="checkbox"
                      checked={checked.evidenceIds.has(e.id)}
                      onChange={() => toggle('evidenceIds', e.id)}
                      className="h-3.5 w-3.5 accent-blue-600"
                    />
                    <span className="truncate font-semibold text-navy">{e.title}</span>
                    <Badge tone="slate">{e.kind}</Badge>
                    {e.status === 'draft' && <Badge tone="amber">draft</Badge>}
                  </label>
                ))}
              </div>
            </div>
          )}
          {resumes.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Resumes</p>
              <div className="max-h-28 space-y-0.5 overflow-y-auto rounded bg-white p-1">
                {resumes.map((r) => (
                  <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-blue-50/50">
                    <input
                      type="checkbox"
                      checked={checked.resumeIds.has(r.id)}
                      onChange={() => toggle('resumeIds', r.id)}
                      className="h-3.5 w-3.5 accent-blue-600"
                    />
                    <span className="truncate font-semibold text-navy">{r.fileName}</span>
                    <Badge tone={r.status === 'ready' ? 'green' : 'amber'}>{r.status}</Badge>
                  </label>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={save} loading={busy}>
          <Save className="h-3.5 w-3.5" /> Save scope
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
};

export default Mentors;
