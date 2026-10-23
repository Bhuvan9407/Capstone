import mongoose from 'mongoose';

/** A grant gives one mentor access to an explicitly chosen subset of one
 *  student's resumes + evidence. Revocation takes effect on every read path,
 *  including AI retrieval. */
const grantSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resumeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resume' }],
    evidenceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }],
    note: { type: String, maxlength: 400, default: '' },
    status: { type: String, enum: ['active', 'revoked'], default: 'active', index: true },
    grantedVia: { type: String, default: 'student' },
  },
  { timestamps: true, collection: 'mentor_grants' }
);

grantSchema.index({ studentId: 1, mentorId: 1 }, { unique: true });

const MentorGrant =
  mongoose.models.MentorGrant || mongoose.model('MentorGrant', grantSchema);
export default MentorGrant;
