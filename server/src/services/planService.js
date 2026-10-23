import PracticePlan from '../models/PracticePlan.js';
import JobTarget from '../models/JobTarget.js';
import { toOid, fail } from '../utils/core.js';

export const listPlans = async (userId, { status } = {}) => {
  const filter = { userId: toOid(userId) };
  if (status) filter.status = status;
  return PracticePlan.find(filter).sort({ updatedAt: -1 }).limit(100).lean();
};

export const getPlan = async (userId, planId) => {
  const plan = await PracticePlan.findOne({ _id: toOid(planId), userId: toOid(userId) }).lean();
  if (!plan) fail(404, 'Plan not found');
  return plan;
};

export const updateDraftPlan = async (userId, planId, { items, input, focusSkills } = {}) => {
  const plan = await PracticePlan.findOne({ _id: toOid(planId), userId: toOid(userId) });
  if (!plan) fail(404, 'Plan not found');
  if (plan.status === 'confirmed') fail(409, 'Confirmed plans are immutable — regenerate a plan instead');
  if (Array.isArray(items)) plan.items = items;
  if (input) plan.input = { ...plan.input, ...input };
  if (Array.isArray(focusSkills)) plan.focusSkills = focusSkills;
  await plan.validate();
  await plan.save();
  return plan;
};

export const deletePlan = async (userId, planId) => {
  const plan = await PracticePlan.findOneAndDelete({ _id: toOid(planId), userId: toOid(userId) });
  if (!plan) fail(404, 'Plan not found');
  return plan;
};

/**
 * Explicit confirmation of a DRAFT plan (spec section 15 + acceptance test 12:
 * concurrent confirmations must not create duplicates). The plan flips from
 * draft -> confirmed with a guarded update; only the first request wins, so a
 * double-click or a replay produces 409 instead of a second confirmed plan.
 */
export const confirmPlan = async (userId, planId) => {
  const existing = await PracticePlan.findOne({ _id: toOid(planId), userId: toOid(userId) });
  if (!existing) fail(404, 'Plan not found');
  if (existing.status === 'confirmed') {
    return { alreadyConfirmed: true, plan: existing };
  }
  if (existing.status !== 'draft') fail(409, `Cannot confirm a plan with status "${existing.status}"`);

  const target = await JobTarget.findOne({ _id: existing.jobTargetId, userId: toOid(userId) }).lean();
  if (!target) fail(409, 'Job target no longer exists — regenerate the plan');

  const outcome = await PracticePlan.updateOne(
    { _id: existing._id, userId: toOid(userId), status: 'draft' },
    { $set: { status: 'confirmed', confirmedAt: new Date() } }
  );
  if (!outcome.modifiedCount) {
    return { alreadyConfirmed: true, plan: await PracticePlan.findById(existing._id).lean() };
  }
  return { alreadyConfirmed: false, plan: await PracticePlan.findById(existing._id).lean() };
};

export const setItemCompleted = async (userId, planId, itemIndex, completed) => {
  const plan = await PracticePlan.findOne({ _id: toOid(planId), userId: toOid(userId) });
  if (!plan) fail(404, 'Plan not found');
  const item = plan.items[itemIndex];
  if (!item) fail(404, 'Plan item not found');
  item.completed = Boolean(completed);
  item.completedAt = item.completed ? new Date() : undefined;
  await plan.save();
  return plan;
};
