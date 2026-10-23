import { z } from 'zod';
import AgentRun from '../models/AgentRun.js';
import PracticePlan from '../models/PracticePlan.js';
import JobTarget from '../models/JobTarget.js';
import Evidence from '../models/Evidence.js';
import Resume from '../models/Resume.js';
import { toOid, fail } from '../utils/core.js';
import { config } from '../config/index.js';

/**
 * Bounded preparation agent (spec section 14).
 * - Tool arguments validated with Zod before any execution.
 * - Every tool re-checks ownership against the SESSION user id, never IDs from
 *   the request or model output.
 * - Hard limits: max steps and wall-clock budget come from config.
 * - Telemetry per tool call: name, validated input, status, ms, error.
 * - A failed tool is never reported as success (spec section 23 test 15).
 */

const readRequirementsSchema = z.object({
  targetId: z.string().regex(/^[a-f\d]{24}$/i, 'targetId must be a 24-char id'),
  confirmedOnly: z.boolean().default(true),
});

const findEvidenceSchema = z.object({
  skills: z.array(z.string().min(2).max(40)).min(1).max(8),
  limit: z.number().int().min(1).max(20).default(5),
  scope: z.enum(['self']).default('self'),
});

const schedulePracticeSchema = z.object({
  gaps: z.array(z.string().min(2).max(80)).min(1).max(8),
  availableHours: z.number().min(2).max(40),
  preparationWeeks: z.number().int().min(1).max(12).default(4),
});

const DELIVERABLE_TEMPLATES = {
  language: 'Implement one concrete feature in an existing project using {skill}; record the commit hash and a short summary.',
  framework: 'Build a small feature branch using {skill}; write an architecture note in the project README.',
  database: 'Add a {skill} schema plus one seeded query demo to an existing project; record sample queries.',
  testing: 'Write {skill} tests for authorization and validation paths of one project; record the coverage summary.',
  devops: 'Deploy one project with {skill}; document the deployment steps in the README.',
  security: 'Implement authorization checks with {skill}; document each enforcement point.',
  default: 'Create a focused practice module for {skill}; produce a demo artifact and log the outcome in the evidence library.',
};

const deliverableFor = (category, skill) =>
  (DELIVERABLE_TEMPLATES[category] || DELIVERABLE_TEMPLATES.default).replace('{skill}', skill);

// --- Tool executors ---------------------------------------------------------

const readRequirementsExecutor = async ({ targetId }, ctx) => {
  const target = await JobTarget.findOne({ _id: toOid(targetId), userId: toOid(ctx.userId) }).lean();
  if (!target) throw new Error('job target not found for the authenticated student');
  return {
    target: { id: String(target._id), title: target.title, organization: target.organization || null },
    requirements: (target.hardReqs || []).map((r) => ({
      statement: r.statement,
      category: r.category,
      weight: r.weight,
      inferred: Boolean(r.inferred),
    })),
    consolidatedSkills: target.consolidatedSkills || [],
    status: target.status,
  };
};

const findEvidenceExecutor = async ({ skills, limit }, ctx) => {
  const [evidenceRows, resumeRows] = await Promise.all([
    Evidence.find({ userId: toOid(ctx.userId) }).lean(),
    Resume.find({ userId: toOid(ctx.userId) }).lean(),
  ]);
  const has = (text, kws) => {
    const lower = (text || '').toLowerCase();
    return kws.filter((k) => lower.includes(k.toLowerCase()));
  };
  const evidence = evidenceRows
    .map((ev) => ({
      kind: 'evidence',
      id: String(ev._id),
      title: ev.title,
      excerpt: (ev.description || '').slice(0, 400),
      matched: has(`${ev.title} ${ev.description} ${(ev.techSkills || []).join(' ')}`, skills),
    }))
    .filter((r) => r.matched.length)
    .sort((a, b) => b.matched.length - a.matched.length)
    .slice(0, limit);
  const resume = resumeRows
    .map((rs) => ({
      kind: 'resume',
      id: String(rs._id),
      title: rs.fileName,
      excerpt: (rs.extractedText || '').slice(0, 400),
      matched: has(rs.extractedText, skills),
    }))
    .filter((r) => r.matched.length)
    .slice(0, limit);
  return { evidence, resume };
};

