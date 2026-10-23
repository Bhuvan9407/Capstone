import mongoose from 'mongoose';
import User from '../models/User.js';
import Review from '../models/Review.js';
import AbuseReport from '../models/AbuseReport.js';
import ModerationAction from '../models/ModerationAction.js';
import Portfolio from '../models/Portfolio.js';
import Session from '../models/Session.js';
import { audit, listAudit } from './auditService.js';
import { fail, toOid } from '../utils/core.js';
import { AgentRun, MentorGrant } from '../models/index.js';

export const unverifiedMentors = async () =>
  User.find({ role: 'mentor', mentorVerified: false })
    .select('name email mentorExpertise mentorBio createdAt')
    .lean();

export const verifyMentor = async (admin, mentorId, { verified }) => {
  const mentor = await User.findById(toOid(mentorId));
  if (!mentor || mentor.role !== 'mentor') fail(404, 'Mentor account not found');
  mentor.mentorVerified = Boolean(verified);
  mentor.mentorVerifiedBy = admin._id;
  mentor.mentorVerifiedAt = mentor.mentorVerified ? new Date() : undefined;
  await mentor.save();
  await audit({
    actor: admin,
    action: verified ? 'mentor.verified' : 'mentor.unverified',
    targetType: 'user',
    targetId: mentor._id,
    detail: { email: mentor.email },
  });
  return mentor.safeView();
};

export const processAbuseReport = async (admin, reportId, { status, resolutionNote }) => {
  const report = await AbuseReport.findById(toOid(reportId));
  if (!report) fail(404, 'Abuse report not found');
  if (!['open', 'resolved', 'dismissed'].includes(status)) fail(422, 'Invalid report status');
  report.status = status;
  report.resolutionNote = (resolutionNote || '').slice(0, 1000);
  report.resolvedBy = admin._id;
  report.resolvedAt = status === 'open' ? undefined : new Date();
  await report.save();
  await audit({ actor: admin, action: 'abuse.processed', targetType: 'abuse_report', targetId: report._id, detail: { status } });
  return report;
};

export const addAbuseReport = async (reporter, payload) => {
  const report = await AbuseReport.create({ reporterId: reporter?._id || null, ...payload });
  await audit({ actor: reporter, action: 'abuse.filed', targetType: payload.targetKind, targetId: payload.targetId, detail: { reason: payload.reason } });
  return report;
};

export const listAbuseReports = async ({ status } = {}) => {
  const filter = status ? { status } : {};
  return AbuseReport.find(filter).sort({ createdAt: -1 }).limit(100).lean();
};

/** Disable a published portfolio flagged as unsafe. Revokes public reachability
 *  but does not expose the private content to admins. */
export const moderatePortfolio = async (admin, portfolioId, { action, reason }) => {
  const doc = await Portfolio.findById(toOid(portfolioId));
  if (!doc) fail(404, 'Portfolio not found');
  const disable = action === 'disable';
  doc.isPublished = disable ? false : doc.isPublished;
  await doc.save();
  await ModerationAction.create({ contentType: 'portfolio', contentId: doc._id, action, reason: (reason || '').slice(0, 500), byId: admin._id });
  await audit({ actor: admin, action: `portfolio.${action}`, targetType: 'portfolio', targetId: doc._id, detail: { reason } });
  return doc;
};

export const enablePortfolio = async (admin, portfolioId, reason) =>
  moderatePortfolio(admin, portfolioId, { action: 'enable', reason });

export const moderateComment = async (admin, commentId, { action, reason }) => {
  const Comment = (await import('../models/index.js')).Comment;
  const comment = await Comment.findById(toOid(commentId));
  if (!comment) fail(404, 'Comment not found');
  await ModerationAction.create({ contentType: 'comment', contentId: comment._id, action, reason: (reason || '').slice(0, 500), byId: admin._id });
  await audit({ actor: admin, action: `comment.${action}`, targetType: 'comment', targetId: comment._id, detail: { reason } });
  return { id: String(comment._id), action };
};

export const serviceHealth = async () => {
  const AgentRunModel = AgentRun;
  const [sessionCount, userCount, planCount, grantCount, failedRuns, runningRuns, openReports] = await Promise.all([
    Session.countDocuments({}),
    User.countDocuments({}),
    Review.countDocuments({}),
    MentorGrant.countDocuments({ status: 'active' }),
    AgentRunModel.countDocuments({ status: 'failed' }),
    AgentRunModel.countDocuments({ status: 'running' }),
    AbuseReport.countDocuments({ status: 'open' }),
  ]);
  const dbState = mongooseState();
  return {
    db: dbState,
    counts: { sessions: sessionCount, users: userCount, reviews: planCount, activeGrants: grantCount },
    agent: { failedRuns, runningRuns },
    abuse: { openReports },
    moderation: { enabled: true },
  };
};

const mongooseState = () => ({
  state: mongooseConnectionState(),
  healthy: mongooseConnectionState() === 1,
});

const mongooseConnectionState = () =>
  mongoose.connection?.readyState ?? -1;

export const auditTrail = listAudit;
