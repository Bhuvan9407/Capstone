import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorRole: { type: String, enum: ['student', 'mentor', 'admin'], required: true },
    body: { type: String, required: true, maxlength: 4000 },
    evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence', index: true },
  },
  { timestamps: true, collection: 'comments' }
);

commentSchema.index({ reviewId: 1, createdAt: 1 });

const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
export default Comment;
