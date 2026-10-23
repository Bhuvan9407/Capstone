import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Only the SHA-256 of the opaque token is stored; the raw value lives in the HttpOnly cookie.
    tokenHash: { type: String, required: true, unique: true },
    userAgent: { type: String, maxlength: 250 },
    ip: { type: String, maxlength: 60 },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  { timestamps: true, collection: 'sessions' }
);

// TTL cleanup of long-expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 120 });

const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
export default Session;
