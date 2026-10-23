import { Router } from 'express';
import Evidence from '../models/Evidence.js';
import Resume from '../models/Resume.js';
import Review from '../models/Review.js';
import PracticePlan from '../models/PracticePlan.js';
import { asyncHandler, fail, toOid } from '../utils/core.js';
import { requireAuth, requireVerifiedEmail } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  mentorInviteSchema,
  grantUpsertSchema,
  inviteAcceptSchema,
  reviewCreateSchema,
  commentSchema,
  suggestionSchema,
} from '../validators/index.js';
import * as mentorService from '../services/mentorService.js';

const router = Router();

const studentOnly = (req, _res, next) => {
  if (req.user?.role !== 'student') return next(fail(403, 'Only students can perform this action'));
  return next();
};
const mentorOnly = (req, _res, next) => {
  if (req.user?.role !== 'mentor') return next(fail(403, 'Only mentors can perform this action'));
  if (!req.user.mentorVerified) return next(fail(403, 'A staff member must verify your mentor account first'));
  return next();
};

router.post(
  '/mentor-invitations',
  requireAuth,
  requireVerifiedEmail,
  studentOnly,
  validate(mentorInviteSchema),
  asyncHandler(async (req, res) => {
    const result = await mentorService.createInvitation(req.user, req.body);
    res.status(201).json(result);
  })
);

router.get(
  '/mentor-invitations',
  requireAuth,
  requireVerifiedEmail,
  studentOnly,
  asyncHandler(async (req, res) => {
    const items = await mentorService.listOwnInvitations(req.user._id);
    res.json({
      items: items.map((i) => ({
        id: String(i._id),
        mentorEmail: i.mentorEmail,
        status: i.status,
        expiresAt: i.expiresAt,
        acceptedAt: i.acceptedAt,
        createdAt: i.createdAt,
      })),
    });
  })
);

router.post(
  '/mentor-invitations/:id/revoke',
  requireAuth,
  requireVerifiedEmail,
  studentOnly,
  asyncHandler(async (req, res) => {
    const invite = await mentorService.revokeInvitation(req.user, req.params.id);
    res.json({ message: 'Invitation revoked', invitation: { id: String(invite._id), status: invite.status } });
  })
);

// ---------- mentor: invitations --------------------------------------------

