import { db } from '../db/connection.js';

// ============================================================
//  استایلیست هوشمند — موتور تحلیل درخواست و پیشنهاد محصول
//  فقط از میان محصولات واقعی و فعال فروشگاه انتخاب می‌کند.
// ============================================================

export interface StylistRequest {
  message: string;
  budget?: number | null;
  color?: string | null;
  fit?: string | null;
  occasion?: string | null;
  formality?: 'formal' | 'semi' | 'casual' | null;
}

export interface StylistSize {
  id: number;
  code: string;
  label: string;
  stock: number;
}

interface CatalogProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  old_price: number | null;
  fabric_id: number;
  fabric_name: string;
  fabric_slug: string;
  fit_id: number;
  fit_name: string;
  fit_slug: string;
  stitching_type: string;
  color: string;
  is_featured: number;
  main_image: string | null;
  stock: number;
  sizes: StylistSize[];
}

export interface StylistRecommendation {
  productId: number;
  product: {
    id: number;
    name: string;
    slug: string;
    description: string;
    price: number;
    oldPrice: number | null;
    fabric: { id: number; name: string; slug: string };
    fit: { id: number; name: string; slug: string };
    stitchingType: string;
    color: string;
    isFeatured: boolean;
    mainImage: string | null;
  };
  sizes: StylistSize[];
  reason: string;
  category: string;
}

export interface StylistResult {
  message: string;
  budget: number | null;
  filters: { colors: string[]; fit: string | null; formality: string | null };
  missingCategories: string[];
  recommendations: StylistRecommendation[];
}

// ---------------------------------------------------------------------------
//  نرمال‌سازی متن فارسی و اعداد
// ---------------------------------------------------------------------------
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function normalize(text: string): string {
  return text
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ');
}

const USD_RATE = Number(process.env.STYLIST_USD_RATE ?? 100000);

function parseBudget(normalized: string): number | null {
  const regex = /(\d[\d,.\u066c\u060c]*)\s*(میلیون|ملیون|هزار|تومان|تومن|دلار|دالر)?/g;
  let best: number | null = null;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    const unit = match[2] ?? '';
    let value = Number(match[1].replace(/[,،.\u066c\u060c]/g, ''));
    if (!Number.isFinite(value) || value <= 0) continue;
    if (unit === 'میلیون' || unit === 'ملیون') value *= 1_000_000;
    else if (unit === 'هزار') value *= 1_000;
    else if (unit === 'دلار' || unit === 'دالر') value *= USD_RATE;

    if (unit !== '') {
      best = value;
      break;
    }
    if (value >= 100000 && (best === null || value > best)) best = value;
  }
  return best;
}

const COLOR_SYNONYMS: { canonical: string; terms: string[] }[] = [
  { canonical: 'مشکی', terms: ['مشکی', 'سیاه'] },
  { canonical: 'سرمهای', terms: ['سرمه', 'ناوی', 'نیوی'] },
  { canonical: 'طوسی', terms: ['طوسی', 'خاکستری', 'گری'] },
  { canonical: 'عاجی', terms: ['عاجی', 'عاج', 'کرم', 'سفید'] },
  { canonical: 'قهوهای', terms: ['قهوه', 'اسپرسو'] },
  { canonical: 'سبز', terms: ['سبز', 'یشم'] },
  { canonical: 'بورگوندی', terms: ['بورگوندی', 'شرابی', 'زرشکی', 'قرمز'] },
];

/** مقایسه‌ی مقاوم به نیم‌فاصله و تفاوت ی/ک عربی و فارسی */
function canon(text: string): string {
  return text
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\s\u200c\u200e\u200f]/g, '')
    .toLowerCase();
}

function detectColors(normalized: string): string[] {
  const found: string[] = [];
  for (const { canonical, terms } of COLOR_SYNONYMS) {
    if (terms.some((t) => normalized.includes(t))) found.push(canonical);
  }
  return found;
}

function detectFit(normalized: string): string | null {
  if (normalized.includes('اسلیم')) return 'اسلیم‌فیت';
  if (normalized.includes('کلاسیک')) return 'کلاسیک';
  return null;
}

function detectFormality(normalized: string): 'formal' | 'semi' | 'casual' | null {
  const casual = ['نیمه رسمی', 'نیمه‌رسمی', 'روزمره', 'کژوال', 'غیررسمی', 'اسپرت', 'کジュアル'];
  if (casual.some((t) => normalized.includes(t))) return 'casual';

  const formal = ['رسمی', 'عروسی', 'مجلس', 'مهمانی', 'جشن', 'تشریفاتی', 'دامادی', 'شب'];
  if (formal.some((t) => normalized.includes(t))) return 'formal';

  const work = ['کاری', 'اداری', 'دفتر', 'جلسه', 'کار'];
  if (work.some((t) => normalized.includes(t))) return 'semi';
  return null;
}

