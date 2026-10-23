import { Router } from 'express';
import Resume from '../models/Resume.js';
import Chunk from '../models/Chunk.js';
import { asyncHandler, fail, toOid } from '../utils/core.js';
import { requireAuth, requireVerifiedEmail } from '../middleware/auth.js';
import { uploadMw, removeFile } from '../services/storageService.js';
import { processResume } from '../services/resumeProcessingService.js';
import { config } from '../config/index.js';

const router = Router();
router.use(requireAuth, requireVerifiedEmail);

// POST /api/resumes  (multipart field name: 'file')
router.post(
  '/',
  uploadMw(),
  asyncHandler(async (req, res) => {
    if (!req.file) fail(422, 'Attach a resume file (field name: file)');
    const { path: storageKey, originalname, mimetype, size } = req.file;
    const resume = await Resume.create({
      userId: req.user._id,
      fileName: originalname.slice(0, 200),
      mimeType: mimetype,
      sizeBytes: size,
      storageKey: String(storageKey).replace(config.uploads.dir, '').replace(/^[/\\]/, ''),
      status: 'uploaded',
    });
    // Kick off processing; route responds immediately with state 'extracting'.
    processResume(resume._id, { withEmbeddings: true }).catch((err) => {
      if (!config.isTest) console.error('[resume pipeline]', err.message);
    });
    res.status(201).json({ resume: resume.publicList(), storageKey });
  })
);

// GET /api/resumes  — list with processing states
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await Resume.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
    const embedCounts = await Chunk.aggregate([
      { $match: { resumeId: { $in: items.map((i) => toOid(i._id)) } } },
      { $group: { _id: '$resumeId', embedded: { $sum: { $cond: [{ $isArray: '$embedding' }, 1, 0] } }, chunks: { $sum: 1 } } },
    ]);
    const countByResume = new Map(embedCounts.map((c) => [String(c._id), c]));
    res.json({
      items: items.map((r) => ({
        id: String(r._id),
        fileName: r.fileName,
        mimeType: r.mimeType,
        sizeBytes: r.sizeBytes,
        status: r.status,
        pageCount: r.pageCount,
        skills: r.skills,
        error: r.error,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      embedCounts: Object.fromEntries(countByResume),
    });
  })
);

// GET /api/resumes/:id — includes extracted text (owner only)
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const resume = await Resume.findOne({ _id: toOid(req.params.id), userId: req.user._id });
    if (!resume) fail(404, 'Resume not found');
    res.json({ resume: resume.ownerView() });
  })
);

// POST /api/resumes/:id/reprocess — safe retry (chunks are replaced, not duplicated)
router.post(
  '/:id/reprocess',
  asyncHandler(async (req, res) => {
    const resume = await Resume.findOne({ _id: toOid(req.params.id), userId: req.user._id });
    if (!resume) fail(404, 'Resume not found');
    const result = await processResume(resume._id, { withEmbeddings: true });
    const fresh = await Resume.findById(resume._id);
    res.json({ message: 'Reprocessed', result, resume: fresh.publicList() });
  })
);

// DELETE /api/resumes/:id — file, chunks and record are removed (retrieval scope shrinks)
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const resume = await Resume.findOne({ _id: toOid(req.params.id), userId: req.user._id });
    if (!resume) fail(404, 'Resume not found');
    await Chunk.deleteMany({ resumeId: resume._id, ownerId: req.user._id });
    await Resume.deleteOne({ _id: resume._id });
    removeFile(resume.storageKey);
    res.json({ message: 'Resume deleted' });
  })
);

export default router;
