import mongoose from 'mongoose';

export const PLAN_STATUS = ['draft', 'ready', 'confirmed'];

const planSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jobTargetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobTarget',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: PLAN_STATUS,
      default: 'draft',
      index: true,
    },
    confirmedAt: { type: Date },
    input: {
      hoursPerWeek: { type: Number, min: 1, max: 60, default: 8 },
      durationWeeks: { type: Number, min: 1, max: 24, default: 4 },
    },
    focusSkills: [{ type: String, trim: true, maxlength: 60 }],
    items: [
      {
        skill: { type: String, maxlength: 60 },
        reqRef: {
          statement: { type: String, maxlength: 300 },
          category: { type: String, maxlength: 40 },
        },
        durationHours: { type: Number, min: 0.5, max: 20 },
        assignedWeek: { type: Number, min: 1, max: 24, required: true },
        deliverable: { type: String, maxlength: 300 },
        evidenceToRecord: { type: String, maxlength: 300 },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
      },
    ],
    mentorFeedback: [
      {
        byId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, maxlength: 1500 },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, collection: 'practice_plans' }
);

planSchema.index({ userId: 1, jobTargetId: 1, createdAt: -1 });

const PracticePlan =
  mongoose.models.PracticePlan || mongoose.model('PracticePlan', planSchema);
export default PracticePlan;
