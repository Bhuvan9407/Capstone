import { Router } from 'express';
import JobTarget from '../models/JobTarget.js';
import { asyncHandler, fail, toOid } from '../utils/core.js';
import { requireAuth, requireVerifiedEmail } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { jobTargetCreateSchema, jobTargetPatchSchema, requirementConfirmSchema } from '../validators/index.js';
import * as targetService from '../services/jobTargetService.js';
import { extractForTarget } from '../services/jobExtractionService.js';
import { compareRequirements } from '../services/matchingService.js';
import { ollamaHealthCheck } from '../ai/embeddingService.js';

const router = Router();
router.use(requireAuth, requireVerifiedEmail);

const toClient = (t) => ({
  id: String(t._id),
  title: t.title,
  organization: t.organization,
  city: t.city,
  status: t.status,
  rawDescription: t.rawDescription,
  consolidatedSkills: t.consolidatedSkills,
  discoveredSkills: t.discoveredSkills,
  hardReqs: t.hardReqs,
  realizationError: t.realizationError,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

// GET /api/job-targets
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await targetService.listTargets(req.user._id, req.query);
    res.json({ ...result, items: result.items.map(toClient) });
  })
);

// POST /api/job-targets
router.post(
  '/',
  validate(jobTargetCreateSchema),
  asyncHandler(async (req, res) => {
    const doc = await targetService.createTarget(req.user._id, {
      title: req.body.title,
      organization: req.body.organization,
      city: req.body.city,
      rawDescription: req.body.jobDescription,
    });
    res.status(201).json({ target: toClient(doc) });
  })
);

// GET /api/job-targets/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const doc = await targetService.getTarget(req.user._id, req.params.id);
    res.json({ target: toClient(doc) });
  })
);

// PATCH /api/job-targets/:id  (edit the pasted description / fields)
router.patch(
  '/:id',
  validate(jobTargetPatchSchema),
  asyncHandler(async (req, res) => {
    const patch = { ...req.body };
    if (patch.jobDescription) patch.rawDescription = patch.jobDescription;
    delete patch.jobDescription;
    const doc = await targetService.updateTarget(req.user._id, req.params.id, patch);
    res.json({ target: toClient(doc) });
  })
);

// DELETE /api/job-targets/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await targetService.deleteTarget(req.user._id, req.params.id);
    res.json({ message: 'Job target deleted' });
  })
);

// POST /api/job-targets/:id/extract — AI extraction of requirements
router.post(
  '/:id/extract',
  asyncHandler(async (req, res) => {
    const health = await ollamaHealthCheck();
    if (!health.ok) {
      // Honest failure: no fabricated requirements.
      return res.status(503).json({
        error: {
          code: 'MODEL_UNAVAILABLE',
          message: 'Ollama is unavailable, so requirements could not be extracted. Start Ollama and retry (never fabricated).',
          detail: health.detail || null,
        },
      });
    }
    const result = await extractForTarget(req.user._id, req.params.id);
    if (!result.ok) {
      return res.status(502).json({
        error: { code: 'EXTRACTION_FAILED', message: 'The model could not produce valid requirements. Edit the description and retry.' },
      });
    }
    const doc = await targetService.getTarget(req.user._id, req.params.id);
    res.json({ target: toClient(doc) });
  })
);

// PATCH /api/job-targets/:id/confirm — student-confirmed final requirements
router.patch(
  '/:id/confirm',
  validate(requirementConfirmSchema),
  asyncHandler(async (req, res) => {
    const doc = await targetService.confirmRequirements(req.user._id, req.params.id, {
      consolidatedSkills: req.body.consolidatedSkills,
      hardReqs: req.body.requirements,
    });
    await JobTarget.updateOne({ _id: doc._id }, { $unset: { realizationError: '' } });
    res.json({ target: toClient(doc) });
  })
);

// GET /api/job-targets/:id/compare — evidence-to-requirement comparison
router.get(
  '/:id/compare',
  asyncHandler(async (req, res) => {
    const result = await compareRequirements(req.user, req.params.id);
    if (!result) fail(404, 'Job target not found');
    res.json(result);
  })
);

export default router;
