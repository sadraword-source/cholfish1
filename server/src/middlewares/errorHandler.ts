import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: 'مسیر یافت نشد.' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // eslint-disable-next-line no-console
  console.error('[error]', err);

  if (err instanceof ZodError) {
    const messages = err.issues.map((i: { message: string }) => i.message);
    res.status(400).json({ success: false, error: messages[0] || 'ورودی نامعتبر است.' });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ success: false, error: err.message });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'حجم فایل بیش از حد مجاز است (حداکثر ۵ مگابایت).'
        : 'خطا در بارگذاری فایل.';
    res.status(400).json({ success: false, error: message });
    return;
  }

  res.status(500).json({ success: false, error: 'خطای داخلی سرور رخ داد.' });
}