import { Router } from 'express';
import AgentRun from '../models/AgentRun.js';
import { asyncHandler, fail, toOid } from '../utils/core.js';
import { requireAuth, requireVerifiedEmail } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { preparationAgentSchema } from '../validators/index.js';
import { runPreparationAgent } from '../services/preparationAgentService.js';

const router = Router();
router.use(requireAuth, requireVerifiedEmail);

// POST /api/preparation-agent — bounded agent run; result is a DRAFT plan that
// the student must explicitly confirm before it is saved/activated.
router.post(
  '/',
  validate(preparationAgentSchema),
  asyncHandler(async (req, res) => {
    const result = await runPreparationAgent(req.user, {
      targetId: req.body.jobTargetId,
      availableHours: req.body.hoursPerWeek,
      preparationWeeks: req.body.weeks,
    });
    const status = result.ok ? 200 : 502;
    res.status(status).json(result);
  })
);

// GET /api/preparation-agent/runs/:id — telemetry for one run (own runs only)
router.get(
  '/runs/:id',
  asyncHandler(async (req, res) => {
    const run = await AgentRun.findOne({ _id: toOid(req.params.id), userId: req.user._id }).lean();
    if (!run) fail(404, 'Agent run not found');
    res.json({
      id: String(run._id),
      status: run.status,
      error: run.error,
      toolCalls: run.toolCalls,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      draftPlanId: run.createdDraftPlanId ? String(run.createdDraftPlanId) : null,
    });
  })
);

export default router;
