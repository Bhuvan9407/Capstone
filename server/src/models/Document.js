import mongoose from 'mongoose';

/** A private, stored document (uploaded resumes, README/writeup attachments).
 *  Extracted text + chunk-web reference go here; the binary is kept on disk with
 *  a random storage key, never the caller-supplied filename. */
const documentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: {
      type: String,
      enum: ['resume', 'readme', 'writeup', 'job_description', 'achievement_file'],
      default: 'resume',
      index: true,
    },
    fileName: { type: String, required: true, maxlength: 200 },
    mimeType: { type: String, required: true, maxlength: 100 },
    sizeBytes: { type: Number, required: true },
    checksum: { type: String, maxlength: 200 },
    status: {
      type: String,
      enum: ['uploaded', 'extracting', 'embedding', 'ready', 'failed'],
      default: 'uploaded',
      index: true,
    },
    error: { type: String, maxlength: 500 },
    extractedText: { type: String, default: '' },
    chunkIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chunk' }],
    evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence', index: true },
    version: { type: Number, default: 1 },
    isCurrent: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'documents' }
);

documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ status: 1, isCurrent: 1 });

const Doc = mongoose.models.Document || mongoose.model('Document', documentSchema);
export default Doc;
