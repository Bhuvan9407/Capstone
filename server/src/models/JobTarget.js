import mongoose from 'mongoose';

export const TARGET_STATUS = ['draft', 'processing', 'ready', 'failed'];

const jobTargetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    organization: { type: String, maxlength: 120 },
    city: { type: String, maxlength: 120 },
    rawDescription: { type: String, required: true, maxlength: 20000 },
    status: { type: String, enum: TARGET_STATUS, default: 'draft', index: true },
    consolidatedSkills: [{ type: String, trim: true }],
    hardReqs: [
      {
        statement: { type: String, required: true, maxlength: 300 },
        category: {
          type: String,
          enum: [
            'language',
            'framework',
            'database',
            'testing',
            'devops',
            'ai_ml',
            'security',
            'performance',
            'tools',
            'soft_skills',
            'education',
            'experience',
            'other',
          ],
          required: true,
        },
        weight: { type: Number, enum: [1, 2, 3], default: 2 },
        inferred: { type: Boolean, default: false },
      },
    ],
    discoveredSkills: [
      {
        skill: { type: String, required: true, maxlength: 40 },
        inferred: { type: Boolean, default: false },
      },
    ],
    mentorFeedback: [
      {
        byId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, maxlength: 1500 },
        at: { type: Date, default: Date.now },
      },
    ],
    realizationError: { type: String, maxlength: 500 },
  },
  { timestamps: true, collection: 'job_targets' }
);

jobTargetSchema.index({ userId: 1, createdAt: -1 });

const JobTarget = mongoose.models.JobTarget || mongoose.model('JobTarget', jobTargetSchema);
export default JobTarget;
