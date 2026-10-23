import MentorGrant from '../models/MentorGrant.js';
import MentorInvitation from '../models/MentorInvitation.js';
import Evidence from '../models/Evidence.js';
import Resume from '../models/Resume.js';
import User from '../models/User.js';
import AuthToken from '../models/AuthToken.js';
import Review from '../models/Review.js';
import Comment from '../models/Comment.js';
import emailService from './emailService.js';
import { newToken, sha256, fail, toOid } from '../utils/core.js';
import { config } from '../config/index.js';

/** Mentor sharing service. Every student-visible read path and every mentor
 *  read/comment/RAG call goes through these checks. */

export const listGrantsForStudent = async (userId) => {
  const grants = await MentorGrant.find({ studentId: toOid(userId) })
    .populate('mentorId', 'name email mentorVerified')
    .lean();
  return grants;
};

export const listOwnInvitations = async (userId) =>
  MentorInvitation.find({ studentId: toOid(userId) }).sort({ createdAt: -1 }).lean();

export const createInvitation = async (student, { mentorEmail, note }) => {
  const email = String(mentorEmail).toLowerCase().trim();
  const invitee = await User.findOne({ email, role: 'mentor', mentorVerified: true });
  const raw = newToken(24);
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const invitation = await MentorInvitation.create({
    studentId: student._id,
    mentorEmail: email,
    mentorUserId: invitee?._id || null,
    note: (note || '').slice(0, 400),
    tokenHash: sha256(raw),
    expiresAt,
    status: 'pending',
  });
  const verifyUrl = `${config.frontends[0]}/mentor/invitations`;
  await emailService.send({
    to: email,
    subject: 'Career Evidence Coach — mentor invitation',
    text: `${student.name} invited you to mentor their project evidence. Accept at ${verifyUrl} with the token emailed to you.`,
    actionKind: 'mentor_invite',
    actionUrl: verifyUrl,
  });
  return { invitationId: String(invitation._id), mentorEmail: email, expiresAt, devEmail: config.isDev ? 'dev' : undefined };
};

export const listPendingInvitations = async (mentorUserId, mentorEmail) => {
  return MentorInvitation.find({
    status: 'pending',
    expiresAt: { $gt: new Date() },
    $or: [{ mentorUserId: toOid(mentorUserId) }, { mentorEmail: String(mentorEmail).toLowerCase() }],
  })
    .populate('studentId', 'name email')
    .sort({ createdAt: -1 })
    .lean();
};

export const acceptInvitation = async (mentorUser, rawToken) => {
  if (!mentorUser.mentorVerified) fail(403, 'A staff member must verify your mentor account first');
  const invite = await MentorInvitation.findOne({ tokenHash: sha256(rawToken), status: 'pending' });
  if (!invite || invite.expiresAt < new Date()) fail(400, 'Invitation expired or invalid');
  const grant = await MentorGrant.create({
    studentId: invite.studentId,
    mentorId: mentorUser._id,
    resumeIds: [],
    evidenceIds: [],
    note: invite.note,
    status: 'active',
    grantedVia: 'invitation',
  });
  invite.status = 'accepted';
  invite.acceptedAt = new Date();
  invite.grantId = grant._id;
  invite.mentorUserId = invite.mentorUserId || mentorUser._id;
  await invite.save();
  return grant;
};

export const revokeInvitation = async (student, invitationId) => {
  const invite = await MentorInvitation.findOne({ _id: toOid(invitationId), studentId: toOid(student._id) });
  if (!invite) fail(404, 'Invitation not found');
  invite.status = 'revoked';
  await invite.save();
  return invite;
};

/** Create/replace a share grant (student picks EXACTLY which evidence). */
export const createGrant = async (student, { mentorId, evidenceIds = [], resumeIds = [], note }) => {
  const mentor = await User.findOne({ _id: toOid(mentorId), role: 'mentor', mentorVerified: true });
  if (!mentor) fail(400, 'Mentor must have a verified mentor account');

  const ownedEvidence = evidenceIds.length
    ? await Evidence.countDocuments({ _id: { $in: evidenceIds }, userId: student._id })
    : 0;
  if (ownedEvidence !== evidenceIds.length) fail(400, 'Some evidence entries are not yours to share');
  const ownedResumes = resumeIds.length
    ? await Resume.countDocuments({ _id: { $in: resumeIds }, userId: student._id })
    : 0;
  if (ownedResumes !== resumeIds.length) fail(400, 'Some resumes are not yours to share');

  const grant = await MentorGrant.findOneAndUpdate(
    { studentId: student._id, mentorId: toOid(mentorId) },
    { $set: { evidenceIds, resumeIds, note: (note || '').slice(0, 400), status: 'active' } },
    { upsert: true, new: true }
  );
  return grant;
};

