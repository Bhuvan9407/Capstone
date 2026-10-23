import mongoose from 'mongoose';

export const EVIDENCE_TYPES = [
  'project',
  'tech_skill',
  'github_repo',
  'readme',
  'writeup',
  'portfolio_link',
  'certification',
  'achievement',
  'course',
];

export const EVIDENCE_STATUS = ['draft', 'unverified', 'claimed', 'verified'];

const evidenceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: EVIDENCE_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    organization: { type: String, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 4000, default: '' },
    repoUrl: { type: String, trim: true, maxlength: 500 },
    demoUrl: { type: String, trim: true, maxlength: 500 },
    techSkills: [{ type: String, trim: true, maxlength: 40 }],
    startedAt: { type: Date },
    endedAt: { type: Date },
    status: { type: String, enum: EVIDENCE_STATUS, default: 'unverified', index: true },
    statusNotes: { type: String, maxlength: 500, default: '' },
    fromResumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
    mentorFeedback: [
      {
        byId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, maxlength: 1000 },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, collection: 'evidence' }
);

evidenceSchema.index({ userId: 1, kind: 1, createdAt: -1 });
evidenceSchema.index({ title: 'text', description: 'text', organization: 'text' });

const Evidence = mongoose.models.Evidence || mongoose.model('Evidence', evidenceSchema);
export default Evidence;
