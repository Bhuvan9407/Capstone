import mongoose from 'mongoose';

/** Security-sensitive action trail: role/grant/publish operations, etc. */
const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    actorRole: { type: String, maxlength: 20 },
    actorIp: { type: String, maxlength: 60 },
    action: { type: String, required: true, maxlength: 80, index: true },
    targetType: { type: String, maxlength: 60, index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, index: true },
    detail: { type: Object, default: {} },
  },
  { timestamps: true, collection: 'audit_logs' }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
