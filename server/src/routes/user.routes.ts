import { Router } from 'express';
import { db } from '../db/connection.js';
import { authRequired, AuthenticatedRequest } from '../middlewares/auth.js';
import { updateProfileSchema, measurementsSchema, addressSchema } from '../utils/validators.js';
import { AppError } from '../middlewares/errorHandler.js';
import { suggestSize } from '../utils/sizeService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authRequired);

// ===== پروفایل =====

// PUT /api/users/profile — ویرایش اطلاعات شخصی
router.put(
  '/profile',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const body = updateProfileSchema.parse(req.body);

    await db
      .prepare("UPDATE users SET full_name = COALESCE(?, full_name), email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(body.fullName ?? null, body.email ?? null, req.user!.id);

    const row = (await db
      .prepare('SELECT id, phone, full_name, email, role FROM users WHERE id = ?')
      .get(req.user!.id)) as { id: number; phone: string; full_name: string; email: string | null; role: string };

    res.json({
      success: true,
      message: 'اطلاعات با موفقیت ذخیره شد.',
      data: { id: row.id, phone: row.phone, fullName: row.full_name, email: row.email, role: row.role },
    });
  })
);

// ===== اندازه‌ها =====

// GET /api/users/measurements — دریافت اندازه‌های بدن
router.get(
  '/measurements',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const row = await db.prepare('SELECT * FROM user_measurements WHERE user_id = ?').get(req.user!.id);

    res.json({
      success: true,
      data: row ?? null,
    });
  })
);

// POST /api/users/measurements — ذخیره اندازه‌ها + پیشنهاد سایز
router.post(
  '/measurements',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const body = measurementsSchema.parse(req.body);

    const suggestion = suggestSize({
      heightCm: body.heightCm ?? null,
      weightKg: body.weightKg ?? null,
      chestCm: body.chestCm ?? null,
      waistCm: body.waistCm ?? null,
    });

    const existing = await db.prepare('SELECT id FROM user_measurements WHERE user_id = ?').get(req.user!.id);

    if (existing) {
      await db
        .prepare(`
          UPDATE user_measurements SET
            height_cm = ?, weight_kg = ?, chest_cm = ?, waist_cm = ?, hip_cm = ?,
            shoulder_cm = ?, arm_length_cm = ?, suggested_size = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `)
        .run(
          body.heightCm ?? null,
          body.weightKg ?? null,
          body.chestCm ?? null,
          body.waistCm ?? null,
          body.hipCm ?? null,
          body.shoulderCm ?? null,
          body.armLengthCm ?? null,
          suggestion.suggestedSize,
          req.user!.id
        );
    } else {
      await db
        .prepare(`
          INSERT INTO user_measurements
            (user_id, height_cm, weight_kg, chest_cm, waist_cm, hip_cm, shoulder_cm, arm_length_cm, suggested_size)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          req.user!.id,
          body.heightCm ?? null,
          body.weightKg ?? null,
          body.chestCm ?? null,
          body.waistCm ?? null,
          body.hipCm ?? null,
          body.shoulderCm ?? null,
          body.armLengthCm ?? null,
          suggestion.suggestedSize
        );
    }

    res.json({
      success: true,
      message: `سایز پیشنهادی: ${suggestion.suggestedSize}`,
      data: { suggestedSize: suggestion.suggestedSize, message: suggestion.message, chestUsed: suggestion.chestUsed },
    });
  })
);

// ===== آدرس‌ها =====

// GET /api/users/addresses
router.get(
  '/addresses',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const rows = await db
      .prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC')
      .all(req.user!.id);
    res.json({ success: true, data: rows });
  })
);

// POST /api/users/addresses — ذخیره آدرس جدید
router.post(
  '/addresses',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const body = addressSchema.parse(req.body);

    const countRow = (await db
      .prepare('SELECT COUNT(*) as c FROM addresses WHERE user_id = ?')
      .get(req.user!.id)) as { c: number | string };

    const result = await db
      .prepare(`
        INSERT INTO addresses (user_id, full_name, phone, province, city, address_line, postal_code, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        req.user!.id,
        body.fullName,
        body.phone,
        body.province,
        body.city,
        body.addressLine,
        body.postalCode,
        Number(countRow.c) === 0 ? 1 : 0
      );

    const row = await db.prepare('SELECT * FROM addresses WHERE id = ?').get(Number(result.lastInsertRowid));

    res.status(201).json({ success: true, message: 'آدرس ذخیره شد.', data: row });
  })
);

// PUT /api/users/addresses/:id — ویرایش آدرس
router.put(
  '/addresses/:id',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const body = addressSchema.parse(req.body);
    const id = Number(req.params.id);

    const existing = await db.prepare('SELECT id FROM addresses WHERE id = ? AND user_id = ?').get(id, req.user!.id);
    if (!existing) throw new AppError('آدرس یافت نشد.', 404);

    await db
      .prepare(`
        UPDATE addresses SET full_name = ?, phone = ?, province = ?, city = ?, address_line = ?, postal_code = ?
        WHERE id = ?
      `)
      .run(body.fullName, body.phone, body.province, body.city, body.addressLine, body.postalCode, id);

    const row = await db.prepare('SELECT * FROM addresses WHERE id = ?').get(id);
    res.json({ success: true, message: 'آدرس ویرایش شد.', data: row });
  })
);

// DELETE /api/users/addresses/:id
router.delete(
  '/addresses/:id',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const id = Number(req.params.id);
    const result = await db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(id, req.user!.id);
    if (result.changes === 0) throw new AppError('آدرس یافت نشد.', 404);
    res.json({ success: true, message: 'آدرس حذف شد.' });
  })
);

// POST /api/users/translate-number (کمکی برای اعداد فارسی) — حذف شد
export default router;