router.get(
  '/mentor-invitations/pending',
  requireAuth,
  mentorOnly,
  asyncHandler(async (req, res) => {
    const items = await mentorService.listPendingInvitations(req.user._id, req.user.email);
    res.json({
      items: items.map((i) => ({
        id: String(i._id),
        studentName: i.studentId?.name,
        note: i.note,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
    });
  })
);

router.post(
  '/mentor-invitations/accept',
  requireAuth,
  mentorOnly,
  validate(inviteAcceptSchema),
  asyncHandler(async (req, res) => {
    const grant = await mentorService.acceptInvitation(req.user, req.body.token);
    res.status(201).json({ message: 'Invitation accepted', grantId: String(grant._id) });
  })
);

// ---------- grants -----------------------------------------------------------

router.get(
  '/grants',
  requireAuth,
  requireVerifiedEmail,
  asyncHandler(async (req, res) => {
    const items =
      req.user.role === 'mentor'
        ? await mentorService.listGrantsForMentor(req.user._id)
        : req.user.role === 'student'
          ? await mentorService.listGrantsForStudent(req.user._id)
          : fail(403, 'Students/mentors only');
    res.json({ items });
  })
);

// POST /api/grants — student chooses exactly which evidence + resumes to share
router.post(
  '/grants',
  requireAuth,
  requireVerifiedEmail,
  studentOnly,
  validate(grantUpsertSchema),
  asyncHandler(async (req, res) => {
    const grant = await mentorService.createGrant(req.user, req.body);
    res.status(201).json({ grant });
  })
);

// DELETE /api/grants/:id — revocation ends API + retrieval access immediately
router.delete(
  '/grants/:id',
  requireAuth,
  requireVerifiedEmail,
  studentOnly,
  asyncHandler(async (req, res) => {
    const grant = await mentorService.revokeGrant(req.user, req.params.id);
    res.json({ message: 'Sharing revoked. The mentor loses API and retrieval access immediately.', grant });
  })
);

// GET /api/mentors/shared — mentor list of everything currently shared with them
router.get(
  '/shared',
  requireAuth,
  mentorOnly,
  asyncHandler(async (req, res) => {
    const grants = await mentorService.listGrantsForMentor(req.user._id);
    const evidenceIds = grants.flatMap((g) => g.evidenceIds || []).map(String);
    const resumeIds = grants.flatMap((g) => g.resumeIds || []).map(String);
    const [evidence, resumes] = await Promise.all([
      evidenceIds.length ? Evidence.find({ _id: { $in: evidenceIds } }).lean() : Promise.resolve([]),
      resumeIds.length ? Resume.find({ _id: { $in: resumeIds } }).lean() : Promise.resolve([]),
    ]);
    res.json({
      grants: grants.map((g) => ({
        id: String(g._id),
        studentId: String(g.studentId?._id || g.studentId),
        studentName: g.studentId?.name || undefined,
        evidenceCount: (g.evidenceIds || []).length,
        note: g.note,
      })),
      items: evidence.map((e) => ({
        id: String(e._id),
        title: e.title,
        kind: e.kind,
        description: e.description,
        techSkills: e.techSkills,
        repoUrl: e.repoUrl,
        demoUrl: e.demoUrl,
        status: e.status,
        studentId: e.userId ? String(e.userId) : null,
      })),
      resumes: resumes.map((r) => ({
        id: String(r._id),
        fileName: r.fileName,
        studentId: r.userId ? String(r.userId) : null,
        status: r.status,
      })),
    });
  })
);

// GET /api/shared/resumes/:id — mentor read of a shared resume's extracted text
router.get(
  '/shared/resumes/:id',
  requireAuth,
  mentorOnly,
  asyncHandler(async (req, res) => {
    // Grant gate FIRST: only explicitly shared resumes.
    const grants = await mentorService.listGrantsForMentor(req.user._id);
    const sharedIds = new Set(grants.flatMap((g) => g.resumeIds || []).map(String));
    if (!sharedIds.has(String(req.params.id))) fail(403, 'This resume is not shared with you');
    const resume = await Resume.findById(req.params.id).lean();
    if (!resume) fail(404, 'Resume not found');
    res.json({
      resume: {
        id: String(resume._id),
        fileName: resume.fileName,
        extractedText: resume.extractedText,
        skills: resume.skills,
        studentId: String(resume.userId),
      },
    });
  })
);

// ---------- reviews ----------------------------------------------------------

router.post(
  '/reviews',
  requireAuth,
  mentorOnly,
  validate(reviewCreateSchema),
  asyncHandler(async (req, res) => {
    const review = await mentorService.createReview(req.user, req.body);
    res.status(201).json({ review: { id: String(review._id), title: review.title, status: review.status } });
  })
);

router.get(
  '/reviews',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.role === 'mentor') {
      const items = await Review.find({ mentorId: req.user._id }).sort({ createdAt: -1 }).populate('studentId', 'name').lean();
      return res.json({ items });
    }
    if (req.user.role === 'student') {
      const items = await mentorService.listReviewsForStudent(req.user._id);
      return res.json({ items });
    }
    return fail(403, 'Students/mentors only');
  })
);

router.get(
  '/reviews/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ review: await mentorService.getReview(req.user, req.params.id, req.user.role) });
  })
);

router.post(
  '/reviews/:id/comments',
  requireAuth,
  validate(commentSchema),
  asyncHandler(async (req, res) => {
    const comment = await mentorService.addComment(
      req.user,
      req.user.role,
      req.params.id,
      req.body.body,
      req.body.evidenceId
    );
    res.status(201).json({ comment });
  })
);

// mentor practice suggestions
router.post(
  '/reviews/:id/suggestions',
  requireAuth,
  mentorOnly,
  validate(suggestionSchema),
  asyncHandler(async (req, res) => {
    const review = await mentorService.getReview(req.user, req.params.id, 'mentor');
    const doc = await Review.findById(review._id);
    doc.practiceSuggestionsGiven.push({ text: req.body.text.slice(0, 500) });
    await doc.save();
    res.status(201).json({ review: doc });
  })
);

router.post(
  '/reviews/:id/complete',
  requireAuth,
  mentorOnly,
  asyncHandler(async (req, res) => {
    const review = await mentorService.getReview(req.user, req.params.id, 'mentor');
    const doc = await Review.findById(review._id);
    doc.status = 'completed';
    doc.completedAt = new Date();
    await doc.save();
    res.json({ review: doc });
  })
);

// ------- mentor feedback on a saved plan (read-only influence) ---------------

router.post(
  '/plans/:planId/feedback',
  requireAuth,
  mentorOnly,
  asyncHandler(async (req, res) => {
    const studentId = req.body.studentId;
    if (!studentId) fail(422, 'studentId is required');
    const plan = await PracticePlan.findOne({ _id: toOid(req.params.planId) });
    if (!plan) fail(404, 'Plan not found');
    const grant = await mentorService.assertGrantAccess({ mentorId: req.user._id, studentId: plan.userId });
    if (String(plan.userId) !== String(grant.studentId?._id || grant.studentId)) {
      fail(403, 'This plan does not belong to a student you mentor');
    }
    plan.mentorFeedback.push({ byId: req.user._id, text: String(req.body.text || '').slice(0, 1500) });
    await plan.save();
    res.status(201).json({ message: 'Feedback recorded' });
  })
);

export default router;

