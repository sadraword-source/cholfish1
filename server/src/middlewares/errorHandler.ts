import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function notFound(req: Request, res: Response): void {
  logger.warn('مسیر یافت نشد', { method: req.method, url: req.originalUrl });
  res.status(404).json({ success: false, error: 'مسیر یافت نشد.' });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const context = { method: req.method, url: req.originalUrl, ip: req.ip };

  if (err instanceof ZodError) {
    const messages = err.issues.map((i: { message: string }) => i.message);
    logger.warn('درخواست نامعتبر (اعتبارسنجی)', { ...context, issues: messages });
    res.status(400).json({ success: false, error: messages[0] || 'ورودی نامعتبر است.' });
    return;
  }

  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error(err.message, { ...context, status: err.status, stack: err.stack });
    } else {
      logger.warn(err.message, { ...context, status: err.status });
    }
    res.status(err.status).json({ success: false, error: err.message });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'حجم فایل بیش از حد مجاز است (حداکثر ۵ مگابایت).'
        : 'خطا در بارگذاری فایل.';
    logger.warn(`خطای بارگذاری فایل (${err.code})`, { ...context, message });
    res.status(400).json({ success: false, error: message });
    return;
  }

  const error = err instanceof Error ? err : new Error(String(err));
  logger.error('خطای داخلی سرور', { ...context, name: error.name, message: error.message, stack: error.stack });
  res.status(500).json({ success: false, error: 'خطای داخلی سرور رخ داد.' });
}