import { Router } from 'express';
import { db } from '../db/connection.js';
import { stylistRequestSchema } from '../utils/validators.js';
import { generateStylistResponse } from '../utils/aiStylist.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/stylist/price-range — بازه‌ی قیمت محصولات فعال و موجود (برای نوار بودجه)
router.get(
  '/price-range',
  asyncHandler(async (_req, res) => {
    const row = (await db
      .prepare(`
        SELECT MIN(p.price) as minPrice, MAX(p.price) as maxPrice
        FROM products p
        WHERE p.is_active = 1
          AND EXISTS (
            SELECT 1 FROM product_sizes ps
            WHERE ps.product_id = p.id AND ps.stock > 0
          )
      `)
      .get()) as { minPrice: number | null; maxPrice: number | null };

    res.json({
      success: true,
      data: {
        minPrice: Number(row.minPrice ?? 0),
        maxPrice: Number(row.maxPrice ?? 0),
      },
    });
  })
);

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
