import { Router } from 'express';
import { asyncHandler, fail, toOid } from '../utils/core.js';
import { requireAuth, requireVerifiedEmail } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { planUpdateSchema, planItemCompleteSchema } from '../validators/index.js';
import * as planService from '../services/planService.js';

const router = Router();
router.use(requireAuth, requireVerifiedEmail);

// GET /api/plans?status=draft|confirmed
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await planService.listPlans(req.user._id, { status: req.query.status });
    res.json({ items });
  })
);

// GET /api/plans/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ plan: await planService.getPlan(req.user._id, req.params.id) });
  })
);

// PATCH /api/plans/:id — edit a DRAFT plan (student corrections before approval)
router.patch(
  '/:id',
  validate(planUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json({ plan: await planService.updateDraftPlan(req.user._id, req.params.id, req.body) });
  })
);

// POST /api/plans/:id/confirm — explicit save; idempotent & concurrency-safe
router.post(
  '/:id/confirm',
  asyncHandler(async (req, res) => {
    const { alreadyConfirmed, plan } = await planService.confirmPlan(req.user._id, req.params.id);
    res.json({ confirmed: true, alreadyConfirmed, plan });
  })
);

// DELETE /api/plans/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await planService.deletePlan(req.user._id, req.params.id);
    res.json({ message: 'Plan deleted' });
  })
);

// PATCH /api/plans/:id/items/complete  { itemIndex, completed }
router.patch(
  '/:id/items/complete',
  validate(planItemCompleteSchema),
  asyncHandler(async (req, res) => {
    res.json({ plan: await planService.setItemCompleted(req.user._id, req.params.id, req.body.itemIndex, req.body.completed) });
  })
);

export default router;
