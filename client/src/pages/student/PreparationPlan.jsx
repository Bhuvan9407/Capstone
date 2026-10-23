import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList, Sparkles, CheckCircle2, Trash2, Wrench,
  ChevronDown, ChevronRight, ShieldAlert, ListChecks,
} from 'lucide-react';
import { agentApi, planApi, jobTargetApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import {
  PageHeading, Card, Badge, Button, Field, Input, Select, EmptyState, ErrorState,
  Spinner, NoticeBanner,
} from '../../components/index.js';

export const PreparationPlan = () => {
  const [targets, setTargets] = useState([]);
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState('');
  const [agent, setAgent] = useState({ busy: false, result: null, error: '' });
  const [openPlan, setOpenPlan] = useState(null); // expanded plan id
  const [detail, setDetail] = useState({}); // planId -> plan doc

  const load = useCallback(async () => {
    setError('');
    try {
      const [t, p] = await Promise.all([
        jobTargetApi.list(),
        planApi.list(),
      ]);
      setTargets(t.data.items || []);
      setPlans(p.data.items || []);
    } catch (err) {
      setError(apiError(err).message);
      setPlans([]);
    }
  }, []);

  useEffect(() => { load(); }, [openPlan, load]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading
        title="Preparation Plan"
        subtitle="A bounded agent drafts a weekly schedule from confirmed requirements + your evidence — you approve before anything is saved."
      />
      {error && <div className="mb-4"><NoticeBanner>{error}</NoticeBanner></div>}
      <AgentPanel targets={targets} agent={agent} setAgent={setAgent} onDone={load} />
      <PlanList plans={plans} openPlan={openPlan} setOpenPlan={setOpenPlan} detail={detail} setDetail={setDetail} onDone={load} error={error} />
    </div>
  );
};

// ---------- Agent run panel ---------------------------------------------------

const AgentPanel = ({ targets, agent, setAgent, onDone }) => {
  const [params, setParams] = useState({ jobTargetId: '', hoursPerWeek: 8, weeks: 4 });
  const [runInfo, setRunInfo] = useState(null);
  const [showRun, setShowRun] = useState(false);

  const eligible = targets.filter((t) => t.status === 'confirmed' && (t.hardReqs || []).length > 0);
  const usable = eligible.length ? eligible : targets;

  const run = async (e) => {
    e.preventDefault();
    if (!params.jobTargetId && usable.length) setParams((p) => ({ ...p, jobTargetId: usable[0].id }));
    setAgent({ busy: true, result: null, error: '' });
    setRunInfo(null);
    try {
      const { data } = await agentApi.run({ ...params, jobTargetId: params.jobTargetId || usable[0]?.id });
      if (data.ok) {
        setAgent({ busy: false, result: data, error: '' });
        onDone();
      } else {
        setAgent({ busy: false, result: null, error: `Agent run failed: ${data.error || 'unknown error'}` });
        // Fetched telemetry regardless; run record is kept server-side.
        if (data.runId) fetchRun(data.runId);
      }
    } catch (err) {
      const er = apiError(err);
      setAgent({ busy: false, result: null, error: er.message });
    }
  };

  const fetchRun = async (id) => {
    try {
      const { data } = await agentApi.runInfo(id);
      setRunInfo(data);
    } catch { /* telemetry is best-effort */ }
  };

  return (
    <Card className="mb-6 p-5">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-navy">
        <Sparkles className="h-4 w-4 text-blue-600" /> Run the preparation agent
      </h2>
      {usable.length === 0 ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Add and confirm a job target first — the agent reads confirmed requirements only.
        </p>
      ) : (
        <form onSubmit={run} className="mt-3 grid items-end gap-3 sm:grid-cols-[1fr_110px_110px_auto]">
          <Field label="Job target" required>
            <Select value={params.jobTargetId} onChange={(e) => setParams((p) => ({ ...p, jobTargetId: e.target.value }))}>
              {usable.map((t) => <option key={t.id} value={t.id}>{t.title} ({(t.consolidatedSkills || []).length} skills)</option>)}
            </Select>
          </Field>
          <Field label="Hours / week">
            <Input type="number" min={2} max={40} value={params.hoursPerWeek} onChange={(e) => setParams((p) => ({ ...p, hoursPerWeek: e.target.value }))} />
          </Field>
          <Field label="Weeks">
            <Input type="number" min={1} max={12} value={params.weeks} onChange={(e) => setParams((p) => ({ ...p, weeks: e.target.value }))} />
          </Field>
          <Button type="submit" loading={agent.busy}>Generate plan</Button>
        </form>
      )}

      {agent.busy && (
        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Spinner className="h-3.5 w-3.5" /> Running the bounded agent (readRequirements → findEvidence → schedulePractice)…
        </p>
      )}
      {agent.error && (
        <div className="mt-3"><NoticeBanner>{agent.error}</NoticeBanner></div>
      )}

      {agent.result && (
        <div className="mt-4 space-y-3">
          <NoticeBanner tone="blue">
            Draft plan created ({agent.result.schedule?.weeks?.length || params.weeks} weeks). It stays a DRAFT until
            you confirm it explicitly in the list below.
          </NoticeBanner>
          {(agent.result.evidence?.evidence || []).length > 0 || (agent.result.evidence?.resume || []).length > 0 ? (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Evidence the agent found (your own record)</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-600">
                {(agent.result.evidence.evidence || []).slice(0, 3).map((ev, i) => (
                  <li key={i}>✓ {ev.title} <span className="text-[10px] text-slate-400">matched: {(ev.matched || []).join(', ')}</span></li>
                ))}
                {(agent.result.evidence.resume || []).slice(0, 2).map((rs, i) => (
                  <li key={`r${i}`}>✓ {rs.title} <span className="text-[10px] text-slate-400">(resume)</span></li>
                ))}
              </ul>
              {(agent.result.gaps || []).length > 0 && (
                <p className="mt-2 text-xs font-semibold text-rose-700">Gaps to close: {agent.result.gaps.join(', ')}</p>
              )}
            </div>
          ) : (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No supporting evidence found for this target's requirements — the plan will schedule everything as new practice.
            </p>
          )}
          {agent.result.toolCalls?.length > 0 && (
            <details>
              <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-slate-400 hover:text-slate-600">Tool telemetry (per-call)</summary>
              <ul className="mt-1 space-y-1">
                {agent.result.toolCalls.map((tc, i) => (
                  <li key={i} className="flex items-center gap-2 text-[11px] text-slate-600">
                    <Wrench className="h-3 w-3 text-slate-400" />
                    <Badge tone={tc.status === 'success' ? 'green' : 'rose'}>{tc.status}</Badge>
                    <span className="font-bold">{tc.name}</span>
                    <span className="text-slate-400">{tc.ms ?? '?'}ms</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {runInfo && (
        <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50/50 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-600">
            <ShieldAlert className="h-3.5 w-3.5" /> Failed run telemetry
          </p>
          <p className="mt-1 text-xs text-rose-700">{runInfo.error?.message || runInfo.error || 'Tool error recorded.'}</p>
        </div>
      )}
    </Card>
  );
};

// ---------- Plans list --------------------------------------------------------

const PlanList = ({ plans, openPlan, setOpenPlan, detail, setDetail, onDone }) => {
  const loadPlan = async (id) => {
    setOpenPlan(openPlan === id ? null : id);
    try {
      const { data } = await planApi.get(id);
      setDetail((d) => ({ ...d, [id]: data.plan }));
    } catch {
      /* handled by detail absence */
    }
  };

  if (!plans) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (plans.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-10 w-10" />}
        title="No plans yet"
        message="Run the agent above once you have a confirmed job target — its output is a draft plan awaiting your approval."
      />
    );
  }

  return (
    <div className="space-y-3">
      {plans.map((p) => (
        <PlanRow
          key={(p.id || p._id)}
          plan={p}
          open={openPlan === (p.id || p._id)}
          toggle={() => loadPlan(p.id || p._id)}
          detail={detail[p.id || p._id]}
          onDone={onDone}
        />
      ))}
    </div>
  );
};

const PlanRow = ({ plan, open, toggle, detail, onDone }) => {
  const id = plan.id || plan._id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dd = detail?.id ? detail : plan;

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await planApi.confirm(id);
      setError('');
      onDone();
    } catch (err) {
      // e.g. 409 for double-confirm replays — surfaced honestly.
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await planApi.remove(id);
      onDone();
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const totalHours = (dd.items || []).length
    ? Math.round(dd.items.reduce((acc, it) => acc + (it.durationHours || 0), 0))
    : 0;
  const doneCount = (dd.items || []).filter((it) => it.completed).length;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <button onClick={toggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-navy">
              Plan · {dd.input?.durationWeeks || '?'} weeks · {dd.input?.hoursPerWeek || '?'} h/week
            </p>
            <p className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
              <Badge tone={dd.status === 'confirmed' ? 'green' : 'amber'}>{dd.status === 'confirmed' ? 'confirmed' : 'draft'}</Badge>
              <span>{(dd.items || []).length} tasks · {totalHours} h total</span>
              {doneCount > 0 && <span className="font-bold text-emerald-600">{doneCount}/{dd.items.length} completed</span>}
              <span>{new Date(dd.updatedAt || plan.updatedAt).toLocaleDateString()}</span>
            </p>
          </div>
        </button>
        <div className="flex gap-2">
          {dd.status !== 'confirmed' && (
            <Button size="sm" onClick={confirm} loading={busy}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirm & save
            </Button>
          )}
          <Button size="sm" variant="danger" onClick={remove} disabled={busy} aria-label="Delete plan">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {error && <p className="px-4 pb-2 text-xs font-semibold text-rose-600">{error}</p>}
      {open && <PlanItems planId={id} detail={dd} refresh={onDone} />}
    </Card>
  );
};

const PlanItems = ({ planId, detail, refresh }) => {
  const items = detail.items || [];
  const membership = items.reduce((acc, it) => {
    (acc[it.assignedWeek] ||= []).push(it);
    return acc;
  }, {});

  const toggleItem = async (itemIndex, completed) => {
    try {
      await planApi.setItem(planId, itemIndex, completed);
      refresh();
    } catch {
      /* item check is optimistic-free; refresh catches errors */
    }
  };

  if (items.length === 0) {
    return <p className="border-t border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-500">This plan has no items.</p>;
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50/50 p-4">
      {Object.entries(membership).sort(([a], [b]) => a - b).map(([week, list]) => (
        <div key={week} className="mb-3 last:mb-0">
          <p className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <ListChecks className="h-3.5 w-3.5" /> Week {week}
          </p>
          <div className="space-y-1.5">
            {list.map((it) => {
              const index = items.indexOf(it);
              return (
                <label key={index} className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-white p-3 shadow-card">
                  <input
                    type="checkbox"
                    checked={Boolean(it.completed)}
                    onChange={(e) => toggleItem(index, e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-blue-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold text-navy ${it.completed ? 'line-through text-slate-400' : ''}`}>
                      {it.skill}: {it.deliverable}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {it.durationHours} h · {it.evidenceToRecord}
                    </p>
                  </div>
                  <Badge tone="slate">{it.durationHours}h</Badge>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PreparationPlan;
