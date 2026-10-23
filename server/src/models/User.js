import mongoose from 'mongoose';

export const ROLES = ['student', 'mentor', 'admin'];

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, enum: ROLES, required: true, default: 'student' },
    // Students only: aggregate flags
    emailVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'disabled'], default: 'active', index: true },

    // Student-facing profile (portfolio surface)
    portfolioSlug: { type: String, unique: true, sparse: true, lowercase: true, index: true },
    headline: { type: String, maxlength: 140, default: '' },
    bio: { type: String, maxlength: 800, default: '' },
    institution: { type: String, maxlength: 120, default: '' },

    // Mentor surface, verified by an admin before grants can be accepted
    mentorVerified: { type: Boolean, default: false },
    mentorVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    mentorVerifiedAt: { type: Date },
    mentorBio: { type: String, maxlength: 500, default: '' },
    mentorExpertise: [{ type: String, trim: true }],
  },
  { timestamps: true, collection: 'users' }
);

userSchema.methods.safeView = function safeView() {
  return {
    id: String(this._id),
    email: this.email,
    name: this.name,
    role: this.role,
    emailVerified: this.emailVerified,
    status: this.status,
    portfolioSlug: this.portfolioSlug,
    headline: this.headline,
    bio: this.bio,
    institution: this.institution,
    mentorVerified: this.mentorVerified,
    mentorBio: this.mentorBio,
    mentorExpertise: this.mentorExpertise,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
