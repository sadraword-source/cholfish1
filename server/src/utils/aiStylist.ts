import { db } from '../db/connection.js';

// ============================================================
//  استایلیست هوشمند — موتور تحلیل درخواست و پیشنهاد محصول
//  فقط از میان محصولات واقعی و فعال فروشگاه انتخاب می‌کند.
//
//  اصل حاکم: «کیفیت تطابق» بر «تعداد نتایج» اولویت دارد.
//  ویژگی‌های صریح کاربر (نوع، رنگ، جنس، فیت و بودجه) فیلتر سخت هستند
//  و هیچ محصول نامرتبطی برای پر کردن تعداد مشخصی از نتایج اضافه نمی‌شود.
//  پیام‌های نامرتبط پیش از هر کوئری دیتابیس رد می‌شوند و پاسخ حداکثر
//  شامل ۴ محصول یکتا با بالاترین تطابق است.
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

// حداکثر تعداد محصول در هر پاسخ. این عدد سقف است، نه هدف؛
// اگر تعداد محصولات منطبق کمتر باشد همان تعداد کمتر برگردانده می‌شود.
const MAX_RECOMMENDATIONS = 4;

// آستانه پذیرش امتیاز ارتباط. محصولی که ویژگی‌های ضروری را داشته باشد
// همیشه از این آستانه عبور می‌کند؛ آستانه برای حذف گزینه‌های حاشیه‌ای است.
const MIN_RELEVANCE_SCORE = 55;

const OFF_TOPIC_MESSAGE =
  'من استایلیست CAVERO هستم و فقط در زمینه‌ی پوشاک مردانه، انتخاب استایل، رنگ، سایز و خرید کت‌وشلوار می‌توانم کمکتان کنم. اگر درباره‌ی استایل، رنگ، سایز یا بودجه‌ی مدنظرتان بنویسید، خوشحال می‌شوم راهنمایی‌تان کنم.';

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
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
      // در بازه‌هایی مثل «۵ تا ۶ میلیون»، سقف بودجه (بیشترین مقدار) ملاک است.
      best = best === null ? value : Math.max(best, value);
      continue;
    }
    if (value >= 100000 && (best === null || value > best)) best = value;
  }
  return best;
}

/** مقایسه‌ی مقاوم به نیم‌فاصله و تفاوت ی/ک عربی و فارسی */
function canon(text: string): string {
  return text
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\s\u200c\u200e\u200f\-_]/g, '')
    .toLowerCase();
}

