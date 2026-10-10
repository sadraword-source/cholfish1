import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { db, withTransaction } from '../db/connection.js';
import { authRequired, adminOnly, signToken, AuthenticatedRequest } from '../middlewares/auth.js';
import {
  adminProductSchema,
  adminArticleSchema,
  orderStatusSchema,
  orderPaymentStatusSchema,
  slugify,
  adminLoginSchema,
  changeAdminPasswordSchema,
  adminSettingsSchema,
} from '../utils/validators.js';
import { AppError } from '../middlewares/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getCardNumber, setCardNumber, getCardHolder, setCardHolder } from '../utils/settings.js';

const router = Router();

// ============================================================
//  ورود مدیر با نام کاربری و رمز عبور (بدون نیاز به توکن)
// ============================================================
router.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const { username, password } = adminLoginSchema.parse(req.body);

    const row = (await db
      .prepare('SELECT id, phone, username, full_name, password_hash, role FROM users WHERE username = ?')
      .get(username)) as
      | { id: number; phone: string; username: string | null; full_name: string; password_hash: string | null; role: string }
      | undefined;

    // پیام یکسان برای جلوگیری از افشای وجود کاربر
    if (!row || !row.password_hash || !bcrypt.compareSync(password, row.password_hash)) {
      throw new AppError('نام کاربری یا رمز عبور نامعتبر است.', 401);
    }

    if (row.role !== 'admin') {
      throw new AppError('این حساب دسترسی مدیریت ندارد.', 403);
    }

    const token = signToken({ id: row.id, phone: row.phone, role: row.role });
    res.json({
      success: true,
      data: {
        token,
        user: { id: row.id, phone: row.phone, fullName: row.full_name, role: row.role, username: row.username },
      },
    });
  })
);

// ============================================================
//  تغییر رمز عبور مدیر (نیازمند لاگین)
// ============================================================
router.post(
  '/auth/change-password',
  authRequired,
  adminOnly,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const { currentPassword, newPassword } = changeAdminPasswordSchema.parse(req.body);

    const row = (await db
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .get(req.user!.id)) as { password_hash: string | null } | undefined;

    if (!row?.password_hash || !bcrypt.compareSync(currentPassword, row.password_hash)) {
      throw new AppError('رمز عبور فعلی نادرست است.', 400);
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    await db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.user!.id);

    res.json({ success: true, message: 'رمز عبور با موفقیت تغییر کرد.' });
  })
);

// ============================================================
//  از این‌جا به بعد فقط مدیر لاگین‌کرده
// ============================================================
router.use(authRequired, adminOnly);

// ============================================================
//  بارگذاری تصویر (برای محصولات، مقالات و هر جای دیگر)
// ============================================================
const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads', 'images');
fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = IMAGE_EXTENSIONS.includes(ext) ? ext : '.jpg';
      cb(null, `img-${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(new AppError('فقط تصویر (JPG، PNG، WEBP، GIF یا SVG) قابل بارگذاری است.', 400));
      return;
    }
    cb(null, true);
  },
}).single('image');

router.post(
  '/upload',
  (req, res, next) => {
    imageUpload(req, res, (err) => {
      if (err) {
        next(err);
        return;
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('تصویری برای بارگذاری انتخاب نشده است.', 400);
    const url = `/uploads/images/${req.file.filename}`;
    res.status(201).json({ success: true, message: 'تصویر بارگذاری شد.', data: { url } });
  })
);

function pageParams(query: Record<string, unknown>): { limit: number; offset: number } {
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { limit, offset };
}

async function uniqueSlug(base: string, table: 'products' | 'articles', excludeId?: number): Promise<string> {
  const root = slugify(base) || 'item';
  let slug = root;
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = (await db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug)) as
      | { id: number }
      | undefined;
    if (!row || (excludeId !== undefined && row.id === excludeId)) return slug;
    i += 1;
    slug = `${root}-${i}`;
  }
}

function idParam(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('شناسه نامعتبر است.', 400);
  return id;
}

// ============================================================
//  داشبورد
// ============================================================
router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const scalar = async (sql: string, params: unknown[] = []): Promise<number> => {
      const row = (await db.prepare(sql).get(...params)) as { v: number | string | null };
      return Number(row.v ?? 0);
    };

    const [
      products,
      activeProducts,
      articles,
      orders,
      users,
      revenue,
    ] = await Promise.all([
      scalar('SELECT COUNT(*) v FROM products'),
      scalar('SELECT COUNT(*) v FROM products WHERE is_active = 1'),
      scalar('SELECT COUNT(*) v FROM articles'),
      scalar('SELECT COUNT(*) v FROM orders'),
      scalar('SELECT COUNT(*) v FROM users'),
      scalar('SELECT COALESCE(SUM(total), 0) v FROM orders'),
    ]);

    const byStatus = await db
      .prepare("SELECT status, COUNT(*) as count FROM orders GROUP BY status")
      .all();

    const recentOrders = await db
      .prepare(`
        SELECT o.id, o.order_number, o.status, o.total, o.created_at, u.full_name, u.phone
        FROM orders o JOIN users u ON u.id = o.user_id
        ORDER BY o.id DESC LIMIT 6
      `)
      .all();

    res.json({
      success: true,
      data: {
        counts: { products, activeProducts, articles, orders, users },
        revenue,
        byStatus,
        recentOrders,
      },
    });
  })
);

// ============================================================
//  محصولات
// ============================================================
router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const { limit, offset } = pageParams(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? '').trim();

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (search) {
      conditions.push('(p.name LIKE ? OR p.slug LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await db
      .prepare(`
        SELECT p.id, p.name, p.slug, p.price, p.old_price, p.is_active, p.is_featured,
               p.color, p.stitching_type, p.created_at,
               f.name as fabric_name, ft.name as fit_name,
               (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.image_type = 'main' ORDER BY pi.sort_order LIMIT 1) as main_image,
               (SELECT COALESCE(SUM(ps.stock), 0) FROM product_sizes ps WHERE ps.product_id = p.id) as total_stock
        FROM products p
        JOIN fabrics f ON f.id = p.fabric_id
        JOIN fits ft ON ft.id = p.fit_id
        ${where}
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, limit, offset);

    const countRow = (await db
      .prepare(`SELECT COUNT(*) as count FROM products p ${where}`)
      .get(...params)) as { count: number };

    res.json({ success: true, data: { products: rows, total: Number(countRow.count) } });
  })
);

