import mongoose from 'mongoose';

/** Content a public portfolio served and an admin decided to disable publicly. */
const moderationActionSchema = new mongoose.Schema(
  {
    contentType: { type: String, enum: ['portfolio', 'comment'], required: true, index: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    action: { type: String, enum: ['disable', 'enable'], required: true },
    reason: { type: String, maxlength: 500 },
    byId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'moderation_actions' }
);

const ModerationAction =
  mongoose.models.ModerationAction ||
  mongoose.model('ModerationAction', moderationActionSchema);
export default ModerationAction;
