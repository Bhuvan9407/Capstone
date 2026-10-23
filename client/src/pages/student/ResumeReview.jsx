import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Upload, RefreshCw, Trash2, CloudUpload, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { resumeApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import {
  PageHeading, Card, Badge, Button, EmptyState, ErrorState, Spinner, NoticeBanner,
} from '../../components/index.js';

const STATUS_META = {
  uploaded: { tone: 'slate', icon: CloudUpload, label: 'Uploaded' },
  extracting: { tone: 'amber', icon: Loader2, label: 'Extracting text' },
  embedding: { tone: 'amber', icon: Loader2, label: 'Embedding chunks' },
  ready: { tone: 'green', icon: CheckCircle2, label: 'Ready' },
  failed: { tone: 'rose', icon: XCircle, label: 'Failed' },
};

const bytes = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round((n || 0) / 1024)} KB`);

export const ResumeReview = () => {
  const [state, setState] = useState({ loading: true, error: '', data: { items: [], embedCounts: {} } });
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data } = await resumeApi.list();
      setState({ loading: false, error: '', data });
      // While something is processing, poll quietly until it settles.
      const active = data.items.some((i) => ['uploaded', 'extracting', 'embedding'].includes(i.status));
      if (active && !pollRef.current) {
        pollRef.current = setTimeout(() => {
          pollRef.current = null;
          load();
        }, 4000);
      }
    } catch (err) {
      setState({ loading: false, error: apiError(err).message, data: { items: [], embedCounts: {} } });
    }
  }, []);

  useEffect(() => {
    load();
    return () => clearTimeout(pollRef.current);
  }, [load]);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/\.(pdf|docx?|txt|md)$/i.test(file.name)) {
      setNotice('Supported formats: PDF, DOCX, TXT, MD.');
      return;
    }
    setNotice('');
    setUploading(true);
    setProgress(0);
    try {
      await resumeApi.upload(file, setProgress);
      await load();
    } catch (err) {
      setNotice(apiError(err).message);
    } finally {
      setUploading(false);
    }
  };

  const reprocess = async (id) => {
    setBusyId(id);
    setNotice('');
    try {
      await resumeApi.reprocess(id);
      setNotice('Reprocessing replaces the old chunks rather than duplicating them.');
      await load();
    } catch (err) {
      setNotice(`Reprocess failed: ${apiError(err).message}`);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    setBusyId(id);
    try {
      await resumeApi.remove(id);
      await load();
    } catch (err) {
      setNotice(apiError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading
        title="Resume Review"
        subtitle="Upload a resume so its real content (not claims) becomes part of your evidence base."
        actions={
          <>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.md" className="hidden" onChange={onUpload} />
            <Button onClick={() => fileRef.current?.click()} loading={uploading}>
              <Upload className="h-4 w-4" /> Upload resume
            </Button>
          </>
        }
      />
      {uploading && progress > 0 && progress < 100 && (
        <div className="mb-4 h-1.5 overflow-hidden rounded bg-slate-100">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <NoticeBanner tone="amber">{notice}</NoticeBanner>
        </div>
      )}

      {state.loading && <div className="flex justify-center py-10"><Spinner /></div>}
      {!state.loading && state.error && <ErrorState message={state.error} onRetry={load} />}

      {!state.loading && !state.error && state.data.items.length === 0 && (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No resumes yet"
          message="Your resume text is used for retrieval and evidence cross-checks. Only you and mentors you grant access can read it."
        />
      )}

      <div className="space-y-3">
        {state.data.items.map((r) => {
          const meta = STATUS_META[r.status] || STATUS_META.uploaded;
          const Icon = meta.icon;
          const embed = state.data.embedCounts[r.id];
          return (
            <Card key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                r.status === 'failed' ? 'bg-rose-50 text-rose-600' : r.status === 'ready' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
              }`}>
                <Icon className={`h-5 w-5 ${r.status === 'extracting' || r.status === 'embedding' ? 'animate-pulse' : ''}`} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-navy">{r.fileName}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                  <span>{bytes(r.sizeBytes)}</span>
                  <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  {embed && <span>{embed.embedded ?? 0}/{embed.chunks ?? 0} chunks embedded</span>}
                  {r.skills && r.skills.length > 0 && <span>{r.skills.length} skills found</span>}
                </p>
                {r.error && <p className="mt-1 text-[11px] font-semibold text-rose-600">Error: {r.error}</p>}
                {r.status === 'failed' && (
                  <p className="mt-1 text-[10px] text-slate-400">
                    Failed resumes are marked honestly — use Reprocess (chunks are replaced, not duplicated).
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="secondary" onClick={() => reprocess(r.id)} loading={busyId === r.id}>
                  <RefreshCw className="h-3.5 w-3.5" /> Reprocess
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove(r.id)} disabled={busyId === r.id} aria-label={`Delete ${r.fileName}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-[11px] text-slate-400">
        Deleting a resume deletes its stored file, text chunks, and embeddings immediately — retrieval scope shrinks with the evidence.
      </p>
    </div>
  );
};

export default ResumeReview;