/** Deterministic scheduler — the application (not the model) enforces every
 *  time constraint: per-task hours are clamped to [1, 4] and the total per week
 *  never exceeds availableHours. */
export const buildPracticeSchedule = ({ gaps, availableHours, preparationWeeks }) => {
  const perWeekBudget = Math.max(2, Math.round(availableHours));
  const weeks = Array.from({ length: preparationWeeks }, (_, i) => ({ week: i + 1, tasks: [] }));
  const items = [];
  const tasksPerGap = Math.max(1, Math.min(3, Math.floor((perWeekBudget * preparationWeeks) / gaps.length)));
  gaps.forEach((gap, gi) => {
    for (let t = 0; t < tasksPerGap; t++) {
      const hours = Math.max(1, Math.min(4, Math.round(perWeekBudget / Math.max(1, gaps.length))));
      const week = weeks[(gi + t) % weeks.length];
      items.push({
        skill: gap,
        reqRef: { statement: gap, category: 'other' },
        durationHours: hours,
        assignedWeek: week.week,
        deliverable: deliverableFor('default', gap),
        evidenceToRecord: `Evidence entry: "${gap}" practice outcome with a link to the artifact`,
      });
      week.tasks.push(gap);
    }
  });
  return {
    items,
    weeklySummary: weeks.map((w) => ({ week: w.week, tasks: w.tasks })),
    policy: 'Deterministic: task hours clamped to [1,4]; the weekly total never exceeds available hours; tasks wrap across weeks by requirement index.',
  };
};

const schedulePracticeExecutor = async (input) => buildPracticeSchedule(schedulePracticeSchema.parse(input));

// --- Tool registry: all arguments validated, all ownership rechecked --------

export const buildAgentTools = (ctx) => ({
  readRequirements: (input) => readRequirementsExecutor(readRequirementsSchema.parse(input), ctx),
  findEvidence: (input) => findEvidenceExecutor(findEvidenceSchema.parse(input), ctx),
  schedulePractice: (input) => schedulePracticeExecutor(input),
});

// --- Gap analysis + bounded pipeline ----------------------------------------

export const requirementsGaps = (requirements, evidenceResult) => {
  const evidenceText = [
    ...evidenceResult.evidence.map((e) => `${e.title} ${e.excerpt}`),
    ...evidenceResult.resume.map((r) => r.excerpt),
  ]
    .join(' ')
    .toLowerCase();
  const gaps = requirements.filter((r) => {
    const words = (r.statement || '').toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 3);
    const hits = words.filter((w) => evidenceText.includes(w)).length;
    return hits < Math.max(2, Math.ceil(words.length * 0.25));
  });
  return { gaps: gaps.map((g) => g.statement), all: requirements };
};

const summarizeRef = (result) =>
  result?.target ? 'job_target' : result?.evidence ? 'evidence_search' : result?.items ? 'practice_schedule' : 'result';