export const revokeGrant = async (student, grantId) => {
  const grant = await MentorGrant.findOne({ _id: toOid(grantId), studentId: toOid(student._id) });
  if (!grant) fail(404, 'Grant not found');
  grant.status = 'revoked';
  await grant.save();
  // Revocation must also invalidate retrieval scopes so RAG never surfaces the
  // student's private evidence again.
  return MentorGrant.findOne({ _id: grant._id }).lean();
};

export const listGrantsForMentor = async (mentorUserId) => {
  const grants = await MentorGrant.find({ mentorId: toOid(mentorUserId), status: 'active' })
    .populate('studentId', 'name email')
    .lean();
  return grants;
};

/** THE mentor access gate. Called on every mentor read/comment/RAG path. */
export const assertGrantAccess = async ({ mentorId, grantId, studentId, evidenceId, resumeId }) => {
  const filter = { mentorId: toOid(mentorId), status: 'active' };
  if (grantId) filter._id = toOid(grantId);
  if (studentId) filter.studentId = toOid(studentId);
  const grant = await MentorGrant.findOne(filter).lean();
  if (!grant) fail(403, 'No sharing grant covers this request');
  if (evidenceId && !(grant.evidenceIds || []).map(String).includes(String(evidenceId))) {
    fail(403, 'This evidence is not shared with you');
  }
  if (resumeId && !(grant.resumeIds || []).map(String).includes(String(resumeId))) {
    fail(403, 'This resume is not shared with you');
  }
  return grant;
};

// --- Reviews ----------------------------------------------------------------

export const createReview = async (mentor, { studentId, grantId, title, evidenceIds = [] }) => {
  const grant = await assertGrantAccess({ mentorId: mentor._id, grantId, studentId });
  const shared = new Set((grant.evidenceIds || []).map(String));
  const filtered = evidenceIds.filter((id) => shared.has(String(id)));
  if (evidenceIds.length && filtered.length !== evidenceIds.length) {
    fail(403, 'Review cannot reference evidence outside the sharing grant');
  }
  return Review.create({
    studentId: toOid(studentId),
    mentorId: mentor._id,
    grantId: grant._id,
    title,
    evidenceIds: filtered,
    status: 'open',
  });
};

export const getReview = async (viewer, reviewId, role) => {
  const review = await Review.findById(toOid(reviewId))
    .populate('mentorId', 'name')
    .populate('studentId', 'name')
    .lean();
  if (!review) fail(404, 'Review not found');
  if (role === 'mentor' && String(review.mentorId?._id || review.mentorId) !== String(viewer._id)) {
    fail(403, 'Not your review');
  }
  if (role === 'student' && String(review.studentId?._id || review.studentId) !== String(viewer._id)) {
    fail(403, 'Not your review');
  }
  if (role === 'mentor' && !(await assertGrantAccess({ mentorId: viewer._id, studentId: review.studentId?._id || review.studentId }))) {
    fail(403, 'Sharing grant no longer active');
  }
  const comments = await Comment.find({ reviewId: review._id }).sort({ createdAt: 1 }).populate('authorId', 'name role').lean();
  return { ...review, comments };
};

export const addComment = async (viewer, role, reviewId, body, evidenceId) => {
  if (!viewer) fail(401, 'Authentication required');
  const review = await Review.findById(toOid(reviewId)).lean();
  if (!review) fail(404, 'Review not found');
  if (role === 'mentor') {
    if (String(review.mentorId) !== String(viewer._id)) fail(403, 'Not your review');
    await assertGrantAccess({ mentorId: viewer._id, studentId: review.studentId });
  } else if (role === 'student') {
    if (String(review.studentId) !== String(viewer._id)) fail(403, 'Not your review');
  } else {
    fail(403, 'Only the student or the assigned mentor can comment');
  }
  if (evidenceId) {
    await assertGrantAccess({ mentorId: review.mentorId, studentId: review.studentId, evidenceId });
  }
  return Comment.create({
    reviewId: review._id,
    authorId: viewer._id,
    authorRole: role,
    body: String(body).slice(0, 4000),
    evidenceId: evidenceId || null,
  });
};

export const listReviewsForStudent = async (userId) => {
  const rows = await Review.find({ studentId: toOid(userId) }).populate('mentorId', 'name').sort({ createdAt: -1 }).lean();
  return rows;
};
