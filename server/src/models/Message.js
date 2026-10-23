import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 12000 },
    sources: [
      {
        kind: { type: String, enum: ['resume', 'evidence', 'chunk', 'job_target'] },
        id: { type: mongoose.Schema.Types.ObjectId },
        title: { type: String, maxlength: 200 },
        snippet: { type: String, maxlength: 400 },
      },
    ],
    stagedPlan: { type: Object },
  },
  { timestamps: true, collection: 'conversation_messages' }
);

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export default Message;
