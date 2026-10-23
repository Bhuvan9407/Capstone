import mongoose from 'mongoose';

/** A mentor review over an explicitly shared set of student evidence. */
const reviewSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    grantId: { type: mongoose.Schema.Types.ObjectId, ref: 'MentorGrant', required: true, index: true },
    title: { type: String, required: true, maxlength: 160 },
    evidenceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }],
    status: {
      type: String,
      enum: ['open', 'completed', 'archived'],
      default: 'open',
      index: true,
    },
    summary: { type: String, maxlength: 4000, default: '' },
    suggestedImprovements: [
      { type: String, maxlength: 500 },
    ],
    practiceSuggestions: [
      {
        title: { type: String, maxlength: 160 },
        detail: { type: String, maxlength: 1000 },
        dueOption: { type: String, maxlength: 60 },
      },
    ],
    practiceSuggestionsGiven: [
      {
        text: { type: String, maxlength: 500 },
        at: { type: Date, default: Date.now },
      },
    ],
    completedAt: { type: Date },
  },
  { timestamps: true, collection: 'reviews' }
);

reviewSchema.index({ studentId: 1, createdAt: -1 });
reviewSchema.index({ mentorId: 1, createdAt: -1 });

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
export default Review;
