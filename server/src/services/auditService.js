import AuditLog from '../models/AuditLog.js';

export const audit = async ({ actor = null, action, targetType = '', targetId = null, detail = {}, ip = '' }) => {
  try {
    await AuditLog.create({
      actorId: actor?._id || null,
      actorRole: actor?.role || '',
      actorIp: String(ip || '').slice(0, 60),
      action,
      targetType,
      targetId: targetId || null,
      detail,
    });
  } catch (err) {
    // Audit failures must not break the request unless audit is the feature.
    console.error('[audit] write failed:', err.message);
  }
};

export const listAudit = async (filter = {}, { skip = 0, limit = 50 } = {}) => {
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actorId', 'name role').lean(),
    AuditLog.countDocuments(filter),
  ]);
  return { items, total };
};
