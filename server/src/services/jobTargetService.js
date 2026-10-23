import JobTarget from '../models/JobTarget.js';
import { fail, toOid } from '../utils/core.js';
import mongoose from 'mongoose';

export const listTargets = async (userId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const filter = { userId: toOid(userId) };
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    JobTarget.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    JobTarget.countDocuments(filter),
  ]);
  return { items, total, page, pages: Math.ceil(total / limit) || 1 };
};

export const getTarget = async (userId, id) => {
  const doc = await JobTarget.findOne({ _id: toOid(id), userId: toOid(userId) }).lean();
  if (!doc) fail(404, 'Job target not found');
  return doc;
};

export const createTarget = async (userId, payload) => {
  return JobTarget.create({ ...payload, userId: toOid(userId), status: 'draft' });
};

export const updateTarget = async (userId, id, patch) => {
  const doc = await JobTarget.findOne({ _id: toOid(id), userId: toOid(userId) });
  if (!doc) fail(404, 'Job target not found');
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([k]) => !['userId', '_id', 'createdAt'].includes(k))
  );
  Object.assign(doc, clean);
  await doc.save();
  return doc;
};

export const deleteTarget = async (userId, id) => {
  const doc = await JobTarget.findOneAndDelete({ _id: toOid(id), userId: toOid(userId) });
  if (!doc) fail(404, 'Job target not found');
  return doc;
};

/** Confirm extracted requirements — the student's manual corrections are final. */
export const confirmRequirements = async (userId, id, { consolidatedSkills = [], hardReqs = [] } = {}) => {
  const doc = await JobTarget.findOne({ _id: toOid(id), userId: toOid(userId) });
  if (!doc) fail(404, 'Job target not found');
  if (hardReqs.length) {
    doc.hardReqs = hardReqs.map((r) => ({ ...r, weight: Number(r.weight) ? Number(r.weight) : 2 }));
  }
  if (consolidatedSkills.length) doc.consolidatedSkills = consolidatedSkills;
  doc.status = 'ready';
  await doc.save();
  return doc;
};