const REQUESTED_CATEGORIES: { terms: string[]; label: string; available: boolean }[] = [
  { terms: ['پیراهن'], label: 'پیراهن', available: false },
  { terms: ['کفش'], label: 'کفش', available: false },
  { terms: ['کراوات', 'پاپیون', 'اکسسوری', 'ساعت', 'جوراب', 'دستمال'], label: 'اکسسوری', available: false },
];

function detectMissingCategories(normalized: string): string[] {
  return REQUESTED_CATEGORIES.filter((c) => c.terms.some((t) => normalized.includes(t))).map((c) => c.label);
}

// ---------------------------------------------------------------------------
//  بارگذاری کاتالوگ واقعی
// ---------------------------------------------------------------------------
async function loadCatalog(): Promise<CatalogProduct[]> {
  const rows = (await db
    .prepare(`
      SELECT p.id, p.name, p.slug, p.description, p.price, p.old_price,
             p.fabric_id, f.name as fabric_name, f.slug as fabric_slug,
             p.fit_id, ft.name as fit_name, ft.slug as fit_slug,
             p.stitching_type, p.color, p.is_featured,
             (SELECT pi.url FROM product_images pi
               WHERE pi.product_id = p.id AND pi.image_type = 'main'
               ORDER BY pi.sort_order LIMIT 1) as main_image
      FROM products p
      JOIN fabrics f ON f.id = p.fabric_id
      JOIN fits ft ON ft.id = p.fit_id
      WHERE p.is_active = 1
      ORDER BY p.id
    `)
    .all()) as unknown as Omit<CatalogProduct, 'sizes' | 'stock'>[];

  const sizeRows = (await db
    .prepare(`
      SELECT ps.product_id, s.id, s.code, s.label, ps.stock
      FROM product_sizes ps
      JOIN sizes s ON s.id = ps.size_id
      WHERE ps.stock > 0
      ORDER BY s.code
    `)
    .all()) as unknown as { product_id: number; id: number; code: string; label: string; stock: number }[];

  const byProduct = new Map<number, StylistSize[]>();
  for (const s of sizeRows) {
    const list = byProduct.get(s.product_id) ?? [];
    list.push({ id: s.id, code: s.code, label: s.label, stock: s.stock });
    byProduct.set(s.product_id, list);
  }

  return rows.map((r) => {
    const sizes = byProduct.get(r.id) ?? [];
    return { ...r, sizes, stock: sizes.reduce((sum, s) => sum + s.stock, 0) };
  });
}

function productCategory(p: CatalogProduct): string {
  if (p.name.includes('کت و شلوار') || p.name.includes('کت\u200cو\u200cشلوار')) return 'suit';
  if (p.name.includes('کت')) return 'jacket';
  return 'other';
}

// ---------------------------------------------------------------------------
//  امتیازدهی
// ---------------------------------------------------------------------------
interface StyleContext {
  colors: string[];
  fit: string | null;
  formality: 'formal' | 'semi' | 'casual' | null;
  budget: number | null;
}

interface Scored {
  product: CatalogProduct;
  score: number;
  reasons: string[];
}

function scoreProduct(p: CatalogProduct, ctx: StyleContext): Scored {
  let score = 0;
  const reasons: string[] = [];

  const color = canon(p.color);
  const fit = canon(p.fit_name);
  const fabric = canon(p.fabric_name);
  const stitching = canon(p.stitching_type);

  // موجودی
  if (p.stock <= 0) return { product: p, score: -1000, reasons };

  // رنگ
  if (ctx.colors.length > 0) {
    const matched = ctx.colors.find((c) => color.includes(canon(c)) || canon(c).includes(color));
    if (matched) {
      score += 45;
      reasons.push(`رنگ ${p.color} آن دقیقاً با سلیقه‌ی شما (${matched}) هماهنگ است`);
    } else {
      score -= 20;
    }
  } else if (['مشکی', 'سرمهای', 'طوسی'].some((c) => color.includes(canon(c)))) {
    score += 6;
  }

  // فیت
  if (ctx.fit) {
    if (fit.includes(canon(ctx.fit))) {
      score += 25;
      reasons.push(`برش ${p.fit_name} همان فیتی است که خواستهاید`);
    } else {
      score -= 10;
    }
  }

  // بودجه
  if (ctx.budget) {
    if (p.price <= ctx.budget) {
      score += 30;
      if (p.price / ctx.budget >= 0.55) {
        score += 10;
        reasons.push('در محدوده بودجهی شما و از نظر کیفیت ارزش خرید دارد');
      } else {
        reasons.push('با صرفهجویی نسبت به بودجهی شما انتخاب شده است');
      }
    } else if (p.price <= ctx.budget * 1.15) {
      reasons.push('کمی بالاتر از بودجه اما نزدیکترین گزینهی موجود است');
    } else {
      score -= 80;
    }
  }

  // مناسبت / میزان رسمی بودن
  if (ctx.formality === 'formal') {
    if (stitching.includes('ایتالیایی') || stitching.includes('انگلیسی')) score += 15;
    if (fabric.includes('پشم') || fabric.includes('ویسکوز')) score += 6;
    if (['مشکی', 'سرمهای', 'عاجی', 'بورگوندی', 'یشمی', 'اسپرسو'].some((c) => color.includes(canon(c)))) {
      score += 8;
    }
    reasons.push('برای مجالس و مناسبت‌های رسمی، انتخابی مطمئن و شیک است');
  } else if (ctx.formality === 'casual') {
    if (fit.includes('کلاسیک')) score += 12;
    if (['خاکستری', 'طوسی', 'سرمهای'].some((c) => color.includes(canon(c)))) score += 8;
    reasons.push('برای استایل نیمه‌رسمی و روزمره راحت و شیک است');
  } else if (ctx.formality === 'semi') {
    if (fabric.includes('ویسکوزپلیاستر')) score += 10;
    if (['سرمهای', 'مشکی', 'طوسی'].some((c) => color.includes(canon(c)))) score += 8;
    reasons.push('برای محیط کار و جلسات روزانه مناسب است');
  }

  if (p.is_featured) score += 6;

  return { product: p, score, reasons };
}

