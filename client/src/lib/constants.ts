export const API_BASE = '/api';
export const STATIC_BASE = '/static';

export const SITE_NAME = 'CAVERO';
export const SITE_TAGLINE = 'استایل رسمی، برای نسل جدید';
export const SITE_DESCRIPTION =
  'فروشگاه اینترنتی کت و شلوار مردانه CAVERO. کت و شلوارهای اسلیم فیت با پارچه ویسکوز و دوخت ایتالیایی.';

export const SHIPPING_COST = 50000;

export const ORDER_STATUS_LABELS: Record<string, { label: string; step: number }> = {
  registered: { label: 'ثبت سفارش', step: 1 },
  preparing: { label: 'در حال آماده‌سازی', step: 2 },
  shipped_to_post: { label: 'تحویل به پست', step: 3 },
  in_transit: { label: 'در حال ارسال', step: 4 },
  delivered: { label: 'تحویل داده شد', step: 5 },
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار ارسال رسید',
  receipt_uploaded: 'رسید ارسال شده — در انتظار تایید',
  paid: 'تایید شده',
  rejected: 'رد شده',
  failed: 'ناموفق',
};

export const ORDER_TIMELINE = [
  { key: 'registered', label: 'ثبت سفارش' },
  { key: 'preparing', label: 'در حال آماده‌سازی' },
  { key: 'shipped_to_post', label: 'تحویل به پست' },
  { key: 'in_transit', label: 'در حال ارسال' },
  { key: 'delivered', label: 'تحویل داده شد' },
];

export const PRODUCT_IMAGE_TYPES: Record<string, string> = {
  main: 'نمای جلو',
  gallery: 'نمای پشت',
};

// numerify اعداد فارسی به انگلیسی
export function toEnDigits(value: string): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  const en = '0123456789';
  return value.replace(/[۰-۹]/g, (d) => en[fa.indexOf(d)]);
}

// شماره موبایل فارسی یا انگلیسی به فرمت استاندارد
export function normalizePhone(value: string): string {
  const digits = toEnDigits(value).replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) return digits;
  if (digits.startsWith('98') && digits.length === 12) return '0' + digits.slice(2);
  if (digits.length === 10 && digits.startsWith('9')) return '0' + digits;
  return digits;
}