import { Router } from 'express';
import { db } from '../db/connection.js';
import { AppError } from '../middlewares/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

interface ArticleRow {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  fabric_id: number | null;
  fabric_name: string | null;
  fabric_slug: string | null;
  category: string;
  published_at: string;
  meta_title: string | null;
  meta_description: string | null;
}

const ARTICLE_SELECT = `
  SELECT a.*, f.name as fabric_name, f.slug as fabric_slug
  FROM articles a
  LEFT JOIN fabrics f ON f.id = a.fabric_id
`;

function toArticle(row: ArticleRow) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    coverImage: row.cover_image,
    fabric: row.fabric_id
      ? { id: row.fabric_id, name: row.fabric_name, slug: row.fabric_slug }
      : null,
    category: row.category,
    publishedAt: row.published_at,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
  };
}

// GET /api/articles — لیست مقالات
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 60);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const category = req.query.category as string | undefined;

    const conditions = ['a.is_published = 1'];
    const params: (string | number)[] = [];
    if (category) {
      conditions.push('a.category = ?');
      params.push(category);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const listParams = [...params, limit, offset];

    const [rows, countRow] = await Promise.all([
      db
        .prepare(`${ARTICLE_SELECT} ${where} ORDER BY a.published_at DESC LIMIT ? OFFSET ?`)
        .all(...listParams) as unknown as Promise<ArticleRow[]>,
      db
        .prepare(`SELECT COUNT(*) as count FROM articles a ${where}`)
        .get(...params) as unknown as Promise<{ count: number }>,
    ]);

    res.json({
      success: true,
      data: {
        articles: rows.map((r) => toArticle(r)),
        total: countRow.count,
      },
    });
  })
);

// GET /api/articles/categories — دسته بندی مقالات
router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const rows = await db
      .prepare('SELECT category as name, COUNT(*) as count FROM articles WHERE is_published = 1 GROUP BY category ORDER BY count DESC')
      .all();
    res.json({ success: true, data: rows });
  })
);

// GET /api/articles/:slug — جزئیات مقاله
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const row = (await db
      .prepare(`${ARTICLE_SELECT} WHERE a.slug = ? AND a.is_published = 1`)
      .get(req.params.slug)) as unknown as ArticleRow | undefined;

    if (!row) throw new AppError('مقاله یافت نشد.', 404);

    // محصولات مرتبط با پارچه همین مقاله
    let relatedProducts: unknown[] = [];
    if (row.fabric_id) {
      const relatedRows = (await db
        .prepare(`
          SELECT p.id, p.name, p.slug, p.description, p.price, p.old_price, p.fabric_id, p.fit_id,
                 p.stitching_type, p.color, p.is_featured, p.is_active,
                 f.name as fabric_name, f.slug as fabric_slug,
                 ft.name as fit_name, ft.slug as fit_slug,
                 (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.image_type='main' LIMIT 1) as main_image
          FROM products p
          JOIN fabrics f ON f.id = p.fabric_id
          JOIN fits ft ON ft.id = p.fit_id
          WHERE p.fabric_id = ? AND p.is_active = 1
        `)
        .all(row.fabric_id)) as unknown as {
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
      }[];

      // هم‌شکل با /api/products تا ProductCard بدون تغییر کار کند
      relatedProducts = relatedRows.map((p) => ({
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
      }));
    }

    res.json({ success: true, data: { ...toArticle(row), relatedProducts } });
  })
);

export default router;
