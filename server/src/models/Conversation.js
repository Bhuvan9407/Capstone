import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, maxlength: 120, default: 'Career chat' },
  },
  { timestamps: true, collection: 'conversations' }
);

const Conversation =
  mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
export default Conversation;
