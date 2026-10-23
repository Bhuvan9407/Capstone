import { Router } from 'express';
import User from '../models/User.js';
import Portfolio from '../models/Portfolio.js';
import { asyncHandler, fail, toOid } from '../utils/core.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { adminVerifyMentorSchema, adminProcessReportSchema, adminModerationSchema } from '../validators/index.js';
import * as adminService from '../services/adminService.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

// ---- mentors --------------------------------------------------------------
router.get(
  '/mentors/pending',
  asyncHandler(async (_req, res) => {
    res.json({ items: await adminService.unverifiedMentors() });
  })
);

router.post(
  '/mentors/verify',
  validate(adminVerifyMentorSchema),
  asyncHandler(async (req, res) => {
    const mentor = await adminService.verifyMentor(req.user, req.body.mentorId, { verified: req.body.verified });
    res.json({ mentor });
  })
);

// ---- abuse reports ---------------------------------------------------------
router.get(
  '/abuse',
  asyncHandler(async (req, res) => {
    res.json({ items: await adminService.listAbuseReports({ status: req.query.status }) });
  })
);

router.post(
  '/abuse/process',
  validate(adminProcessReportSchema),
  asyncHandler(async (req, res) => {
    if (!req.body.reportId) fail(422, 'reportId is required');
    const report = await adminService.processAbuseReport(req.user, req.body.reportId, {
      status: req.body.status,
      resolutionNote: req.body.resolutionNote,
    });
    res.json({ report });
  })
);

// ---- public content moderation ---------------------------------------------
router.post(
  '/moderation',
  validate(adminModerationSchema),
  asyncHandler(async (req, res) => {
    const { contentType, contentId, action, reason } = req.body;
    if (!['portfolio', 'comment'].includes(contentType)) fail(422, 'contentType must be portfolio or comment');
    const result =
      contentType === 'portfolio'
        ? await adminService.moderatePortfolio(req.user, contentId, { action, reason })
        : await adminService.moderateComment(req.user, contentId, { action, reason });
    res.json({ result });
  })
);

// ---- service health ---------------------------------------------------------
router.get(
  '/service-health',
  asyncHandler(async (_req, res) => {
    res.json(await adminService.serviceHealth());
  })
);

// ---- audit trail ------------------------------------------------------------
router.get(
  '/audit',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const { items, total } = await adminService.auditTrail({}, { skip: (page - 1) * 50, limit: 50 });
    res.json({ items, total, page });
  })
);

// ---- settings (operational, minor) ------------------------------------------
router.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    res.json({ mentorRegistrationRule: 'mentors sign up through /api/auth/register/mentor and require admin verification' });
  })
);

export default router;