router.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const product = await db
      .prepare(`
        SELECT p.*, f.name as fabric_name, ft.name as fit_name
        FROM products p JOIN fabrics f ON f.id = p.fabric_id JOIN fits ft ON ft.id = p.fit_id
        WHERE p.id = ?
      `)
      .get(id);
    if (!product) throw new AppError('محصول یافت نشد.', 404);

    const images = await db
      .prepare('SELECT id, url, alt, image_type, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order, id')
      .all(id);

    const sizes = await db
      .prepare(`
        SELECT s.id as sizeId, s.code, s.label, COALESCE(ps.stock, 0) as stock
        FROM sizes s
        LEFT JOIN product_sizes ps ON ps.size_id = s.id AND ps.product_id = ?
        ORDER BY s.code
      `)
      .all(id);

    res.json({ success: true, data: { product, images, sizes } });
  })
);

router.post(
  '/products',
  asyncHandler(async (req, res) => {
    const body = adminProductSchema.parse(req.body);
    const slug = await uniqueSlug(body.slug || body.name, 'products');

    const id = await withTransaction(async (tx) => {
      const result = await tx
        .prepare(`
          INSERT INTO products
            (name, slug, description, price, old_price, fabric_id, fit_id, stitching_type, color, is_featured, is_active, meta_title, meta_description)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          body.name,
          slug,
          body.description ?? '',
          body.price,
          body.oldPrice ?? null,
          body.fabricId,
          body.fitId,
          body.stitchingType ?? 'فارسی',
          body.color ?? 'مشکی',
          body.isFeatured ? 1 : 0,
          body.isActive ? 1 : 0,
          body.metaTitle ?? null,
          body.metaDescription ?? null
        );
      const productId = Number(result.lastInsertRowid);
      await saveChildren(tx, productId, body.images ?? [], body.sizes ?? []);
      return productId;
    });

    res.status(201).json({ success: true, message: 'محصول ساخته شد.', data: { id, slug } });
  })
);

router.put(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const body = adminProductSchema.parse(req.body);
    const existing = (await db.prepare('SELECT id FROM products WHERE id = ?').get(id)) as
      | { id: number }
      | undefined;
    if (!existing) throw new AppError('محصول یافت نشد.', 404);
    const slug = await uniqueSlug(body.slug || body.name, 'products', id);

    await withTransaction(async (tx) => {
      await tx
        .prepare(`
          UPDATE products SET
            name = ?, slug = ?, description = ?, price = ?, old_price = ?, fabric_id = ?, fit_id = ?,
            stitching_type = ?, color = ?, is_featured = ?, is_active = ?, meta_title = ?, meta_description = ?
          WHERE id = ?
        `)
        .run(
          body.name,
          slug,
          body.description ?? '',
          body.price,
          body.oldPrice ?? null,
          body.fabricId,
          body.fitId,
          body.stitchingType ?? 'فارسی',
          body.color ?? 'مشکی',
          body.isFeatured ? 1 : 0,
          body.isActive ? 1 : 0,
          body.metaTitle ?? null,
          body.metaDescription ?? null,
          id
        );
      await tx.prepare('DELETE FROM product_images WHERE product_id = ?').run(id);
      await tx.prepare('DELETE FROM product_sizes WHERE product_id = ?').run(id);
      await saveChildren(tx, id, body.images ?? [], body.sizes ?? []);
    });

    res.json({ success: true, message: 'محصول به‌روزرسانی شد.', data: { id, slug } });
  })
);

router.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const used = (await db
      .prepare('SELECT COUNT(*) as c FROM order_items WHERE product_id = ?')
      .get(id)) as { c: number };
    if (Number(used.c) > 0) {
      throw new AppError('این محصول در سفارش‌ها استفاده شده است؛ به‌جای حذف، آن را غیرفعال کنید.', 409);
    }
    const result = await db.prepare('DELETE FROM products WHERE id = ?').run(id);
    if (result.changes === 0) throw new AppError('محصول یافت نشد.', 404);
    res.json({ success: true, message: 'محصول حذف شد.' });
  })
);

async function saveChildren(
  tx: typeof db,
  productId: number,
  images: { url: string; alt?: string; imageType?: 'main' | 'gallery' }[],
  sizes: { sizeId: number; stock: number }[]
): Promise<void> {
  let order = 0;
  for (const img of images) {
    await tx
      .prepare('INSERT INTO product_images (product_id, url, alt, image_type, sort_order) VALUES (?, ?, ?, ?, ?)')
      .run(productId, img.url, img.alt ?? '', img.imageType ?? 'gallery', order);
    order += 1;
  }
  for (const s of sizes) {
    await tx
      .prepare('INSERT INTO product_sizes (product_id, size_id, stock) VALUES (?, ?, ?)')
      .run(productId, s.sizeId, s.stock);
  }
}

// ============================================================
//  مقالات
// ============================================================
router.get(
  '/articles',
  asyncHandler(async (req, res) => {
    const { limit, offset } = pageParams(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? '').trim();
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (search) {
      conditions.push('(a.title LIKE ? OR a.slug LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await db
      .prepare(`
        SELECT a.id, a.title, a.slug, a.category, a.is_published, a.published_at, a.cover_image,
               f.name as fabric_name
        FROM articles a LEFT JOIN fabrics f ON f.id = a.fabric_id
        ${where}
        ORDER BY a.id DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, limit, offset);

    const countRow = (await db
      .prepare(`SELECT COUNT(*) as count FROM articles a ${where}`)
      .get(...params)) as { count: number };

    res.json({ success: true, data: { articles: rows, total: Number(countRow.count) } });
  })
);

router.get(
  '/articles/:id',
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const article = await db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    if (!article) throw new AppError('مقاله یافت نشد.', 404);
    res.json({ success: true, data: { article } });
  })
);

