import { Router } from 'express';
import { asyncHandler, fail, toOid } from '../utils/core.js';
import { validate } from '../middleware/validate.js';
import { evidenceSchema, evidencePatchSchema } from '../validators/index.js';
import * as evidenceService from '../services/evidenceService.js';
import { requireAuth, requireVerifiedEmail } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireVerifiedEmail);

// GET /api/evidence?q=&type=&status=&skill=&sort=&page=&limit=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await evidenceService.listEvidence(req.user._id, req.query);
    const items = result.items.map((doc) => EvidenceItem.toClient(doc));
    res.json({ ...result, items });
  })
);

// GET /api/evidence/facets
router.get(
  '/facets',
  asyncHandler(async (req, res) => {
    res.json(await evidenceService.evidenceFacets(req.user._id));
  })
);

// GET /api/evidence/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const doc = await evidenceService.getEvidence(req.user._id, req.params.id);
    res.json({ evidence: EvidenceItem.toClient(doc) });
  })
);

// POST /api/evidence
router.post(
  '/',
  validate(evidenceSchema),
  asyncHandler(async (req, res) => {
    const doc = await evidenceService.createEvidence(req.user, req.body);
    res.status(201).json({ evidence: EvidenceItem.toClient(doc) });
  })
);

// PATCH /api/evidence/:id
router.patch(
  '/:id',
  validate(evidencePatchSchema),
  asyncHandler(async (req, res) => {
    const doc = await evidenceService.updateEvidence(req.user._id, req.params.id, req.body);
    res.json({ evidence: EvidenceItem.toClient(doc) });
  })
);

// DELETE /api/evidence/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await evidenceService.deleteEvidence(req.user._id, req.params.id);
    res.json({ message: 'Evidence deleted' });
  })
);

const EvidenceItem = {
  toClient(doc) {
    return {
      id: String(doc._id),
      kind: doc.kind,
      title: doc.title,
      organization: doc.organization,
      description: doc.description,
      repoUrl: doc.repoUrl,
      demoUrl: doc.demoUrl,
      techSkills: doc.techSkills,
      startedAt: doc.startedAt,
      endedAt: doc.endedAt,
      status: doc.status,
      statusNotes: doc.statusNotes,
      fromResumeId: doc.fromResumeId ? String(doc.fromResumeId) : null,
      mentorFeedback: doc.mentorFeedback,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },
};

const evidenceRoutes = router;
export default evidenceRoutes;