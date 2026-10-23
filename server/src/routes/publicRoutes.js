import { Router } from 'express';
import RoleGuide from '../models/RoleGuide.js';
import { asyncHandler, fail } from '../utils/core.js';

const router = Router();

// GET /api/role-guides — public directory of mentor-built role guides
router.get(
  '/role-guides',
  asyncHandler(async (_req, res) => {
    const items = await RoleGuide.find({}).sort({ sortOrder: 1 }).lean();
    res.json({ items });
  })
);

export default router;