router.post(
  '/articles',
  asyncHandler(async (req, res) => {
    const body = adminArticleSchema.parse(req.body);
    const slug = await uniqueSlug(body.slug || body.title, 'articles');
    const result = await db
      .prepare(`
        INSERT INTO articles (title, slug, excerpt, content, cover_image, fabric_id, category, is_published, meta_title, meta_description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        body.title,
        slug,
        body.excerpt ?? '',
        body.content ?? '',
        body.coverImage ?? null,
        body.fabricId ?? null,
        body.category ?? 'راهنما',
        body.isPublished ? 1 : 0,
        body.metaTitle ?? null,
        body.metaDescription ?? null
      );
    res.status(201).json({ success: true, message: 'مقاله ساخته شد.', data: { id: Number(result.lastInsertRowid), slug } });
  })
);

router.put(
  '/articles/:id',
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const body = adminArticleSchema.parse(req.body);
    const existing = (await db.prepare('SELECT id FROM articles WHERE id = ?').get(id)) as
      | { id: number }
      | undefined;
    if (!existing) throw new AppError('مقاله یافت نشد.', 404);
    const slug = await uniqueSlug(body.slug || body.title, 'articles', id);

    await db
      .prepare(`
        UPDATE articles SET
          title = ?, slug = ?, excerpt = ?, content = ?, cover_image = ?, fabric_id = ?,
          category = ?, is_published = ?, meta_title = ?, meta_description = ?
        WHERE id = ?
      `)
      .run(
        body.title,
        slug,
        body.excerpt ?? '',
        body.content ?? '',
        body.coverImage ?? null,
        body.fabricId ?? null,
        body.category ?? 'راهنما',
        body.isPublished ? 1 : 0,
        body.metaTitle ?? null,
        body.metaDescription ?? null,
        id
      );

    res.json({ success: true, message: 'مقاله به‌روزرسانی شد.', data: { id, slug } });
  })
);

router.delete(
  '/articles/:id',
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const result = await db.prepare('DELETE FROM articles WHERE id = ?').run(id);
    if (result.changes === 0) throw new AppError('مقاله یافت نشد.', 404);
    res.json({ success: true, message: 'مقاله حذف شد.' });
  })
);

// ============================================================
//  سفارش‌ها
// ============================================================
router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const { limit, offset } = pageParams(req.query as Record<string, unknown>);
    const status = String(req.query.status ?? '').trim();
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await db
      .prepare(`
        SELECT o.id, o.order_number, o.status, o.payment_status, o.total, o.created_at,
               o.receipt_image_url,
               u.full_name, u.phone,
               (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) as item_count
        FROM orders o JOIN users u ON u.id = o.user_id
        ${where}
        ORDER BY o.id DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, limit, offset);

    const countRow = (await db
      .prepare(`SELECT COUNT(*) as count FROM orders o ${where}`)
      .get(...params)) as { count: number };

    res.json({ success: true, data: { orders: rows, total: Number(countRow.count) } });
  })
);

