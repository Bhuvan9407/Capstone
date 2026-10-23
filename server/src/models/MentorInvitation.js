import mongoose from 'mongoose';

/** Student -> mentor invitation. Retired after acceptance or revocation.
 *  The raw token is emailed and never stored. */
const invitationSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mentorEmail: { type: String, required: true, lowercase: true, index: true },
    mentorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    note: { type: String, maxlength: 400, default: '' },
    status: { type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending', index: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    grantId: { type: mongoose.Schema.Types.ObjectId, ref: 'MentorGrant' },
  },
  { timestamps: true, collection: 'mentor_invitations' }
);

const MentorInvitation =
  mongoose.models.MentorInvitation ||
  mongoose.model('MentorInvitation', invitationSchema);
export default MentorInvitation;
