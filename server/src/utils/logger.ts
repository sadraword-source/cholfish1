import fs from 'node:fs';
import path from 'node:path';

// ============================================================
//  لاگر ساده — نوشتن در کنسول و فایل‌های روزانه
//  - logs/app-YYYY-MM-DD.log   : درخواست‌ها و رویدادهای عادی
//  - logs/error-YYYY-MM-DD.log : خطاها
// ============================================================

type Level = 'info' | 'warn' | 'error';

const logsDir = path.resolve(process.cwd(), 'logs');
try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch {
  // در صورت عدم دسترسی، لاگ فقط در کنسول نمایش داده می‌شود
}

function timestamp(): string {
  return new Date().toISOString();
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function safeStringify(value: unknown): string {
  if (value instanceof Error) {
    return JSON.stringify({ name: value.name, message: value.message, stack: value.stack });
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function writeToFile(file: string, line: string): void {
  fs.appendFile(path.join(logsDir, file), `${line}\n`, (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error(`[logger] خطا در نوشتن فایل لاگ ${file}:`, err.message);
    }
  });
}

function log(level: Level, message: string, meta?: unknown): void {
  const line = `[${timestamp()}] [${level.toUpperCase()}] ${message}${
    meta !== undefined ? ` ${safeStringify(meta)}` : ''
  }`;

  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(line);
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }

  const file = level === 'error' ? `error-${dateStamp()}.log` : `app-${dateStamp()}.log`;
  writeToFile(file, line);
}

export const logger = {
  info: (message: string, meta?: unknown): void => log('info', message, meta),
  warn: (message: string, meta?: unknown): void => log('warn', message, meta),
  error: (message: string, meta?: unknown): void => log('error', message, meta),
};

export const LOGS_DIR = logsDir;
