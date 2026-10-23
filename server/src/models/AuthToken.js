import mongoose from 'mongoose';

/** Single-use expiring tokens for email verification / password reset.
 *  The raw token is never stored — only sha256(raw), so DB access alone does not
 *  reveal a usable token. */
export const TOKEN_KINDS = ['verify_email', 'reset_password', 'mentor_invite', 'admin_setup'];

const tokenSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: TOKEN_KINDS, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    email: { type: String, lowercase: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    usedAt: { type: Date },
    expiresAt: { type: Date, required: true },
    payload: { type: Object, default: {} },
  },
  { timestamps: true, collection: 'auth_tokens' }
);

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

const AuthToken =
  mongoose.models.AuthToken || mongoose.model('AuthToken', tokenSchema);
export default AuthToken;
