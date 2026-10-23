import { Router } from 'express';
import { asyncHandler, fail } from '../utils/core.js';
import { requireAuth, requireVerifiedEmail } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { portfolioVisibilitySchema, abuseReportSchema } from '../validators/index.js';
import * as portfolioService from '../services/portfolioService.js';
import { addAbuseReport } from '../services/adminService.js';
import { config } from '../config/index.js';

const router = Router();

// ---- public ------------------------------------------------------------
// GET /api/portfolios/:slug — projection contains ONLY approved public fields.
router.get(
  '/portfolios/:slug',
  asyncHandler(async (req, res) => {
    const data = await portfolioService.publicProjection(req.params.slug);
    res.json({ portfolio: data });
  })
);

// ---- student -----------------------------------------------------------
router.get(
  '/portfolio',
  requireAuth,
  requireVerifiedEmail,
  asyncHandler(async (req, res) => {
    const doc = await portfolioService.getOwnPortfolio(req.user._id);
    res.json({ portfolio: doc });
  })
);

// PATCH /api/portfolio/visibility — publish / unpublish / update fields
router.patch(
  '/portfolio/visibility',
  validate(portfolioVisibilitySchema),
  asyncHandler(async (req, res) => {
    const patch = { ...(req.body.changes || {}) };
    if (req.body.action === 'publish') patch.isPublished = true;
    if (req.body.action === 'unpublish') patch.isPublished = false;
    const doc = await portfolioService.updatePortfolio(req.user, patch);
    const url = doc.isPublished ? `${config.frontends[0]}/portfolio/${doc.slug}` : null;
    res.json({ portfolio: doc, publicUrl: url });
  })
);

// Waiting preview for the not-yet-published state: shows what WOULD be public.
router.get(
  '/portfolio/preview',
  requireAuth,
  requireVerifiedEmail,
  asyncHandler(async (req, res) => {
    const doc = await portfolioService.getOwnPortfolio(req.user._id);
    const draft = await portfolioService.publicProjection(doc.slug || 'unpublished-preview').catch(() => null);
    res.json({ portfolio: doc, preview: draft });
  })
);

// ---- abuse reporting (students, mentors, and public users can file) ----
router.post(
  '/abuse',
  asyncHandler(async (req, res) => {
    const parsed = abuseReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid report', details: parsed.error.issues } });
    }
    const report = await addAbuseReport(req.user || null, parsed.data);
    res.status(201).json({ message: 'Report received', id: String(report._id) });
  })
);

export default router;