function buildReason(s: Scored): string {
  const unique = Array.from(new Set(s.reasons)).slice(0, 2);
  if (unique.length === 0) {
    return 'از خوشدوختترین و پرفروشترین مدلهای موجود در فروشگاه است و با استایل شما هماهنگ میشود.';
  }
  return unique.join(' و ') + '.';
}

function toRecommendation(s: Scored): StylistRecommendation {
  const p = s.product;
  return {
    productId: p.id,
    category: productCategory(p),
    reason: buildReason(s),
    sizes: p.sizes,
    product: {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      oldPrice: p.old_price,
      fabric: { id: p.fabric_id, name: p.fabric_name, slug: p.fabric_slug },
      fit: { id: p.fit_id, name: p.fit_name, slug: p.fit_slug },
      stitchingType: p.stitching_type,
      color: p.color,
      isFeatured: Boolean(p.is_featured),
      mainImage: p.main_image,
    },
  };
}

// ---------------------------------------------------------------------------
//  لایهی اختیاری LLM (در صورت تنظیم متغیرهای محیطی)
// ---------------------------------------------------------------------------
async function llmSelect(
  candidates: CatalogProduct[],
  ctx: StyleContext,
  userMessage: string
): Promise<{ message: string; picks: { productId: number; reason: string }[] } | null> {
  const url = process.env.STYLIST_LLM_URL;
  const key = process.env.STYLIST_LLM_KEY;
  if (!url || !key) return null;

  const model = process.env.STYLIST_LLM_MODEL || 'gpt-4o-mini';
  try {
    const catalog = candidates.map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price,
      color: c.color,
      fit: c.fit_name,
      fabric: c.fabric_name,
      stitching: c.stitching_type,
      stock: c.stock,
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'تو یک استایلیست حرفهای کتوشلوار مردانه هستی. فقط از میان محصولات دادهشده انتخاب کن و هیچ محصولی از خودت نساز. خروجی را به شکل JSON با کلیدهای message (متن فارسی) و recommendations (آرایه از {productId, reason}) برگردان. productId باید فقط از بین شناسههای موجود باشد.',
          },
          {
            role: 'user',
            content: `درخواست کاربر: ${userMessage}\nبودجه: ${ctx.budget ?? 'نامشخص'} تومان\nمحصولات موجود: ${JSON.stringify(catalog)}`,
          },
        ],
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as {
      message?: string;
      recommendations?: { productId?: number; reason?: string }[];
    };
    if (!Array.isArray(parsed.recommendations)) return null;

    const validIds = new Set(candidates.map((c) => c.id));
    const picks = parsed.recommendations
      .filter((r) => typeof r.productId === 'number' && validIds.has(r.productId))
      .map((r) => ({
        productId: r.productId as number,
        reason: typeof r.reason === 'string' && r.reason.trim() ? r.reason.trim() : '',
      }));

    if (picks.length === 0) return null;
    return { message: typeof parsed.message === 'string' ? parsed.message : '', picks };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
