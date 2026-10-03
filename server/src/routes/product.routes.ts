import { Router } from 'express';
import { db } from '../db/connection.js';
import { productQuerySchema, reviewSchema } from '../utils/validators.js';
import { AppError } from '../middlewares/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authRequired, optionalAuth, AuthenticatedRequest } from '../middlewares/auth.js';
import {
  computeReviewStats,
  getProductReviewSummary,
  invalidateReviewSummary,
} from '../utils/reviewSummary.js';

const router = Router();

interface ProductRow {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  old_price: number | null;
  fabric_id: number;
  fit_id: number;
  stitching_type: string;
  color: string;
  is_featured: number;
  fabric_name: string;
  fabric_slug: string;
  fit_name: string;
  fit_slug: string;
  main_image: string | null;
}

const PRODUCT_SELECT = `
  SELECT p.*, f.name as fabric_name, f.slug as fabric_slug,
         ft.name as fit_name, ft.slug as fit_slug,
         (SELECT pi.url FROM product_images pi
           WHERE pi.product_id = p.id AND pi.image_type = 'main'
           ORDER BY pi.sort_order LIMIT 1) as main_image
  FROM products p
  JOIN fabrics f ON f.id = p.fabric_id
  JOIN fits ft ON ft.id = p.fit_id
`;

function toProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    oldPrice: row.old_price,
    fabric: { id: row.fabric_id, name: row.fabric_name, slug: row.fabric_slug },
    fit: { id: row.fit_id, name: row.fit_name, slug: row.fit_slug },
    stitchingType: row.stitching_type,
    color: row.color,
    isFeatured: Boolean(row.is_featured),
    mainImage: row.main_image,
  };
}

