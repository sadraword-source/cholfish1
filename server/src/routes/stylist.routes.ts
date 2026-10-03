import { Router } from 'express';
import { stylistRequestSchema } from '../utils/validators.js';
import { generateStylistResponse } from '../utils/aiStylist.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// POST /api/stylist — دریافت پیشنهاد استایل بر اساس درخواست طبیعی کاربر
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = stylistRequestSchema.parse(req.body);
    const data = await generateStylistResponse(body);
    res.json({ success: true, data });
  })
);

export default router;
