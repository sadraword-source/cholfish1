import { db } from '../db/connection.js';

// ============================================================
//  خلاصه‌ی هوشمند نظرات کاربران درباره‌ی یک محصول
//  به‌صورت پیش‌فرض محلی و بدون نیاز به سرویس خارجی کار می‌کند.
// ============================================================

export interface ReviewInput {
  rating: number;
  comment: string;
}

export interface ReviewStats {
  count: number;
  avg: number;
  distribution: Record<string, number>;
}

export async function computeReviewStats(productId: number): Promise<ReviewStats> {
  const rows = (await db
    .prepare('SELECT rating, COUNT(*) as c FROM reviews WHERE product_id = ? GROUP BY rating')
    .all(productId)) as { rating: number; c: number | string }[];

  const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  let count = 0;
  let sum = 0;

  for (const row of rows) {
    const c = Number(row.c);
    distribution[String(row.rating)] = c;
    count += c;
    sum += row.rating * c;
  }

  return { count, avg: count > 0 ? sum / count : 0, distribution };
}

const ASPECTS: { label: string; terms: string[] }[] = [
  { label: 'کیفیت پارچه و جنس', terms: ['پارچه', 'جنس', 'ویسکوز', 'پشم', 'بافت'] },
  { label: 'راحتی و تن‌خور', terms: ['راحت', 'سایز', 'اندازه', 'فیت', 'تن‌خور', 'تنخور'] },
  { label: 'خوش‌دوختی', terms: ['دوخت', 'تیکه', 'خیاط'] },
  { label: 'ظاهر و رنگ', terms: ['شیک', 'قشنگ', 'زیبا', 'رنگ', 'مدرن', 'باکلاس', 'خاص', 'لوکس'] },
  { label: 'ارزش خرید', terms: ['ارزش', 'قیمت', 'به‌صرفه', 'اقتصادی', 'ارزان'] },
];

const NEGATIVE_TERMS = ['بد', 'ضعیف', 'ناراضی', 'مشکل', 'تنگ', 'کوچک', 'گشاد', 'چروک', 'نازک', 'کیفیت پایین', 'افت', 'گران'];

function fa(n: number): string {
  return n.toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function buildLocalSummary(reviews: ReviewInput[], avg: number, count: number): string {
  if (count === 0) return '';

  const allText = reviews.map((r) => r.comment).join(' ');
  const negative = NEGATIVE_TERMS.filter((w) => allText.includes(w));

  const aspects = ASPECTS.map((a) => ({
    label: a.label,
    hits: a.terms.reduce((sum, term) => sum + (allText.includes(term) ? 1 : 0), 0),
  }))
    .filter((a) => a.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 2)
    .map((a) => a.label);

  const parts: string[] = [];

  if (count < 3) {
    parts.push(`تعداد نظرات ثبت‌شده هنوز محدود است (${count.toLocaleString('fa-IR')} نظر).`);
  }

  let quality: string;
  if (avg >= 4.5) quality = 'کاربران این محصول را «بسیار عالی» ارزیابی کرده‌اند.';
  else if (avg >= 3.5) quality = 'بیشتر کاربران از این محصول رضایت داشته‌اند.';
  else if (avg >= 2.5) quality = 'نظرات کاربران درباره‌ی این محصول متفاوت است.';
  else quality = 'بخش قابل‌توجهی از کاربران از این محصول ناراضی بوده‌اند.';
  parts.push(quality);

  parts.push(`میانگین امتیاز ${fa(avg)} از ۵ بر اساس ${count.toLocaleString('fa-IR')} نظر کاربران است.`);

  if (aspects.length > 0) {
    parts.push(`بیشترین اشاره‌ی کاربران به ${aspects.join(' و ')} بوده است.`);
  }

  if (negative.length > 0) {
    parts.push(`برخی نظرات نیز به مواردی مانند ${negative.slice(0, 2).join(' و ')} اشاره داشته‌اند.`);
  }

  return parts.join(' ');
}

async function llmSummary(reviews: ReviewInput[]): Promise<string | null> {
  const url = process.env.STYLIST_LLM_URL;
  const key = process.env.STYLIST_LLM_KEY;
  if (!url || !key) return null;

  const model = process.env.STYLIST_LLM_MODEL || 'gpt-4o-mini';
  try {
    const content = reviews
      .slice(0, 30)
      .map((r) => `امتیاز ${r.rating} از ۵: ${r.comment}`)
      .join('\n');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'بر اساس نظرات کاربران، یک خلاصه‌ی کوتاه و بی‌طرفانه (حداکثر ۳ جمله) به زبان فارسی درباره‌ی کیفیت این کت‌وشلوار بنویس. تنها بر پایه‌ی نظرات داده‌شده نتیجه‌گیری کن و چیزی از خودت اضافه نکن. خروجی فقط متن خلاصه باشد.',
          },
          { role: 'user', content },
        ],
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}

function nowString(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export async function getProductReviewSummary(
  productId: number,
  reviews: ReviewInput[],
  stats: ReviewStats
): Promise<string> {
  if (stats.count === 0) return '';

  const cached = (await db
    .prepare('SELECT summary, review_count FROM review_summaries WHERE product_id = ?')
    .get(productId)) as { summary: string; review_count: number } | undefined;

  if (cached && cached.summary && Number(cached.review_count) === stats.count) {
    return cached.summary;
  }

  const summary = (await llmSummary(reviews)) ?? buildLocalSummary(reviews, stats.avg, stats.count);
  if (!summary) return '';

  const now = nowString();
  if (cached) {
    await db
      .prepare('UPDATE review_summaries SET summary = ?, review_count = ?, avg_rating = ?, updated_at = ? WHERE product_id = ?')
      .run(summary, stats.count, stats.avg, now, productId);
  } else {
    await db
      .prepare('INSERT INTO review_summaries (product_id, summary, review_count, avg_rating, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(productId, summary, stats.count, stats.avg, now);
  }

  return summary;
}

/** پس از ثبت/ویرایش نظر، کش خلاصه را باطل می‌کند. */
export async function invalidateReviewSummary(productId: number): Promise<void> {
  await db.prepare('DELETE FROM review_summaries WHERE product_id = ?').run(productId);
}