const TERM_BOUNDARY = /[\s،,.!?؛:()\[\]{}\-_/\\؟«»"'…]/;

/** تطابق یک واژه یا عبارت مستقل، برای جلوگیری از مثبت کاذب در واژه‌های مرکب. */
function containsTerm(text: string, term: string): boolean {
  let from = 0;
  while (from <= text.length - term.length) {
    const index = text.indexOf(term, from);
    if (index === -1) return false;
    const before = index === 0 || TERM_BOUNDARY.test(text[index - 1]);
    const afterIndex = index + term.length;
    const after = afterIndex === text.length || TERM_BOUNDARY.test(text[afterIndex]);
    if (before && after) return true;
    from = index + 1;
  }
  return false;
}

// ---------------------------------------------------------------------------
//  تشخیص ویژگی‌های صریح درخواست
// ---------------------------------------------------------------------------

/** خانواده‌های رنگی. هر خانواده فقط با مترادف‌های واقعی خودش تطابق دارد. */
const COLOR_FAMILIES: { canonical: string; terms: string[] }[] = [
  { canonical: 'مشکی', terms: ['مشکی', 'سیاه', 'black'] },
  { canonical: 'سرمه‌ای', terms: ['سرمه‌ای', 'سرمه', 'ناوی', 'نیوی', 'navy'] },
  { canonical: 'طوسی', terms: ['طوسی', 'خاکستری', 'ذغالی', 'گری', 'gray', 'grey', 'charcoal'] },
  { canonical: 'عاجی', terms: ['عاجی', 'عاج', 'کرم', 'ivory'] },
  { canonical: 'سفید', terms: ['سفید', 'white'] },
  { canonical: 'قهوه‌ای', terms: ['قهوه‌ای', 'قهوه', 'اسپرسو', 'brown', 'espresso'] },
  { canonical: 'سبز', terms: ['سبز', 'یشمی', 'یشم', 'green', 'emerald'] },
  { canonical: 'بورگوندی', terms: ['بورگوندی', 'شرابی', 'زرشکی', 'burgundy'] },
  { canonical: 'قرمز', terms: ['قرمز', 'سرخ', 'red'] },
];

function detectColors(normalized: string): string[] {
  const found: string[] = [];
  for (const { canonical, terms } of COLOR_FAMILIES) {
    if (terms.some((t) => normalized.includes(t))) found.push(canonical);
  }
  return found;
}

function productColorFamily(productColor: string): string {
  const value = canon(productColor);
  for (const { canonical, terms } of COLOR_FAMILIES) {
    if (terms.some((t) => value.includes(canon(t)))) return canonical;
  }
  return value;
}

function colorMatches(productColor: string, requestedColors: string[]): boolean {
  const family = productColorFamily(productColor);
  const raw = canon(productColor);
  return requestedColors.some((requested) => {
    const wanted = canon(requested);
    return wanted === canon(family) || raw.includes(wanted) || wanted.includes(raw);
  });
}

const FABRIC_FAMILIES: { canonical: string; terms: string[] }[] = [
  {
    canonical: 'ویسکوزپلی‌استر',
    terms: [
      'ویسکوزپلی‌استر',
      'ویسکوزپلی‌استر',
      'ویسکوزپلی استر',
      'ویسکوز پلی‌استر',
      'ویسکوز پلی استر',
      'ویسکوز-پلی‌استر',
      'ویسکوز-پلی استر',
      'ویسکوز و پلی‌استر',
      'ویسکوز و پلی استر',
      'پلی‌استر و ویسکوز',
      'پلی استر و ویسکوز',
    ],
  },
  {
    canonical: 'پشم‌ویسکوز',
    terms: ['پشم‌ویسکوز', 'پشمویسکوز', 'پشم ویسکوز', 'پشم-ویسکوز', 'پشم و ویسکوز'],
  },
  { canonical: 'ویسکوز', terms: ['ویسکوز'] },
  { canonical: 'پشم', terms: ['پشم'] },
  { canonical: 'پلی‌استر', terms: ['پلی‌استر', 'پلی استر'] },
];

/**
 * جنس‌های صریح را تشخیص می‌دهد و عبارت‌های ترکیبی را قبل از تک‌واژه‌ها
 * حذف می‌کند تا «ویسکوز-پلی‌استر» به‌اشتباه «ویسکوز» خالص تفسیر نشود.
 */
function detectFabrics(normalized: string): string[] {
  const found: string[] = [];
  let rest = normalized;
  for (const { canonical, terms } of FABRIC_FAMILIES) {
    if (terms.some((t) => containsTerm(rest, t))) {
      found.push(canonical);
      for (const t of terms) rest = rest.split(t).join(' ');
    }
  }
  return found;
}

function productFabricFamily(name: string): string {
  const value = canon(name);
  if (value.includes('ویسکوز') && value.includes('پلیاستر')) return 'ویسکوزپلیاستر';
  if (value.includes('پشم') && value.includes('ویسکوز')) return 'پشمویسکوز';
  if (value.includes('ویسکوز')) return 'ویسکوز';
  if (value.includes('پشم')) return 'پشم';
  if (value.includes('پلیاستر')) return 'پلیاستر';
  return value;
}

function detectFit(normalized: string): string | null {
  if (normalized.includes('اسلیم')) return 'اسلیم‌فیت';
  if (normalized.includes('کلاسیک')) return 'کلاسیک';
  return null;
}

function fitMatches(productFit: string, requestedFit: string): boolean {
  const product = canon(productFit);
  const wanted = canon(requestedFit);
  return product === wanted || product.includes(wanted) || wanted.includes(product);
}

function detectFormality(normalized: string): 'formal' | 'semi' | 'casual' | null {
  const casual = ['نیمه رسمی', 'نیمه‌رسمی', 'روزمره', 'کژوال', 'casual', 'غیررسمی', 'اسپرت'];
  if (casual.some((t) => normalized.includes(t))) return 'casual';

  const formal = ['رسمی', 'عروسی', 'مجلس', 'مهمانی', 'جشن', 'تشریفاتی', 'دامادی'];
  if (formal.some((t) => containsTerm(normalized, t))) return 'formal';

  const work = ['کاری', 'اداری', 'دفتر', 'جلسه', 'محیط کار', 'محل کار', 'مصاحبه'];
  if (work.some((t) => containsTerm(normalized, t))) return 'semi';
  return null;
}

type ProductCategory = 'suit' | 'jacket' | 'trousers' | 'other';
type RequestedCategory = ProductCategory | 'shirt' | 'shoes' | 'accessories';

const SUIT_TERMS = [
  'کت و شلوار',
  'کت‌و‌شلوار',
  'کت وشلوار',
  'کت‌وشلوار',
  'کتوشلوار',
  'کت شلوار',
  'کت‌شلوار',
  'کتو شلوار',
  'سوئیت',
];
const JACKET_TERMS = ['کت تک', 'کت‌تک', 'تک کت', 'بلیزر', 'ژاکت'];
const TROUSER_TERMS = ['شلوار'];

const CATEGORY_LABELS: Record<RequestedCategory, string> = {
  suit: 'کت‌وشلوار',
  jacket: 'کت تک',
  trousers: 'شلوار تک',
  shirt: 'پیراهن',
  shoes: 'کفش',
  accessories: 'اکسسوری',
  other: 'محصول',
};

function detectCategories(normalized: string): RequestedCategory[] {
  const found = new Set<RequestedCategory>();
  let rest = normalized;

  const hasSuit = SUIT_TERMS.some((t) => normalized.includes(t));
  if (hasSuit) {
    found.add('suit');
    for (const term of SUIT_TERMS) rest = rest.split(term).join(' ');
  }

  const hasExplicitJacket = JACKET_TERMS.some((t) => rest.includes(t));
  if (hasExplicitJacket) found.add('jacket');

  // «کت» تنها در فروشگاه کت‌وشلوار، همان کت‌وشلوار کامل در نظر گرفته می‌شود؛
  // اما اگر کاربر صریحاً «کت تک» خواسته باشد، هرگز کت‌وشلوار پیشنهاد نمی‌شود.
  if (!hasSuit && !hasExplicitJacket && /(^|\s)کت(\s|$)/.test(rest)) {
    found.add('suit');
  }

  if (TROUSER_TERMS.some((t) => containsTerm(rest, t))) found.add('trousers');
  if (containsTerm(normalized, 'پیراهن')) found.add('shirt');
  if (containsTerm(normalized, 'کفش')) found.add('shoes');
  if (
    ['کراوات', 'پاپیون', 'اکسسوری', 'ساعت مچی', 'ساعت مردانه', 'جوراب', 'دستمال جیبی', 'دستمال گردن', 'کمربند'].some(
      (t) => containsTerm(normalized, t)
    )
  ) {
    found.add('accessories');
  }

  return Array.from(found);
}

/**
 * تشخیص مرتبط بودن پیام با حوزه‌ی پوشاک مردانه، استایل و خرید فروشگاه.
 * این بررسی قبل از هر کوئری دیتابیس انجام می‌شود تا پیام‌های نامرتبط
 * هرگز باعث دریافت یا پیشنهاد محصول نشوند.
 */
const DOMAIN_CONTEXT_TERMS = [
  'لباس',
  'پوشاک',
  'استایل',
  'ست',
  'هماهنگ',
  'شیک',
  'مد',
  'فشن',
  'ترند',
  'پوشیدن',
  'بپوش',
  'میپوشم',
  'خرید',
  'بخرم',
  'قیمت',
  'بودجه',
  'تخفیف',
  'ارزان',
  'گران',
  'مشاوره',
  'پیشنهاد',
  'انتخاب',
  'پارچه',
  'جنس',
  'ویسکوز',
  'پشم',
  'پلی استر',
  'کتان',
  'مخمل',
  'چرم',
  'سایز',
  'اندازه',
  'دور سینه',
  'دور کمر',
  'فیت',
  'اسلیم',
  'کلاسیک',
  'رنگ',
  'رسمی',
  'نیمه رسمی',
  'روزمره',
  'مجلسی',
  'عروسی',
  'دامادی',
  'مهمانی',
  'جشن',
  'کاری',
  'اداری',
  'دفتر',
  'جلسه',
  'مصاحبه',
  'محیط کار',
  'محل کار',
  'کت',
  'شلوار',
  'پیراهن',
  'کفش',
  'کراوات',
  'پاپیون',
  'اکسسوری',
  'جوراب',
  'کمربند',
];

function isFashionRelated(normalized: string, input: StylistRequest): boolean {
  if (input.color?.trim() || input.fit?.trim() || input.formality || input.occasion?.trim()) {
    return true;
  }
  if (detectCategories(normalized).length > 0) return true;
  if (detectFabrics(normalized).length > 0) return true;
  if (detectFit(normalized)) return true;
  if (detectFormality(normalized)) return true;
  return DOMAIN_CONTEXT_TERMS.some((term) => containsTerm(normalized, term));
}

function productCategory(p: CatalogProduct): ProductCategory {
  const name = canon(p.name);
  if (name.includes('کتوشلوار')) return 'suit';
  if (name.includes('کت')) return 'jacket';
  if (name.includes('شلوار')) return 'trousers';
  return 'other';
}

// ---------------------------------------------------------------------------
//  بارگذاری کاتالوگ واقعی با فیلترهای ساختاریافته‌ی دیتابیس
// ---------------------------------------------------------------------------

function buildCategoryCondition(categories: RequestedCategory[]): string | null {
  if (categories.length === 0) return null;

  const suitSql =
    "(p.name LIKE '%کت و شلوار%' OR p.name LIKE '%کت‌و‌شلوار%' OR p.name LIKE '%کت وشلوار%' OR p.name LIKE '%کت‌وشلوار%' OR p.name LIKE '%کتوشلوار%' OR p.name LIKE '%کت شلوار%')";
  const clauses: string[] = [];

  if (categories.includes('suit')) clauses.push(suitSql);
  if (categories.includes('jacket')) clauses.push(`(p.name LIKE '%کت%' AND NOT ${suitSql})`);
  if (categories.includes('trousers')) clauses.push(`(p.name LIKE '%شلوار%' AND NOT ${suitSql})`);

  // اگر فقط دسته‌هایی خواسته شده که در ساختار محصولات فروشگاه وجود ندارند
  // (مثل پیراهن یا کفش)، کوئری عمداً نتیجه‌ای برنمی‌گرداند.
  if (clauses.length === 0) return '1 = 0';
  return `(${clauses.join(' OR ')})`;
}

function buildColorCondition(colors: string[]): { sql: string; params: string[] } | null {
  if (colors.length === 0) return null;

  const terms = new Set<string>();
  for (const requested of colors) {
    const family = COLOR_FAMILIES.find((item) => canon(item.canonical) === canon(requested));
    if (family) {
      for (const term of family.terms) terms.add(term);
    } else {
      terms.add(requested);
    }
  }

  if (terms.size === 0) return null;
  const values = Array.from(terms);
  return {
    sql: `(${values.map(() => 'p.color LIKE ?').join(' OR ')})`,
    params: values.map((term) => `%${term}%`),
  };
}

async function loadCatalog(options: {
  budget?: number | null;
  categories?: RequestedCategory[];
  colors?: string[];
  fit?: string | null;
}): Promise<CatalogProduct[]> {
  const conditions: string[] = ['p.is_active = 1'];
  const params: (string | number)[] = [];

  if (options.budget != null) {
    conditions.push('p.price <= ?');
    params.push(options.budget);
  }

  const categoryCondition = buildCategoryCondition(options.categories ?? []);
  if (categoryCondition) conditions.push(categoryCondition);

  const colorCondition = buildColorCondition(options.colors ?? []);
  if (colorCondition) {
    conditions.push(colorCondition.sql);
    params.push(...colorCondition.params);
  }

  if (options.fit) {
    conditions.push('ft.name LIKE ?');
    params.push(`%${options.fit}%`);
  }

  conditions.push(`EXISTS (
    SELECT 1 FROM product_sizes ps_stock
    WHERE ps_stock.product_id = p.id AND ps_stock.stock > 0
  )`);

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
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.id
    `)
    .all(...params)) as unknown as Omit<CatalogProduct, 'sizes' | 'stock'>[];

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

/** دسته‌های واقعاً موجود در فروشگاه (مستقل از فیلترهای درخواست). */
async function loadAvailableCategories(): Promise<Set<ProductCategory>> {
  const rows = (await db
    .prepare(`
      SELECT p.name
      FROM products p
      WHERE p.is_active = 1
        AND EXISTS (
          SELECT 1 FROM product_sizes ps
          WHERE ps.product_id = p.id AND ps.stock > 0
        )
    `)
    .all()) as unknown as { name: string }[];

  const categories = new Set<ProductCategory>();
  for (const row of rows) {
    const name = canon(row.name);
    if (name.includes('کتوشلوار')) categories.add('suit');
    else if (name.includes('کت')) categories.add('jacket');
    else if (name.includes('شلوار')) categories.add('trousers');
    else categories.add('other');
  }
  return categories;
}

function detectMissingCategories(
  requested: RequestedCategory[],
  available: Set<ProductCategory>
): string[] {
  return requested
    .filter((category) => !available.has(category as ProductCategory))
    .map((category) => CATEGORY_LABELS[category]);
}

// ---------------------------------------------------------------------------
//  فیلتر سخت و امتیازدهی
// ---------------------------------------------------------------------------
interface StyleContext {
  colors: string[];
  fabrics: string[];
  fit: string | null;
  formality: 'formal' | 'semi' | 'casual' | null;
  budget: number | null;
  categories: RequestedCategory[];
}

interface Scored {
  product: CatalogProduct;
  score: number;
  reasons: string[];
}

function passesEssentialFilters(p: CatalogProduct, ctx: StyleContext): boolean {
  if (p.stock <= 0) return false;

  if (ctx.categories.length > 0 && !ctx.categories.includes(productCategory(p))) return false;
  if (ctx.colors.length > 0 && !colorMatches(p.color, ctx.colors)) return false;
  if (ctx.fabrics.length > 0) {
    const family = canon(productFabricFamily(p.fabric_name));
    if (!ctx.fabrics.some((fabric) => canon(fabric) === family)) return false;
  }
  if (ctx.fit && !fitMatches(p.fit_name, ctx.fit)) return false;
  if (ctx.budget != null && p.price > ctx.budget) return false;

  return true;
}

function scoreProduct(p: CatalogProduct, ctx: StyleContext): Scored {
  let score = MIN_RELEVANCE_SCORE;
  const reasons: string[] = [];

  const color = canon(p.color);
  const fit = canon(p.fit_name);
  const fabric = canon(p.fabric_name);
  const stitching = canon(p.stitching_type);

  if (ctx.categories.length > 0) {
    reasons.push(
      productCategory(p) === 'suit'
        ? 'ست کامل کت‌وشلوار است و دقیقاً با نوع درخواستی شما مطابقت دارد'
        : `${CATEGORY_LABELS[productCategory(p) as RequestedCategory]} است و با نوع درخواستی شما مطابقت دارد`
    );
  }

  if (ctx.colors.length > 0) {
    reasons.push(`رنگ ${p.color} آن دقیقاً با رنگ درخواستی شما (${ctx.colors.join('، ')}) مطابقت دارد`);
  }

  if (ctx.budget != null) {
    reasons.push('قیمت آن در محدوده‌ی بودجه‌ی اعلام‌شده‌ی شماست');
  }

  if (ctx.fabrics.length > 0) {
    reasons.push(`جنس ${p.fabric_name} آن همان جنس درخواستی شماست`);
  }

  if (ctx.fit && fitMatches(p.fit_name, ctx.fit)) {
    reasons.push(`برش ${p.fit_name} آن همان فیتی است که خواسته‌اید`);
  }

  // ویژگی‌های غیرضروری فقط رتبه را تغییر می‌دهند و باعث حذف نمی‌شوند.
  if (ctx.formality === 'formal') {
    if (stitching.includes('ایتالیایی') || stitching.includes('انگلیسی')) score += 8;
    if (fabric.includes('پشم')) score += 6;
    if (['مشکی', 'سرمه‌ای', 'عاجی', 'بورگوندی', 'یشمی', 'اسپرسو'].some((c) => color.includes(canon(c)))) {
      score += 4;
    }
    reasons.push('برای مجالس و مناسبت‌های رسمی انتخابی مطمئن است');
  } else if (ctx.formality === 'casual') {
    if (fit.includes('کلاسیک')) score += 6;
    if (['خاکستری', 'طوسی', 'سرمه‌ای'].some((c) => color.includes(canon(c)))) score += 4;
    reasons.push('برای استایل نیمه‌رسمی و روزمره راحت و شیک است');
  } else if (ctx.formality === 'semi') {
    if (fabric.includes('ویسکوزپلیاستر')) score += 5;
    if (['سرمه‌ای', 'مشکی', 'طوسی'].some((c) => color.includes(canon(c)))) score += 4;
    reasons.push('برای محیط کار و جلسات روزانه مناسب است');
  }

  if (p.is_featured) score += 2;
  score += Math.min(5, Math.floor(p.stock / 10));

  return { product: p, score, reasons };
}

function buildReason(s: Scored): string {
  const unique = Array.from(new Set(s.reasons)).slice(0, 2);
  if (unique.length === 0) {
    return 'از میان محصولات واقعی موجود فروشگاه، بیشترین تطابق را با درخواست شما دارد.';
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
//  لایه‌ی اختیاری LLM (در صورت تنظیم متغیرهای محیطی)
//  فقط می‌تواند بین گزینه‌های واجد شرایطِ فیلترشده ترتیب/دلیل تعیین کند؛
//  نه محصول جدید اضافه کند و نه محصول نامرتبط بازگرداند.
// ---------------------------------------------------------------------------
async function llmSelect(
  candidates: CatalogProduct[],
  ctx: StyleContext,
  userMessage: string
): Promise<{ picks: { productId: number; reason: string }[] } | null> {
  const url = process.env.STYLIST_LLM_URL;
  const key = process.env.STYLIST_LLM_KEY;
  if (!url || !key || candidates.length === 0) return null;

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
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'تو یک استایلیست حرفهای کت‌وشلوار مردانه هستی. فقط از میان محصولات داده‌شده انتخاب کن و هیچ محصولی از خودت نساز. حداکثر ۴ محصول انتخاب کن و تعداد نتایج را برای رسیدن به عدد ثابت پر نکن؛ اگر محصولی با ویژگیهای صریح کاربر (نوع لباس، رنگ، جنس، فیت و بودجه) مطابق نیست، آن را انتخاب نکن. خروجی را به شکل JSON با کلیدهای message (متن فارسی) و recommendations (آرایه از {productId, reason}) برگردان. productId باید فقط از بین شناسههای موجود باشد.',
          },
          {
            role: 'user',
            content: `درخواست کاربر: ${userMessage}\nبودجه: ${ctx.budget ?? 'نامشخص'} تومان\nویژگیهای ضروری: نوع=${ctx.categories.join('، ') || 'نامشخص'}، رنگ=${ctx.colors.join('، ') || 'نامشخص'}، جنس=${ctx.fabrics.join('، ') || 'نامشخص'}، فیت=${ctx.fit ?? 'نامشخص'}\nمحصولات واجد شرایط: ${JSON.stringify(catalog)}`,
          },
        ],
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as {
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
    return { picks };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
//  تولید پاسخ نهایی
// ---------------------------------------------------------------------------
function describeFilters(ctx: StyleContext): string {
  const parts: string[] = [];

  if (ctx.categories.length > 0) {
    parts.push(ctx.categories.map((c) => CATEGORY_LABELS[c]).join('، '));
  }
  if (ctx.colors.length > 0) parts.push(`رنگ ${ctx.colors.join('، ')}`);
  if (ctx.fabrics.length > 0) parts.push(`جنس ${ctx.fabrics.join('، ')}`);
  if (ctx.fit) parts.push(`برش ${ctx.fit}`);
  if (ctx.budget != null) parts.push(`بودجه تا ${ctx.budget.toLocaleString('fa-IR')} تومان`);

  if (parts.length === 0) {
    if (ctx.formality === 'formal') return 'مناسبت رسمی';
    if (ctx.formality === 'semi') return 'محیط کار و جلسات';
    if (ctx.formality === 'casual') return 'استایل نیمه‌رسمی و روزمره';
  }

  return parts.join('، ');
}

function hasHardConstraints(ctx: StyleContext): boolean {
  return (
    ctx.categories.length > 0 ||
    ctx.colors.length > 0 ||
    ctx.fabrics.length > 0 ||
    ctx.fit !== null ||
    ctx.budget !== null
  );
}

function buildMessage(ctx: StyleContext, count: number, totalMatches: number, missing: string[]): string {
  const description = describeFilters(ctx);
  const subject = description ? ` با مشخصات «${description}»` : '';
  const exact = hasHardConstraints(ctx);

  if (count > 0) {
    const shown = count.toLocaleString('fa-IR');
    let message =
      totalMatches > count
        ? `${shown} محصول از میان ${totalMatches.toLocaleString('fa-IR')} گزینه‌ی منطبق${subject} انتخاب شد.`
        : exact
          ? `${shown} محصول کاملاً منطبق${subject} در فروشگاه پیدا شد.`
          : `${shown} پیشنهاد مناسب${subject} از محصولات موجود فروشگاه پیدا شد.`;
    if (missing.length > 0) {
      message += ` ${missing.join('، ')} در فروشگاه موجود نیست و به‌جای آن محصول نامرتبطی پیشنهاد نشده است.`;
    }
    return message;
  }

  let message = `متأسفانه محصولی${subject} در فروشگاه موجود نیست.`;
  if (missing.length > 0) {
    message += ` ${missing.join('، ')} نیز در فروشگاه عرضه نمی‌شود.`;
  }
  message += ' می‌توانید رنگ، جنس یا محدوده‌ی بودجه را تغییر دهید تا گزینه‌های واقعی موجود را دوباره بررسی کنم.';
  return message;
}

export async function generateStylistResponse(input: StylistRequest): Promise<StylistResult> {
  const normalized = normalize(input.message);

  // تشخیص نامرتبط بودن پیام باید پیش از هر کوئری دیتابیس انجام شود.
  if (!isFashionRelated(normalized, input)) {
    return {
      message: OFF_TOPIC_MESSAGE,
      budget: null,
      filters: { colors: [], fit: null, formality: null },
      missingCategories: [],
      recommendations: [],
    };
  }

  const budgetFromMessage = parseBudget(normalized);
  const budgetCandidates = [input.budget, budgetFromMessage].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
  );
  // اگر کاربر هم در متن بودجه گفته و هم از اسلایدر بودجه فرستاده باشد،
  // سخت‌گیرانه‌ترین (کمترین) سقف اعمال می‌شود.
  const budget = budgetCandidates.length > 0 ? Math.min(...budgetCandidates) : null;

  const explicitColor = input.color?.trim() ?? '';
  const explicitColorFamilies = explicitColor ? detectColors(normalize(explicitColor)) : [];
  const colors = explicitColor
    ? explicitColorFamilies.length > 0
      ? explicitColorFamilies
      : [explicitColor]
    : detectColors(normalized);
  const fit = (input.fit?.trim() ? detectFit(normalize(input.fit)) ?? input.fit.trim() : detectFit(normalized)) || null;
  const formality = input.formality ?? detectFormality(normalized);
  const categories = detectCategories(normalized);
  const fabrics = detectFabrics(normalized);

  const ctx: StyleContext = { colors, fabrics, fit, formality, budget, categories };

  const filters = { colors, fit, formality };
  const availableCategories = await loadAvailableCategories();
  const missingCategories = detectMissingCategories(categories, availableCategories);

  if (availableCategories.size === 0) {
    return {
      message: 'در حال حاضر محصول فعال و موجودی در فروشگاه ثبت نشده است. لطفاً بعداً دوباره تلاش کنید.',
      budget,
      filters,
      missingCategories,
      recommendations: [],
    };
  }

  // فیلترهای سخت ساختاریافته (بودجه، دسته‌بندی، رنگ و فیت) در خود دیتابیس اعمال می‌شوند.
  const catalog = await loadCatalog({ budget, categories, colors, fit });

  // رنگ، جنس و فیت به‌صورت دقیق روی کاتالوگ واقعی اعمال می‌شوند.
  const qualified = catalog.filter((product) => passesEssentialFilters(product, ctx));

  const ranked = qualified
    .map((product) => scoreProduct(product, ctx))
    .filter((scored) => scored.score >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price || a.product.id - b.product.id);

  // فقط ۴ محصول با بالاترین امتیاز تطابق وارد مرحله‌ی نهایی می‌شوند.
  // LLM می‌تواند ترتیب/دلیل همین گزینه‌ها را بهبود دهد، اما حق اضافه کردن
  // محصول خارج از این چهار گزینه یا تغییر مجموعه‌ی برتر را ندارد.
  const topRanked = ranked.slice(0, MAX_RECOMMENDATIONS);

  const llm = await llmSelect(
    topRanked.map((scored) => scored.product),
    ctx,
    input.message
  );

  const byId = new Map(topRanked.map((scored) => [scored.product.id, scored]));
  const ordered: Scored[] = [];
  const seen = new Set<number>();

  if (llm) {
    for (const pick of llm.picks) {
      const scored = byId.get(pick.productId);
      if (scored && !seen.has(scored.product.id)) {
        ordered.push(scored);
        seen.add(scored.product.id);
      }
    }
  }

  // سایر گزینه‌های برتر که LLM انتخاب نکرده است، بر اساس امتیاز واقعی اضافه می‌شوند.
  for (const scored of topRanked) {
    if (!seen.has(scored.product.id)) {
      ordered.push(scored);
      seen.add(scored.product.id);
    }
  }

  const totalMatches = ranked.length;
  const llmReasons = new Map(llm?.picks.map((pick) => [pick.productId, pick.reason]) ?? []);
  const recommendations = ordered.map((scored) => {
    const recommendation = toRecommendation(scored);
    const llmReason = llmReasons.get(scored.product.id);
    return llmReason ? { ...recommendation, reason: llmReason } : recommendation;
  });

  return {
    message: buildMessage(ctx, recommendations.length, totalMatches, missingCategories),
    budget,
    filters,
    missingCategories,
    recommendations,
  };
}
