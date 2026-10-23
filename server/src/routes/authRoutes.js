import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import User from '../models/User.js';
import DevInbox from '../models/DevInbox.js';
import { requireAuth, issueSession, revokeSession, revokeAllUserSessions, setSessionCookie, clearSessionCookie, SESSION_COOKIE } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, changePasswordSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/index.js';
import { issueToken, consumeToken } from '../services/tokenService.js';
import emailService from '../services/emailService.js';
import { asyncHandler, fail, toOid } from '../utils/core.js';
import { getMe } from '../services/dashboardService.js';
import { config } from '../config/index.js';
import { audit } from '../services/auditService.js';

const router = Router();

// ---------- public ----------------------------------------------------------

// Mentor self-registration — still requires admin verification before grants work.
router.post(
  '/register/mentor',
  validate(registerSchema.omit({ institution: true }).extend({ title: z.string().trim().max(140).optional().default('') })),
  asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase().trim();
    if (await User.exists({ email })) {
      return res.status(201).json({ message: 'Request received. An administrator will verify mentor accounts.' });
    }
    await User.create({
      name: req.body.name.trim(),
      email,
      passwordHash: await argon2.hash(req.body.password),
      role: 'mentor', // never admin
      mentorVerified: false, // staff approval required (spec 4)
      mentorBio: req.body.title || '',
    });
    res.status(201).json({ message: 'Request received. An administrator verifies mentor accounts before access.' });
  })
);

router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase().trim();
    const exists = await User.exists({ email });
    if (!exists) {
      const user = await User.create({
        name: req.body.name.trim(),
        email,
        passwordHash: await argon2.hash(req.body.password),
        role: 'student', // registrations always create students only
        institution: (req.body.institution || '').slice(0, 120),
      });
      const raw = await issueToken('verify_email', { userId: user._id, email });
      const verifyUrl = `${config.frontends[0]}/verify-email?token=${encodeURIComponent(raw)}`;
      await emailService.send({
        to: email,
        subject: 'Career Evidence Coach — verify your email',
        text: `Welcome! Verify your email before your first sign-in: ${verifyUrl}`,
        actionKind: 'verify_email',
        actionUrl: verifyUrl,
      });
    }
    // Generic response whether or not the account already existed (no enumeration).
    res.status(201).json({ message: 'Account created if this email was free. Check the inbox to verify your address.' });
  })
);

router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  asyncHandler(async (req, res) => {
    const info = await consumeToken('verify_email', req.body.token);
    await User.updateOne({ _id: info.userId }, { $set: { emailVerified: true } });
    res.json({ message: 'Email verified. You can sign in now.' });
  })
);

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase().trim();
    const user = await User.findOne({ email });
    const passwordOk = user
      ? await argon2.verify(user.passwordHash, req.body.password).catch(() => false)
      : false;
    if (!user || !passwordOk) {
      return res.status(401).json({ error: { code: 'BAD_CREDENTIALS', message: 'Email or password is incorrect' } });
    }
    if (user.status === 'disabled') {
      return res.status(403).json({ error: { code: 'ACCOUNT_DISABLED', message: 'This account is disabled. Contact an administrator.' } });
    }
    if (!user.emailVerified) {
      return res.status(403).json({ error: { code: 'EMAIL_UNVERIFIED', message: 'Verify your email first — the verification mail is in your dev inbox.' } });
    }
    const raw = await issueSession(user, { userAgent: req.headers['user-agent'], ip: req.ip });
    setSessionCookie(res, raw);
    res.json({ message: 'Signed in', user: user.safeView() });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await revokeSession(req.cookies?.[SESSION_COOKIE]);
    clearSessionCookie(res);
    res.json({ message: 'Signed out' });
  })
);

router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (user) {
      const raw = await issueToken('reset_password', { userId: user._id, email });
      const url = `${config.frontends[0]}/reset-password?token=${encodeURIComponent(raw)}`;
      await emailService.send({
        to: email,
        subject: 'Career Evidence Coach — password reset',
        text: `Reset link (expires in 60 minutes, single use): ${url}`,
        actionKind: 'reset_password',
        actionUrl: url,
      });
    }
    // Always the same response — no account enumeration.
    res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  })
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const info = await consumeToken('reset_password', req.body.token);
    const user = await User.findById(info.userId);
    if (!user) return res.status(400).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset link' } });
    user.passwordHash = await argon2.hash(req.body.newPassword);
    await user.save();
    await revokeAllUserSessions(user._id); // sessions revoked on password reset (spec 4)
    await audit({ actor: user, action: 'password.reset', targetType: 'user', targetId: user._id, ip: req.ip });
    res.json({ message: 'Password updated. Sign in again with your new password.' });
  })
);

// ---------- authenticated ---------------------------------------------------

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: await getMe(req.user) });
  })
);

router.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const ok = await argon2.verify(user.passwordHash, req.body.currentPassword).catch(() => false);
    if (!ok) {
      return res.status(422).json({ error: { code: 'WRONG_PASSWORD', message: 'Current password is incorrect' } });
    }
    user.passwordHash = await argon2.hash(req.body.newPassword);
    await user.save();
    await revokeAllUserSessions(user._id);
    clearSessionCookie(res);
    res.json({ message: 'Password changed. Please sign in again.' });
  })
);

// dev-only inbox (also enabled for tests) so verification/reset demos are repeatable locally
if (config.isDev || config.isTest) {
  router.get(
    '/dev-inbox',
    asyncHandler(async (_req, res) => {
      const items = await DevInbox.find({}).sort({ createdAt: -1 }).limit(30).lean();
      res.json({ items });
    })
  );
}

export default router;
