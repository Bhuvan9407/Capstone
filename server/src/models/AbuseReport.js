import mongoose from 'mongoose';

const abuseReportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    targetKind: {
      type: String,
      enum: ['portfolio', 'comment', 'evidence'],
      required: true,
      index: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    reason: {
      type: String,
      enum: ['abusive', 'plagiarism', 'privacy', 'other'],
      required: true,
    },
    detail: { type: String, required: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['open', 'resolved', 'dismissed'],
      default: 'open',
      index: true,
    },
    resolutionNote: { type: String, maxlength: 1000 },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true, collection: 'abuse_reports' }
);

const AbuseReport =
  mongoose.models.AbuseReport || mongoose.model('AbuseReport', abuseReportSchema);
export default AbuseReport;
