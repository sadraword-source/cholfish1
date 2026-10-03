import { db } from '../db/connection.js';
import { nanoid } from 'nanoid';

export interface OTPOptions {
  purpose?: 'login' | 'register';
  ttlMinutes?: number;
}

/**
 * سازوکار ارسال OTP
 * ------------------------------------------------
 * حالت‌ها (متغیر OTP_MODE در .env):
 *   - sms     : ارسال واقعی پیامک از طریق SmsProvider (آماده اتصال به سرویس واقعی)
 *   - console : (پیش‌فرض) چاپ کد در کنسول سرور برای توسعه
 *   - fixed   : کد ثابت (OTP_FIXED_CODE) برای تست
 */
export async function generateOtp(phone: string, opts: OTPOptions = {}): Promise<string> {
  const mode = process.env.OTP_MODE || 'console';
  const ttlMinutes = opts.ttlMinutes ?? Number(process.env.OTP_TTL_MINUTES ?? 5);
  const purpose = opts.purpose ?? 'login';

  let code: string;
  if (mode === 'fixed') {
    code = process.env.OTP_FIXED_CODE || '123456';
  } else {
    code = String(Math.floor(100000 + Math.random() * 900000));
  }

  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await db.prepare(`
    INSERT INTO otp_codes (phone, code, purpose, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(phone, code, purpose, expiresAt);

  if (mode === 'fixed' || mode === 'console') {
    // برای توسعه: کد را در کنسول چاپ می‌کنیم
    console.log(`[OTP] phone=${phone} code=${code} (${mode} mode)`);
  }

  return code;
}

export async function verifyOtp(phone: string, code: string, purpose: string): Promise<boolean> {
  const row = (await db
    .prepare(
      `SELECT id, expires_at FROM otp_codes
       WHERE phone = ? AND code = ? AND purpose = ? AND used = 0
       ORDER BY id DESC LIMIT 1`
    )
    .get(phone, code, purpose)) as { id: number; expires_at: string } | undefined;

  if (!row) return false;

  const expiresAt = new Date(row.expires_at).getTime();
  if (expiresAt < Date.now()) return false;

  await db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(row.id);
  return true;
}

export function generateOrderNumber(): string {
  const now = new Date();
  const ymd = [
    now.getFullYear().toString().slice(2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const uniq = nanoid(6).toUpperCase();
  return `SAD-${ymd}-${uniq}`;
}