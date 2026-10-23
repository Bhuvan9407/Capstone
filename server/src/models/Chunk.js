import mongoose from 'mongoose';

/** A retrieval chunk: text slice + embedding, always scoped to its owner /
 *  sharer and joined to a source document. Deletion or revocation cascades
 *  here so retrieval can never surface stale or revoked content. */
export const CHUNK_PREFIX = 'chunk';

const chunkSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    docId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', index: true },
    evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence', index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', index: true },
    idx: { type: Number, required: true },
    sectionTitle: { type: String, maxlength: 120 },
    startPos: { type: Number },
    endPos: { type: Number },
    text: { type: String, required: true, maxlength: 8000 },
    embedding: { type: [Number] },
    embeddingModel: { type: String, default: '' },
    embeddedAt: { type: Date },
  },
  { timestamps: true, collection: 'chunks' }
);

chunkSchema.index({ ownerId: 1, docId: 1, idx: 1 });
chunkSchema.index({ ownerId: 1, embeddingModel: 1 });

const Chunk = mongoose.models.Chunk || mongoose.model('Chunk', chunkSchema);
export default Chunk;
