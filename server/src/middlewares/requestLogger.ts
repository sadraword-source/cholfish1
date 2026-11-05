import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import type { AuthenticatedRequest } from './auth.js';

// ============================================================
//  لاگ هر درخواست HTTP پس از پایان پاسخ
//  (متد، مسیر، کد وضعیت، مدت اجرا، IP و کاربر)
// ============================================================
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    logger[level](`${req.method} ${req.originalUrl} ${status} ${durationMs}ms`, {
      ip: req.ip,
      userId: (req as AuthenticatedRequest).user?.id,
    });
  });

  next();
}
