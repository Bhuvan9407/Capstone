import { Router } from 'express';
import { asyncHandler } from '../utils/core.js';
import { requireAuth, requireVerifiedEmail } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { settingsSchema } from '../validators/index.js';
import User from '../models/User.js';

const router = Router();
router.use(requireAuth, requireVerifiedEmail);

// PATCH /api/users/me — profile settings
router.patch(
  '/me',
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const fields = ['name', 'headline', 'bio', 'institution'];
    fields.forEach((f) => {
      if (typeof req.body[f] === 'string') user[f] = req.body[f];
    });
    await user.save();
    res.json({ user: user.safeView() });
  })
);

export default router;
