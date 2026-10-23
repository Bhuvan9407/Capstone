import mongoose from 'mongoose';

/** Public, editor-maintained role guides surfaced on landing / directory pages. */
const roleGuideSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 120, unique: true },
    headline: { type: String, maxlength: 200, default: '' },
    summary: { type: String, maxlength: 1200, default: '' },
    skills: [{ type: String, maxlength: 60 }],
    evidenceIdeas: [{ type: String, maxlength: 140 }],
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'role_guides' }
);

const RoleGuide = mongoose.models.RoleGuide || mongoose.model('RoleGuide', roleGuideSchema);
export default RoleGuide;