//  تولید پاسخ نهایی
// ---------------------------------------------------------------------------
function buildMessage(
  ctx: StyleContext,
  count: number,
  missing: string[],
  noBudgetMatch: boolean
): string {
  const parts: string[] = [];

  const occasionLabel =
    ctx.formality === 'formal'
      ? 'یک مناسبت رسمی'
      : ctx.formality === 'semi'
        ? 'محیط کار و جلسات'
        : ctx.formality === 'casual'
          ? 'استایل نیمهرسمی و روزمره'
          : 'سلیقهی شما';

  let intro = `بر اساس درخواست شما برای ${occasionLabel}`;
  if (ctx.colors.length > 0) intro += ` با رنگ ${ctx.colors.join(' و ')}`;
  if (ctx.fit) intro += ` و برش ${ctx.fit}`;
  if (count > 0) {
    intro += `، ${count} گزینه از کالکشن موجود فروشگاه را انتخاب کردم.`;
  } else {
    intro += '، گزینه‌ای متناسب پیدا نکردم.';
  }

  if (ctx.budget) {
    intro += ` محدوده‌ی بودجه‌ی شما ${ctx.budget.toLocaleString('fa-IR')} تومان در نظر گرفته شد.`;
    if (noBudgetMatch) {
      intro += ' در این بازه‌ی قیمتی محصولی موجود نیست؛ بودجه را افزایش دهید یا فیلترها را تغییر دهید.';
    }
  }

  parts.push(intro);

  if (missing.length > 0) {
    parts.push(
      `توجه: در حال حاضر ${missing.join('، ')} در فروشگاه موجود نیست؛ بنابراین پیشنهادها فقط شامل کتوشلوارهای موجود است.`
    );
  }

  return parts.join(' ');
}

export async function generateStylistResponse(input: StylistRequest): Promise<StylistResult> {
  const normalized = normalize(input.message);
  const catalog = (await loadCatalog()).filter((p) => p.stock > 0);

  const budgetFromMessage = parseBudget(normalized);
  const budget = input.budget ?? budgetFromMessage ?? null;

  const colors = input.color ? [input.color] : detectColors(normalized);
  const fit = input.fit || detectFit(normalized);
  const formality = input.formality ?? detectFormality(normalized);
  const missingCategories = detectMissingCategories(normalized);

  const ctx: StyleContext = { colors, fit, formality, budget };

  if (catalog.length === 0) {
    return {
      message: 'در حال حاضر محصول فعال و موجودی در فروشگاه ثبت نشده است. لطفاً بعداً دوباره تلاش کنید.',
      budget,
      filters: { colors, fit, formality },
      missingCategories,
      recommendations: [],
    };
  }

  // وقتی بودجه تعیین شده، فقط محصولات داخل بودجه در نظر گرفته می‌شوند
  const budgetPool = budget ? catalog.filter((p) => p.price <= budget) : catalog;
  const noBudgetMatch = Boolean(budget) && budgetPool.length === 0;

  let picks: { product: CatalogProduct; reason: string }[] = [];

  // تلاش برای استفاده از LLM (در صورت پیکربندی) — فقط از میان گزینه‌های داخل بودجه
  const llm = await llmSelect(budgetPool, ctx, input.message);
  if (llm && llm.picks.length > 0) {
    picks = llm.picks
      .map((pick) => {
        const product = budgetPool.find((c) => c.id === pick.productId);
        return product ? { product, reason: pick.reason } : null;
      })
      .filter((x): x is { product: CatalogProduct; reason: string } => x !== null);
  }

  const ranked = budgetPool
    .map((p) => scoreProduct(p, ctx))
    .sort((a, b) => b.score - a.score);

  if (picks.length === 0) {
    picks = ranked.slice(0, 4).map((s) => ({ product: s.product, reason: buildReason(s) }));
  }

  const recommendations: StylistRecommendation[] = picks.slice(0, 4).map((pick) => {
    const scored = ranked.find((s) => s.product.id === pick.product.id);
    const base: StylistRecommendation = scored
      ? toRecommendation(scored)
      : {
          productId: pick.product.id,
          category: productCategory(pick.product),
          reason: '',
          sizes: pick.product.sizes,
          product: {
            id: pick.product.id,
            name: pick.product.name,
            slug: pick.product.slug,
            description: pick.product.description,
            price: pick.product.price,
            oldPrice: pick.product.old_price,
            fabric: { id: pick.product.fabric_id, name: pick.product.fabric_name, slug: pick.product.fabric_slug },
            fit: { id: pick.product.fit_id, name: pick.product.fit_name, slug: pick.product.fit_slug },
            stitchingType: pick.product.stitching_type,
            color: pick.product.color,
            isFeatured: Boolean(pick.product.is_featured),
            mainImage: pick.product.main_image,
          },
        };
    return { ...base, reason: pick.reason || base.reason };
  });

  const message = llm?.message?.trim()
    ? llm.message.trim()
    : buildMessage(ctx, recommendations.length, missingCategories, noBudgetMatch);

  return {
    message,
    budget,
    filters: { colors, fit, formality },
    missingCategories,
    recommendations,
  };
}
