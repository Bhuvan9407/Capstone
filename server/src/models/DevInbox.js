import mongoose from 'mongoose';

/** Development-only email adapter: verification and password-reset mails are
 *  captured here (and logged to console) instead of an external SMTP service,
 *  making local verification demos repeatable. */
const devInboxSchema = new mongoose.Schema(
  {
    to: { type: String, required: true, lowercase: true, index: true },
    subject: { type: String, maxlength: 200 },
    text: { type: String, maxlength: 6000 },
    actionKind: { type: String, maxlength: 40 },
    actionUrl: { type: String, maxlength: 500 },
  },
  { timestamps: true, collection: 'dev_inbox' }
);

devInboxSchema.index({ createdAt: -1 });
devInboxSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 3600 });

const DevInbox = mongoose.models.DevInbox || mongoose.model('DevInbox', devInboxSchema);
export default DevInbox;
