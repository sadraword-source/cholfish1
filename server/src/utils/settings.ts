import { db } from '../db/connection.js';

export const CARD_NUMBER_KEY = 'card_number';
/** شماره کارت پیش‌فرض — همه ارقام یک */
export const DEFAULT_CARD_NUMBER = '1111111111111111';

export const CARD_HOLDER_KEY = 'card_holder';
/** نام صاحب کارت پیش‌فرض */
export const DEFAULT_CARD_HOLDER = 'صدرا خادمی';

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const row = (await db
    .prepare('SELECT setting_value FROM settings WHERE setting_key = ?')
    .get(key)) as { setting_value: string } | undefined;
  return row?.setting_value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const existing = (await db
    .prepare('SELECT setting_key FROM settings WHERE setting_key = ?')
    .get(key)) as { setting_key: string } | undefined;

  if (existing) {
    await db
      .prepare('UPDATE settings SET setting_value = ? WHERE setting_key = ?')
      .run(value, key);
    return;
  }
  await db
    .prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)')
    .run(key, value);
}

/** شماره کارت مقصد واریز (قابل ویرایش از پنل مدیریت) */
export async function getCardNumber(): Promise<string> {
  return getSetting(CARD_NUMBER_KEY, DEFAULT_CARD_NUMBER);
}

export async function setCardNumber(value: string): Promise<void> {
  await setSetting(CARD_NUMBER_KEY, value);
}

/** نام صاحب کارت (قابل ویرایش از پنل مدیریت) */
export async function getCardHolder(): Promise<string> {
  return getSetting(CARD_HOLDER_KEY, DEFAULT_CARD_HOLDER);
}

export async function setCardHolder(value: string): Promise<void> {
  await setSetting(CARD_HOLDER_KEY, value);
}

/** تضمین وجود مقادیر پیش‌فرض تنظیمات. */
export async function ensureSettingsDefaults(): Promise<void> {
  const existingCard = (await db
    .prepare('SELECT setting_key FROM settings WHERE setting_key = ?')
    .get(CARD_NUMBER_KEY)) as { setting_key: string } | undefined;
  if (!existingCard) {
    await setCardNumber(DEFAULT_CARD_NUMBER);
  }

  const existingHolder = (await db
    .prepare('SELECT setting_key FROM settings WHERE setting_key = ?')
    .get(CARD_HOLDER_KEY)) as { setting_key: string } | undefined;
  if (!existingHolder) {
    await setCardHolder(DEFAULT_CARD_HOLDER);
  }
}
