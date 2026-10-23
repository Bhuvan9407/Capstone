import DevInbox from '../models/DevInbox.js';
import { config } from '../config/index.js';

/**
 * Dev email adapter: stores the message in Mongo + console. Swap this module
 * out behind the same interface for SMTP/SES in production (see docs/architecture.md).
 */
const send = async ({ to, subject, text, actionKind, actionUrl }) => {
  if (config.email.adapter === 'dev') {
    await DevInbox.create({ to, subject, text, actionKind, actionUrl });
    if (!config.isTest) console.log(`[dev-inbox] ${subject} -> ${to} ${actionUrl || ''}`);
    return { adapter: 'dev', delivered: true };
  }
  // Production adapter not implemented in this capstone build.
  throw new Error(`Email adapter "${config.email.adapter}" is not configured`);
};

export default { send };