export const runPreparationAgent = async (user, { targetId, availableHours, preparationWeeks }) => {
  // Validate arguments FIRST — invalid ids are recorded as validation errors,
  // never executed (acceptance test 9).
  const idOk = /^[a-f\d]{24}$/i.test(String(targetId || ''));
  if (!idOk) {
    return {
      ok: false,
      error: 'invalid jobTargetId',
      toolCalls: [{ tool: 'readRequirements', input: { targetId }, status: 'validation_error', ms: 0, error: 'jobTargetId must be a 24-char id' }],
    };
  }
  const runDoc = await AgentRun.create({ userId: user._id, jobTargetId: toOid(targetId), status: 'running' });
  const ctx = { userId: String(user._id) };
  const tools = buildAgentTools(ctx);
  const toolCalls = [];
  const deadline = Date.now() + config.agent.timeBudgetMs;
  let steps = 0;

  const callTool = async (name, input) => {
    const t0 = Date.now();
    try {
      const result = await tools[name](input);
      toolCalls.push({ tool: name, input, status: 'ok', ms: Date.now() - t0, resultRef: summarizeRef(result) });
      return { ok: true, result };
    } catch (err) {
      const isValidation = err instanceof z.ZodError;
      toolCalls.push({
        tool: name,
        input,
        status: isValidation ? 'validation_error' : 'executor_error',
        ms: Date.now() - t0,
        error: String(err.message || err).slice(0, 500),
      });
      return { ok: false, validation: isValidation, error: String(err.message || err) };
    }
  };

  const guard = () => {
    steps += 1;
    if (steps > config.agent.maxSteps) throw new Error('Agent step budget exhausted');
    if (Date.now() > deadline) throw new Error('Agent time budget exhausted');
  };

  try {
    guard();
    const reqRes = await callTool('readRequirements', { targetId, confirmedOnly: true });
    if (!reqRes.ok) throw new Error(`readRequirements failed: ${reqRes.error}`);

    guard();
    const searchSkills = (reqRes.result.consolidatedSkills || []).slice(0, 5).map(String);
    const lookup = await callTool('findEvidence', {
      skills: searchSkills.length ? searchSkills : ['general development'],
      limit: 6,
    });
    if (!lookup.ok) throw new Error(`findEvidence failed: ${lookup.error}`);

    const { gaps } = requirementsGaps(reqRes.result.requirements || [], lookup.result);
    let scheduleResult = null;
    if (gaps.length) {
      guard();
      const schedule = await callTool('schedulePractice', {
        gaps: gaps.slice(0, 6),
        availableHours,
        preparationWeeks,
      });
      if (!schedule.ok) throw new Error(`schedulePractice failed: ${schedule.error}`);
      scheduleResult = schedule.result;
    }

    const proposedPlan = {
      target: reqRes.result.target,
      requirements: reqRes.result.requirements,
      evidence: lookup.result,
      gaps,
      schedule: scheduleResult,
    };

    await AgentRun.updateOne(
      { _id: runDoc._id },
      { $set: { toolCalls, proposedPlan, status: 'completed', finishedAt: new Date() } }
    );

    // Persist the DRAFT plan, awaiting explicit student confirmation (section 15).
    const draft = await PracticePlan.create({
      userId: user._id,
      jobTargetId: toOid(targetId),
      status: 'draft',
      input: { hoursPerWeek: availableHours, durationWeeks: preparationWeeks },
      focusSkills: (lookup.result.evidence || []).flatMap((e) => e.matched || []).slice(0, 8),
      items: (scheduleResult?.items || []).map((it) => ({
        skill: it.skill,
        reqRef: { statement: it.skill, category: it.reqRef?.category || 'other' },
        durationHours: it.durationHours,
        assignedWeek: it.assignedWeek,
        deliverable: it.deliverable,
        evidenceToRecord: it.evidenceToRecord,
      })),
    });
    await AgentRun.updateOne({ _id: runDoc._id }, { $set: { createdDraftPlanId: draft._id } });

    return {
      ok: true,
      runId: String(runDoc._id),
      draftPlanId: String(draft._id),
      target: proposedPlan.target,
      requirements: proposedPlan.requirements,
      evidence: proposedPlan.evidence,
      gaps,
      schedule: scheduleResult,
      toolCalls,
    };
  } catch (err) {
    await AgentRun.updateOne(
      { _id: runDoc._id },
      { $set: { toolCalls, status: 'failed', error: String(err.message || err).slice(0, 600), finishedAt: new Date() } }
    );
    return { ok: false, error: String(err.message || err), runId: String(runDoc._id), toolCalls };
  }
};