// GET /api/products — لیست محصولات با فیلتر
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = productQuerySchema.parse(req.query);
    const conditions: string[] = ['p.is_active = 1'];
    const params: (string | number)[] = [];

    if (q.search) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push(`%${q.search}%`, `%${q.search}%`);
    }
    if (q.fabric) {
      conditions.push('f.slug = ?');
      params.push(q.fabric);
    }
    if (q.fit) {
      conditions.push('ft.slug = ?');
      params.push(q.fit);
    }
    if (q.minPrice) {
      conditions.push('p.price >= ?');
      params.push(Number(q.minPrice));
    }
    if (q.maxPrice) {
      conditions.push('p.price <= ?');
      params.push(Number(q.maxPrice));
    }
    if (q.featured === 'true') {
      conditions.push('p.is_featured = 1');
    }

    const orderByMap: Record<string, string> = {
      newest: 'p.created_at DESC',
      price_asc: 'p.price ASC',
      price_desc: 'p.price DESC',
      popular: 'p.id ASC',
    };
    const orderBy = orderByMap[q.sort ?? 'newest'] || orderByMap.newest;

    const limit = Math.min(Math.max(Number(q.limit) || 30, 1), 60);
    const offset = Math.max(Number(q.offset) || 0, 0);

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const listParams = [...params, limit, offset];

    // اجرای هم‌زمان کوئری لیست و شمارش برای کاهش زمان پاسخ
    const [rows, countRow] = await Promise.all([
      db
        .prepare(`${PRODUCT_SELECT} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
        .all(...listParams) as unknown as Promise<ProductRow[]>,
      db
        .prepare(`SELECT COUNT(*) as count FROM products p JOIN fabrics f ON f.id=p.fabric_id JOIN fits ft ON ft.id=p.fit_id ${where}`)
        .get(...params) as unknown as Promise<{ count: number }>,
    ]);

    res.json({ success: true, data: { products: rows.map(toProduct), total: countRow.count } });
  })
);

// GET /api/products/filters — داده‌های فیلترها
router.get(
  '/filters',
  asyncHandler(async (_req, res) => {
    const fabrics = await db.prepare('SELECT id, name, slug, description FROM fabrics ORDER BY name').all();
    const fits = await db.prepare('SELECT id, name, slug FROM fits ORDER BY id').all();
    const sizes = await db
      .prepare("SELECT code, label, min_chest_cm as minChest, max_chest_cm as maxChest, min_waist_cm as minWaist, max_waist_cm as maxWaist FROM sizes ORDER BY code")
      .all();
    res.json({ success: true, data: { fabrics, fits, sizes } });
  })
);

// GET /api/products/fabrics — فقط پارچه‌ها
router.get(
  '/fabrics',
  asyncHandler(async (_req, res) => {
    const fabrics = await db
      .prepare(`
        SELECT f.id, f.name, f.slug, f.description, f.image_url,
               (SELECT COUNT(*) FROM products p WHERE p.fabric_id = f.id) as product_count
        FROM fabrics f ORDER BY f.name
      `)
      .all();
    res.json({ success: true, data: fabrics });
  })
);

// GET /api/products/sizes — جدول سایزها
router.get(
  '/sizes',
  asyncHandler(async (_req, res) => {
    const sizes = await db
      .prepare('SELECT code, label, min_chest_cm as minChest, max_chest_cm as maxChest, min_waist_cm as minWaist, max_waist_cm as maxWaist FROM sizes ORDER BY code')
      .all();
    res.json({ success: true, data: sizes });
  })
);

// GET /api/products/:slug — جزئیات محصول
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const row = (await db
      .prepare(`${PRODUCT_SELECT} WHERE p.slug = ?`)
      .get(req.params.slug)) as unknown as ProductRow | undefined;
    if (!row) throw new AppError('محصول یافت نشد.', 404);

    const images = await db
      .prepare('SELECT id, url, alt, image_type as imageType, sort_order as sortOrder FROM product_images WHERE product_id = ? ORDER BY sort_order')
      .all(row.id);

    const sizes = (await db
      .prepare(`
        SELECT s.id, s.code, s.label, ps.stock
        FROM product_sizes ps
        JOIN sizes s ON s.id = ps.size_id
        WHERE ps.product_id = ?
        ORDER BY s.code
      `)
      .all(row.id)) as unknown as { id: number; code: string; label: string; stock: number }[];

    // مقالات مرتبط با پارچه
    const fabricArticles = await db
      .prepare('SELECT id, title, slug FROM articles WHERE fabric_id = ? AND is_published = 1')
      .all(row.fabric_id);

    res.json({
      success: true,
      data: {
        ...toProduct(row),
        images,
        availableSizes: sizes.filter((s) => s.stock > 0),
        outOfStockSizes: sizes.filter((s) => s.stock === 0),
        fabricArticles,
      },
    });
  })
);

// ============================================================
//  نظرات و امتیاز محصول
// ============================================================
interface ReviewRow {
  id: number;
  user_id: number;
  rating: number;
  comment: string;
  created_at: string;
  user_name: string | null;
}

async function findProductIdBySlug(slug: string): Promise<number> {
  const product = (await db.prepare('SELECT id FROM products WHERE slug = ?').get(slug)) as
    | { id: number }
    | undefined;
  if (!product) throw new AppError('محصول یافت نشد.', 404);
  return product.id;
}

// GET /api/products/:slug/reviews — لیست نظرات + خلاصه کیفیت
router.get(
  '/:slug/reviews',
  optionalAuth,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const productId = await findProductIdBySlug(req.params.slug);

    const rows = (await db
      .prepare(`
        SELECT r.id, r.user_id, r.rating, r.comment, r.created_at, u.full_name as user_name
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.product_id = ?
        ORDER BY r.created_at DESC, r.id DESC
      `)
      .all(productId)) as unknown as ReviewRow[];

    const verifiedRows = (await db
      .prepare(`
        SELECT DISTINCT o.user_id as user_id
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.product_id = ? AND o.status = 'delivered'
      `)
      .all(productId)) as unknown as { user_id: number }[];
    const verifiedSet = new Set(verifiedRows.map((v) => v.user_id));

    const stats = await computeReviewStats(productId);
    const summaryText = await getProductReviewSummary(
      productId,
      rows.map((r) => ({ rating: r.rating, comment: r.comment })),
      stats
    );

    const reviews = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name?.trim() || 'کاربر چولفیش',
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
      verified: verifiedSet.has(r.user_id),
    }));

    res.json({
      success: true,
      data: {
        summary: {
          ...stats,
          text: summaryText,
          verifiedCount: reviews.filter((r) => r.verified).length,
        },
        reviews,
        myReview: req.user ? reviews.find((r) => r.userId === req.user!.id) ?? null : null,
      },
    });
  })
);

// POST /api/products/:slug/reviews — ثبت یا ویرایش نظر کاربر
router.post(
  '/:slug/reviews',
  authRequired,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const body = reviewSchema.parse(req.body);
    const productId = await findProductIdBySlug(req.params.slug);

    const existing = (await db
      .prepare('SELECT id FROM reviews WHERE product_id = ? AND user_id = ?')
      .get(productId, req.user!.id)) as { id: number } | undefined;

    if (existing) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db
        .prepare('UPDATE reviews SET rating = ?, comment = ?, updated_at = ? WHERE id = ?')
        .run(body.rating, body.comment, now, existing.id);
    } else {
      await db
        .prepare('INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)')
        .run(productId, req.user!.id, body.rating, body.comment);
    }

    await invalidateReviewSummary(productId);

    res.status(existing ? 200 : 201).json({
      success: true,
      message: existing ? 'نظر شما به‌روزرسانی شد.' : 'نظر شما با موفقیت ثبت شد.',
      data: { productId },
    });
  })
);

export default router;
