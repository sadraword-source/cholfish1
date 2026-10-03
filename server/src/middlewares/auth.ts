import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/connection.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export interface AuthUser {
  id: number;
  phone: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

export function signToken(user: { id: number; phone: string; role: string }): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export const authRequired = asyncHandler<AuthenticatedRequest>(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'احراز هویت انجام نشده است. لطفا وارد حساب شوید.' });
    return;
  }

  const token = header.slice(7);
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch {
    res.status(401).json({ success: false, error: 'نشست شما منقضی شده است. دوباره وارد شوید.' });
    return;
  }

  const user = (await db
    .prepare('SELECT id, phone, role FROM users WHERE id = ?')
    .get(payload.id)) as { id: number; phone: string; role: string } | undefined;

  if (!user) {
    res.status(401).json({ success: false, error: 'کاربر یافت نشد.' });
    return;
  }
  req.user = user;
  next();
});

/** احراز هویت اختیاری: اگر توکن معتبر باشد کاربر را تنظیم می‌کند، در غیر این صورت ادامه می‌دهد. */
export const optionalAuth = asyncHandler<AuthenticatedRequest>(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as jwt.JwtPayload;
    const user = (await db
      .prepare('SELECT id, phone, role FROM users WHERE id = ?')
      .get(payload.id)) as AuthUser | undefined;
    if (user) req.user = user;
  } catch {
    // توکن نامعتبر — به‌عنوان مهمان ادامه می‌دهیم
  }
  next();
});

export function adminOnly(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'دسترسی غیرمجاز.' });
    return;
  }
  next();
}