router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const order = await db
      .prepare(`
        SELECT o.*, u.full_name, u.phone, u.email
        FROM orders o JOIN users u ON u.id = o.user_id
        WHERE o.id = ?
      `)
      .get(id);
    if (!order) throw new AppError('سفارش یافت نشد.', 404);

    const items = await db
      .prepare(`
        SELECT oi.*, p.slug as product_slug
        FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
      `)
      .all(id);
    const address = await db.prepare('SELECT * FROM addresses WHERE id = ?').get((order as { address_id: number }).address_id);

    res.json({ success: true, data: { order, items, address } });
  })
);

router.patch(
  '/orders/:id/status',
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const { status } = orderStatusSchema.parse(req.body);
    const result = await db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    if (result.changes === 0) throw new AppError('سفارش یافت نشد.', 404);
    res.json({ success: true, message: 'وضعیت سفارش به‌روزرسانی شد.', data: { id, status } });
  })
);

// تایید یا رد رسید پرداخت
router.patch(
  '/orders/:id/payment',
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const { paymentStatus } = orderPaymentStatusSchema.parse(req.body);

    const order = (await db
      .prepare('SELECT id, receipt_image_url FROM orders WHERE id = ?')
      .get(id)) as { id: number; receipt_image_url: string | null } | undefined;
    if (!order) throw new AppError('سفارش یافت نشد.', 404);

    if (paymentStatus === 'paid' && !order.receipt_image_url) {
      throw new AppError('برای تایید، ابتدا باید مشتری رسید پرداخت را بارگذاری کند.', 400);
    }

    await db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(paymentStatus, id);

    const message = paymentStatus === 'paid' ? 'رسید پرداخت تایید شد.' : 'رسید پرداخت رد شد.';
    res.json({ success: true, message, data: { id, paymentStatus } });
  })
);

// ============================================================
//  کاربران
// ============================================================
router.get(
  '/users',
  asyncHandler(async (_req, res) => {
    const rows = await db
      .prepare(`
        SELECT u.id, u.phone, u.full_name, u.email, u.role, u.created_at,
               (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count,
               (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.user_id = u.id) as total_spent
        FROM users u ORDER BY u.id DESC
      `)
      .all();
    res.json({ success: true, data: rows });
  })
);

// ============================================================
//  تنظیمات فروشگاه (شماره کارت واریز)
// ============================================================
router.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    const [cardNumber, cardHolder] = await Promise.all([getCardNumber(), getCardHolder()]);
    res.json({ success: true, data: { cardNumber, cardHolder } });
  })
);

router.put(
  '/settings',
  asyncHandler(async (req, res) => {
    const { cardNumber, cardHolder } = adminSettingsSchema.parse(req.body);
    await setCardNumber(cardNumber);
    if (cardHolder !== undefined) await setCardHolder(cardHolder);
    const holder = await getCardHolder();
    res.json({ success: true, message: 'تنظیمات ذخیره شد.', data: { cardNumber, cardHolder: holder } });
  })
);

// ============================================================
//  داده‌های کمکی فرم‌ها
// ============================================================
router.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const fabrics = await db.prepare('SELECT id, name, slug FROM fabrics ORDER BY name').all();
    const fits = await db.prepare('SELECT id, name, slug FROM fits ORDER BY id').all();
    const sizes = await db.prepare('SELECT id, code, label FROM sizes ORDER BY code').all();
    res.json({ success: true, data: { fabrics, fits, sizes } });
  })
);

export default router;
