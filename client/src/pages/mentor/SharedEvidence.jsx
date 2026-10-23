import { useCallback, useEffect, useState } from 'react';
import { FolderOpen, FileText, ExternalLink, Eye } from 'lucide-react';
import { mentorApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import {
  PageHeading, Card, Badge, Button, Spinner, EmptyState, ErrorState, NoticeBanner,
} from '../../components/index.js';

export const SharedEvidence = () => {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [resumeView, setResumeView] = useState(null); // opened resume id
  const [resumeData, setResumeData] = useState(null);
  const [resumeError, setResumeError] = useState('');

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    mentorApi.shared()
      .then(({ data }) => setState({ loading: false, error: '', data }))
      .catch((err) => setState({ loading: false, error: apiError(err).message, data: null }));
  }, []);

  useEffect(load, [load]);

  const openResume = async (id) => {
    setResumeView(id);
    setResumeData(null);
    setResumeError('');
    try {
      const { data } = await mentorApi.sharedResume(id);
      setResumeData(data.resume);
    } catch (err) {
      setResumeError(apiError(err).message);
    }
  };

  const byStudent = new Map();
  (state.data?.grants || []).forEach((g) => byStudent.set(g.studentId, g.studentName));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading
        title="Shared Evidence"
        subtitle="Exactly what students granted you — nothing else is reachable through the API."
      />
      {state.loading && <div className="flex justify-center py-10"><Spinner /></div>}
      {state.error && <ErrorState message={state.error} onRetry={load} />}

      {!state.loading && !state.error && state.data && (
        <>
          {state.data.grants.length === 0 && state.data.items.length === 0 && state.data.resumes.length === 0 && (
            <EmptyState
              icon={<FolderOpen className="h-10 w-10" />}
              title="Nothing shared yet"
              message="When students accept-share their evidence, it appears here grouped by student."
            />
          )}

          {state.data.grants.length > 0 && (
            <Card className="mb-4 p-4">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Active grants</h2>
              <ul className="mt-2 space-y-1.5">
                {state.data.grants.map((g) => (
                  <li key={g.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <span className="font-bold text-navy">{g.studentName || g.studentId}</span>
                    <span className="flex items-center gap-2">
                      <Badge tone="slate">{g.evidenceCount} evidence shared</Badge>
                      {g.note && <span className="max-w-[200px] truncate text-slate-500">“{g.note}”</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {state.data.items.length > 0 && (
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              {state.data.items.map((e) => (
                <Card key={e.id} className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="blue">{e.kind.replace('_', ' ')}</Badge>
                    <span className="text-[10px] font-semibold text-slate-400">{byStudent.get(e.studentId) || 'student'}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-navy">{e.title}</h3>
                  {e.description && <p className="mt-1.5 line-clamp-3 text-xs text-slate-600">{e.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(e.techSkills || []).map((s) => <Badge key={s} tone="cyan">{s}</Badge>)}
                  </div>
                  <div className="mt-2 flex gap-3">
                    {e.repoUrl && <a href={e.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline">Repo <ExternalLink className="h-3 w-3" /></a>}
                    {e.demoUrl && <a href={e.demoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline">Demo <ExternalLink className="h-3 w-3" /></a>}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {state.data.resumes.length > 0 && (
            <Card className="p-4">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <FileText className="h-3.5 w-3.5" /> Shared resumes
              </h2>
              <ul className="mt-2 space-y-1.5">
                {state.data.resumes.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <div>
                      <p className="text-xs font-bold text-navy">{r.fileName}</p>
                      <p className="text-[10px] text-slate-500">{byStudent.get(r.studentId) || 'student'} · status: {r.status}</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => openResume(r.id)} disabled={r.status !== 'ready'}>
                      <Eye className="h-3.5 w-3.5" /> Read extracted text
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-slate-400">
                Only docs that finished processing can be read — pending or failed ones say so honestly.
              </p>
            </Card>
          )}
        </>
      )}

      {resumeView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-navy/60" onClick={() => setResumeView(null)} />
          <div className="relative max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-pop">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-extrabold text-navy">{resumeData?.fileName || 'Resume'}</h3>
              <Button size="sm" variant="ghost" onClick={() => setResumeView(null)}>Close</Button>
            </div>
            {resumeError && <div className="mt-3"><NoticeBanner>{resumeError}</NoticeBanner></div>}
            {resumeData ? (
              <>
                {Array.isArray(resumeData.skills) && resumeData.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {resumeData.skills.map((s) => <Badge key={s} tone="cyan">{s}</Badge>)}
                  </div>
                )}
                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-[11px] leading-relaxed text-slate-700">{resumeData.extractedText || '(no text extracted)'}</pre>
              </>
            ) : (
              !resumeError && <div className="flex justify-center py-8"><Spinner /></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedEvidence;
