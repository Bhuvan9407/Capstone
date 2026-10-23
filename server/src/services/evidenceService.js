import Evidence, { EVIDENCE_TYPES, EVIDENCE_STATUS } from '../models/Evidence.js';
import mongoose from 'mongoose';
import { pagination, fail, objectId } from '../utils/core.js';

/** List own evidence with search / filter / sort / pagination. */
export const listEvidence = async (userId, query) => {
  const { page, limit, skip } = pagination(query);
  const filter = { userId };
  if (query.type && EVIDENCE_TYPES.includes(query.type)) filter.kind = query.type;
  if (query.status && EVIDENCE_STATUS.includes(query.status)) filter.status = query.status;
  if (query.skill) {
    const skill = String(query.skill).trim();
    if (skill) filter.techSkills = { $regex: skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  if (query.q) {
    const q = String(query.q).trim();
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: rx }, { description: rx }, { organization: rx }, { techSkills: rx }];
    }
  }
  let sort = { createdAt: -1 };
  if (query.sort === 'oldest') sort = { createdAt: 1 };
  if (query.sort === 'title') sort = { title: 1 };
  if (query.sort === 'updated') sort = { updatedAt: -1 };

  const [items, total] = await Promise.all([
    Evidence.find(filter).sort(sort).skip(skip).limit(limit).lean({ virtuals: true }),
    Evidence.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
};

export const getEvidence = async (userId, id) => {
  objectId(id, 'evidence id');
  const doc = await Evidence.findOne({ _id: id, userId }).lean();
  if (!doc) fail(404, 'Evidence not found');
  return doc;
};

/** Only students create evidence; ownership is bound to the session user. */
export const createEvidence = async (user, payload) => {
  return Evidence.create({ ...payload, userId: user._id });
};

export const updateEvidence = async (userId, id, patch) => {
  const doc = await Evidence.findOne({ _id: id, userId });
  if (!doc) fail(404, 'Evidence not found');
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  Object.assign(doc, clean);
  await doc.save();
  return doc;
};

export const deleteEvidence = async (userId, id) => {
  const doc = await Evidence.findOneAndDelete({ _id: id, userId });
  if (!doc) fail(404, 'Evidence not found');
  return doc;
};

/** Distinct skill + type facets for the library filter sidebar. */
export const evidenceFacets = async (userId) => {
  const skills = await Evidence.distinct('techSkills', { userId });
  const byType = await Evidence.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(String(userId)) } },
    { $group: { _id: '$kind', count: { $sum: 1 } } },
  ]).catch(() => []);
  return { skills: skills.filter(Boolean).slice(0, 100), byType };
};
