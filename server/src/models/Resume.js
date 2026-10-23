import mongoose from 'mongoose';

export const RESUME_STATUS = ['uploaded', 'extracting', 'embedding', 'ready', 'failed'];

const resumeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true, maxlength: 200 },
    mimeType: { type: String, required: true, maxlength: 100 },
    sizeBytes: { type: Number, required: true },
    storageKey: { type: String, required: true },
    checksum: { type: String, maxlength: 140 },
    extractedText: { type: String, default: '' },
    pageCount: { type: Number, default: 0 },
    status: { type: String, enum: RESUME_STATUS, default: 'uploaded', index: true },
    error: { type: String, maxlength: 600 },
    skills: [{ type: String, trim: true, maxlength: 60 }],
    version: { type: Number, default: 1 },
  },
  { timestamps: true, collection: 'resumes' }
);

resumeSchema.index({ userId: 1, createdAt: -1 });

resumeSchema.methods.publicList = function publicList() {
  return {
    id: String(this._id),
    fileName: this.fileName,
    mimeType: this.mimeType,
    sizeBytes: this.sizeBytes,
    status: this.status,
    pageCount: this.pageCount,
    skills: this.skills,
    error: this.error,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

resumeSchema.methods.ownerView = function ownerView() {
  return { ...this.publicList(), extractedText: this.extractedText };
};

const Resume = mongoose.models.Resume || mongoose.model('Resume', resumeSchema);
export default Resume;
