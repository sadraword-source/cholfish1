import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/connection.js';
import { authRequired, signToken, AuthenticatedRequest } from '../middlewares/auth.js';
import { generateOtp, verifyOtp } from '../utils/otp.js';
import { requestOtpSchema, verifyOtpSchema, loginSchema } from '../utils/validators.js';
import { AppError } from '../middlewares/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

type AuthMode = 'otp' | 'phone';

/**
 * حالت احراز هویت (متغیر AUTH_MODE در .env):
 *   - otp   : (پیش‌فرض) ورود با شماره موبایل + کد تأیید
 *   - phone : ورود فقط با شماره موبایل، بدون کد تأیید (برای توسعه/تست)
 */
function authMode(): AuthMode {
  return process.env.AUTH_MODE === 'phone' ? 'phone' : 'otp';
}

interface UserRow {
  id: number;
  phone: string;
  full_name: string;
  role: string;
}

async function findOrCreateUser(phone: string, fullName?: string): Promise<UserRow> {
  let user = (await db
    .prepare('SELECT id, phone, full_name, role FROM users WHERE phone = ?')
    .get(phone)) as UserRow | undefined;

  if (!user) {
    const hash = bcrypt.hashSync(Math.random().toString(36).slice(2), 10);
    const name = fullName?.trim() || `کاربر ${phone.slice(-4)}`;
    const result = await db
      .prepare('INSERT INTO users (phone, full_name, password_hash) VALUES (?, ?, ?)')
      .run(phone, name, hash);
    const id = Number(result.lastInsertRowid);
    await db.prepare('INSERT INTO carts (user_id) VALUES (?)').run(id);
    user = { id, phone, full_name: name, role: 'user' };
  }

  return user;
}

function authPayload(user: UserRow) {
  const token = signToken({ id: user.id, phone: user.phone, role: user.role });
  return {
    token,
    user: { id: user.id, phone: user.phone, fullName: user.full_name, role: user.role },
  };
}

// GET /api/auth/mode — حالت احراز هویت برای کلاینت
router.get('/mode', (_req, res) => {
  res.json({ success: true, data: { mode: authMode() } });
});

// POST /api/auth/login — ورود مستقیم با شماره موبایل (فقط وقتی AUTH_MODE=phone)
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    if (authMode() !== 'phone') {
      throw new AppError('ورود بدون کد غیرفعال است. از کد تأیید استفاده کنید.', 400);
    }

    const { phone, fullName } = loginSchema.parse(req.body);
    const user = await findOrCreateUser(phone, fullName);
    res.json({ success: true, data: authPayload(user) });
  })
);

// POST /api/auth/request-otp  — ارسال کد تأیید
router.post(
  '/request-otp',
  asyncHandler(async (req, res) => {
    const { phone, purpose = 'login' } = requestOtpSchema.parse(req.body);

    const existing = await db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);

    if (purpose === 'login' && !existing) {
      // اگر کاربر وجود نداشته باشد هم کد می‌فرستیم و در verify ثبت نام انجام می‌شود
      await generateOtp(phone, { purpose: 'login' });
      res.json({ success: true, message: 'کد تأیید ارسال شد. (در حالت توسعه در کنسول سرور نمایش داده می‌شود)' });
      return;
    }

    if (purpose === 'register' && existing) {
      throw new AppError('این شماره قبلاً ثبت نام کرده است. از ورود استفاده کنید.', 409);
    }

    await generateOtp(phone, { purpose });
    res.json({ success: true, message: 'کد تأیید ارسال شد. (در حالت توسعه در کنسول سرور نمایش داده می‌شود)' });
  })
);

// POST /api/auth/verify-otp — تایید کد و دریافت توکن
router.post(
  '/verify-otp',
  asyncHandler(async (req, res) => {
    const { phone, code, fullName } = verifyOtpSchema.parse(req.body);

    const ok = await verifyOtp(phone, code, 'login');
    if (!ok) {
      throw new AppError('کد تأیید نامعتبر یا منقضی شده است.', 400);
    }

    const user = await findOrCreateUser(phone, fullName);
    res.json({ success: true, data: authPayload(user) });
  })
);

// GET /api/auth/me — اطلاعات کاربر فعلی
router.get(
  '/me',
  authRequired,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const row = (await db
      .prepare('SELECT id, phone, full_name, email, role, created_at FROM users WHERE id = ?')
      .get(req.user!.id)) as
      | { id: number; phone: string; full_name: string; email: string | null; role: string; created_at: string }
      | undefined;

    if (!row) throw new AppError('کاربر یافت نشد.', 404);

    const measurements = (await db
      .prepare('SELECT * FROM user_measurements WHERE user_id = ?')
      .get(row.id)) as Record<string, unknown> | undefined;

    res.json({
      success: true,
      data: {
        id: row.id,
        phone: row.phone,
        fullName: row.full_name,
        email: row.email,
        role: row.role,
        createdAt: row.created_at,
        suggestedSize: measurements?.suggested_size ?? null,
      },
    });
  })
);

// POST /api/auth/logout — کلاینت توکن را حذف می‌کند
router.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'خروج انجام شد.' });
});

export default router;
