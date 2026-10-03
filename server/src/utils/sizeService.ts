// ============================================================
//  الگوریتم پیشنهاد سایز
//  نسخه اول: ساده و قابل توسعه
//  منطق: بر اساس دور سینه، دور کمر و قد/وزن
// ============================================================

export interface BodyMeasurements {
  heightCm?: number | null;
  weightKg?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
}

export interface SizeRule {
  code: string;
  label: string;
  minChest: number;
  maxChest: number;
  minWaist: number;
  maxWaist: number;
}

// سایزهای استاندارد کت‌وشلوار مردانه (ایران/اروپا)
export const SIZE_RULES: SizeRule[] = [
  { code: '44', label: '44', minChest: 85, maxChest: 89, minWaist: 72, maxWaist: 78 },
  { code: '46', label: '46', minChest: 89, maxChest: 93, minWaist: 76, maxWaist: 82 },
  { code: '48', label: '48', minChest: 93, maxChest: 97, minWaist: 80, maxWaist: 86 },
  { code: '50', label: '50', minChest: 97, maxChest: 101, minWaist: 84, maxWaist: 90 },
  { code: '52', label: '52', minChest: 101, maxChest: 105, minWaist: 88, maxWaist: 94 },
  { code: '54', label: '54', minChest: 105, maxChest: 109, minWaist: 92, maxWaist: 98 },
  { code: '56', label: '56', minChest: 109, maxChest: 113, minWaist: 96, maxWaist: 102 },
  { code: '58', label: '58', minChest: 113, maxChest: 118, minWaist: 100, maxWaist: 108 },
];

const MAX_SIZE = SIZE_RULES[SIZE_RULES.length - 1];
const MIN_SIZE = SIZE_RULES[0];

function findSize(chest: number): SizeRule {
  let match = MIN_SIZE;
  for (const s of SIZE_RULES) {
    if (chest >= s.minChest && chest <= s.maxChest) {
      return s;
    }
    if (chest > s.maxChest) {
      match = s;
    }
  }
  return match;
}

// تخمین دور سینه از روی قد و وزن (فقط به‌عنوان fallback)
function estimateChest(heightCm: number, weightKg: number): number {
  return Math.round(heightCm * 0.35 + weightKg * 0.45);
}

const CHEST_MISSING_MESSAGE =
  'برای دقت بیشتر، دور سینه خود را اندازه بگیرید. نتیجه فعلی بر اساس قد و وزن تقریبی است.';

export interface SizeSuggestionResult {
  suggestedSize: string;
  chestUsed: boolean;
  message: string;
}

/**
 * الگوریتم نسخه اول:
 *  1) اگر دور سینه موجود باشد → بر اساس جدول سایزها محاسبه می‌شود.
 *  2) اگر دور سینه نبود اما دور کمر باشد → بر اساس کمر محاسبه می‌شود.
 *  3) در غیر این صورت قد و وزن → تخمین.
 *  در نسخه‌های بعدی این فایل را می‌توان بدون تغییرات بیرونی توسعه داد.
 */
export function suggestSize(m: BodyMeasurements): SizeSuggestionResult {
  if (m.chestCm && m.chestCm > 0) {
    const s = findSize(m.chestCm);
    return { suggestedSize: s.code, chestUsed: true, message: 'محاسبه بر اساس دور سینه انجام شد.' };
  }

  if (m.waistCm && m.waistCm > 0) {
    const wantedChest = m.waistCm + 12; // تقریب متعارف: دور سینه ≈ دور کمر + ۱۲
    const s = findSize(wantedChest);
    return { suggestedSize: s.code, chestUsed: false, message: 'محاسبه بر اساس دور کمر انجام شد.' };
  }

  if (m.heightCm && m.heightCm > 0 && m.weightKg && m.weightKg > 0) {
    const chest = estimateChest(m.heightCm, m.weightKg);
    const s = findSize(chest);
    return { suggestedSize: s.code, chestUsed: false, message: CHEST_MISSING_MESSAGE };
  }

  return { suggestedSize: MAX_SIZE.code, chestUsed: false, message: 'اطلاعات کافی برای پیشنهاد دقیق وارد نشده است.' };
}

export function getSizeTable() {
  return SIZE_RULES.map(({ code, label, minChest, maxChest, minWaist, maxWaist }) => ({
    code,
    label,
    minChest,
    maxChest,
    minWaist,
    maxWaist,
  }));
}