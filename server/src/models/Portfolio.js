import mongoose from 'mongoose';

export const PORTFOLIO_FIELDS = [
  'publicName', 'headline', 'intro', 'emailPublic', 'githubUrl', 'linkedinUrl',
  'school', 'coursework', 'expertise', 'evidenceIds', 'isPublished',
];

const portfolioSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    slug: { type: String, unique: true, sparse: true, lowercase: true },
    publicName: { type: String, default: '', maxlength: 80 },
    headline: { type: String, default: '', maxlength: 160 },
    intro: { type: String, default: '', maxlength: 1200 },
    emailPublic: { type: String, default: '', maxlength: 120 },
    githubUrl: { type: String, default: '', maxlength: 300 },
    linkedinUrl: { type: String, default: '', maxlength: 300 },
    school: { type: String, default: '', maxlength: 140 },
    coursework: [{ type: String, maxlength: 80 }],
    expertise: [{ type: String, maxlength: 40 }],
    evidenceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }],
    isPublished: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, collection: 'portfolios' }
);

const Portfolio = mongoose.models.Portfolio || mongoose.model('Portfolio', portfolioSchema);
export default Portfolio;
