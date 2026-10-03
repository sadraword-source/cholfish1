import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { db, withTransaction } from '../db/connection.js';
import { authRequired, AuthenticatedRequest } from '../middlewares/auth.js';
import { orderSchema } from '../utils/validators.js';
import { AppError } from '../middlewares/errorHandler.js';
import { generateOrderNumber } from '../utils/otp.js';
import { getCardNumber, getCardHolder } from '../utils/settings.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authRequired);

interface OrderRow {
  id: number;
  order_number: string;
  user_id: number;
  address_id: number;
  status: string;
  payment_status: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  note: string;
  receipt_image_url: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
//  بارگذاری تصویر رسید پرداخت
// ---------------------------------------------------------------------------
const receiptDir = path.resolve(process.cwd(), 'public', 'uploads', 'receipts');
fs.mkdirSync(receiptDir, { recursive: true });

const ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const RECEIPT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const receiptUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, receiptDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = RECEIPT_EXTENSIONS.includes(ext) ? ext : '.jpg';
      cb(null, `receipt-${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_RECEIPT_TYPES.includes(file.mimetype)) {
      cb(new AppError('فقط تصویر رسید (JPG، PNG، WEBP یا GIF) قابل بارگذاری است.', 400));
      return;
    }
    cb(null, true);
  },
}).single('receipt');

async function orderItemCount(orderId: number): Promise<number> {
  const row = (await db
    .prepare('SELECT SUM(quantity) as q FROM order_items WHERE order_id = ?')
    .get(orderId)) as { q: number | string | null };
  return Number(row.q ?? 0);
}

// GET /api/orders — لیست سفارش‌های کاربر
router.get(
  '/',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const orders = (await db
      .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.user!.id)) as unknown as OrderRow[];

    const result = await Promise.all(
      orders.map(async (o) => ({
        id: o.id,
        orderNumber: o.order_number,
        status: o.status,
        paymentStatus: o.payment_status,
        total: o.total,
        createdAt: o.created_at,
        itemCount: await orderItemCount(o.id),
      }))
    );

    res.json({ success: true, data: result });
  })
);

const ORDER_DETAIL_STATUS_MAP: Record<string, { label: string; step: number }> = {
  registered: { label: 'ثبت سفارش', step: 1 },
  preparing: { label: 'در حال آماده‌سازی', step: 2 },
  shipped_to_post: { label: 'تحویل به پست', step: 3 },
  in_transit: { label: 'در حال ارسال', step: 4 },
  delivered: { label: 'تحویل داده شد', step: 5 },
};

// GET /api/orders/:orderNumber — جزئیات سفارش + Timeline
router.get(
  '/:orderNumber',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const order = (await db
      .prepare('SELECT * FROM orders WHERE order_number = ? AND user_id = ?')
      .get(req.params.orderNumber, req.user!.id)) as unknown as OrderRow | undefined;

    if (!order) throw new AppError('سفارش یافت نشد.', 404);

    const items = await db
      .prepare(`
        SELECT oi.id, oi.product_id, oi.size_id, oi.quantity, oi.unit_price, oi.total_price,
               oi.product_name, oi.size_label, oi.image_url,
               p.slug as product_slug
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
      `)
      .all(order.id);

    const address = await db.prepare('SELECT * FROM addresses WHERE id = ?').get(order.address_id);
    const [cardNumber, cardHolder] = await Promise.all([getCardNumber(), getCardHolder()]);

    res.json({
      success: true,
      data: {
        orderNumber: order.order_number,
        status: order.status,
        statusLabel: ORDER_DETAIL_STATUS_MAP[order.status]?.label ?? order.status,
        currentStep: ORDER_DETAIL_STATUS_MAP[order.status]?.step ?? 1,
        paymentStatus: order.payment_status,
        subtotal: order.subtotal,
        shippingCost: order.shipping_cost,
        total: order.total,
        note: order.note,
        createdAt: order.created_at,
        items,
        address,
        timeline: Object.values(ORDER_DETAIL_STATUS_MAP),
        cardNumber,
        cardHolder,
        receiptImageUrl: order.receipt_image_url ?? null,
      },
    });
  })
);

// POST /api/orders/:orderNumber/receipt — بارگذاری تصویر رسید پرداخت
router.post(
  '/:orderNumber/receipt',
  (req, res, next) => {
    receiptUpload(req, res, (err) => {
      if (err) {
        next(err);
        return;
      }
      next();
    });
  },
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const order = (await db
      .prepare('SELECT id, receipt_image_url FROM orders WHERE order_number = ? AND user_id = ?')
      .get(req.params.orderNumber, req.user!.id)) as
      | { id: number; receipt_image_url: string | null }
      | undefined;

    if (!order) {
      if (req.file) fs.unlink(req.file.path, () => undefined);
      throw new AppError('سفارش یافت نشد.', 404);
    }

    if (!req.file) throw new AppError('تصویری برای بارگذاری انتخاب نشده است.', 400);

    // حذف رسید قبلی (در صورت وجود) تا فایل‌های بی‌استفاده نمانند
    if (order.receipt_image_url && order.receipt_image_url.startsWith('/uploads/')) {
      const oldPath = path.resolve(process.cwd(), 'public', order.receipt_image_url.replace(/^\//, ''));
      fs.unlink(oldPath, () => undefined);
    }

    const receiptImageUrl = `/uploads/receipts/${req.file.filename}`;
    await db
      .prepare("UPDATE orders SET receipt_image_url = ?, payment_status = 'receipt_uploaded' WHERE id = ?")
      .run(receiptImageUrl, order.id);

    res.json({
      success: true,
      message: 'رسید پرداخت با موفقیت بارگذاری شد.',
      data: { receiptImageUrl, paymentStatus: 'receipt_uploaded' },
    });
  })
);

// POST /api/orders — ثبت سفارش (پرداخت آنلاین در نسخه بعدی)
router.post(
  '/',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const body = orderSchema.parse(req.body);
    const cart = (await db
      .prepare('SELECT id FROM carts WHERE user_id = ?')
      .get(req.user!.id)) as { id: number } | undefined;

    if (!cart) throw new AppError('سبد خریدی برای ثبت سفارش وجود ندارد.', 400);

    const cartItems = (await db.prepare(CART_ITEMS).all(cart.id)) as unknown as {
      productId: number;
      sizeId: number;
      quantity: number;
      price: number;
      productName: string;
      sizeLabel: string;
      imageUrl: string | null;
    }[];

    if (cartItems.length === 0) throw new AppError('سبد خرید شما خالی است.', 400);

    // آدرس: یا از آدرس ذخیره شده کاربر یا ثبت آدرس جدید
    let addressId = body.addressId;
    if (!addressId && body.address) {
      const addr = body.address;
      const result = await db
        .prepare(`
          INSERT INTO addresses (user_id, full_name, phone, province, city, address_line, postal_code)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          req.user!.id,
          addr.fullName,
          addr.phone,
          addr.province,
          addr.city,
          addr.addressLine,
          addr.postalCode
        );
      addressId = Number(result.lastInsertRowid);
    }

    if (!addressId) throw new AppError('آدرس دریافت نشد. آدرس را کامل وارد کنید.', 400);

    // اعتبارسنجی اینکه آدرس متعلق به کاربر است
    const addrOwner = await db
      .prepare('SELECT id FROM addresses WHERE id = ? AND user_id = ?')
      .get(addressId, req.user!.id);
    if (!addrOwner) throw new AppError('آدرس نامعتبر است.', 400);

    const subtotal = cartItems.reduce((s, it) => s + it.price * it.quantity, 0);
    const shippingCost = SHIPPING_COST;
    const total = subtotal + shippingCost;
    const orderNumber = generateOrderNumber();

    await withTransaction(async (tx) => {
      const orderResult = await tx
        .prepare(`
          INSERT INTO orders (order_number, user_id, address_id, status, payment_status, subtotal, shipping_cost, total, note)
          VALUES (?, ?, ?, 'registered', 'pending', ?, ?, ?, ?)
        `)
        .run(orderNumber, req.user!.id, addressId, subtotal, shippingCost, total, body.note || '');

      const orderId = Number(orderResult.lastInsertRowid);

      for (const it of cartItems) {
        // کاهش موجودی
        await tx
          .prepare(`
            UPDATE product_sizes SET stock = stock - ?
            WHERE product_id = ? AND size_id = ? AND stock >= ?
          `)
          .run(it.quantity, it.productId, it.sizeId, it.quantity);

        await tx
          .prepare(`
            INSERT INTO order_items (order_id, product_id, size_id, quantity, unit_price, total_price, product_name, size_label, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            orderId,
            it.productId,
            it.sizeId,
            it.quantity,
            it.price,
            it.price * it.quantity,
            it.productName,
            it.sizeLabel,
            it.imageUrl ?? ''
          );
      }

      await tx.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
    });

    res.status(201).json({
      success: true,
      message: 'سفارش شما با موفقیت ثبت شد.',
      data: { orderNumber, status: 'registered', total },
    });
  })
);

const SHIPPING_COST = 50000;
const CART_ITEMS = `
  SELECT ci.product_id as productId, ci.size_id as sizeId, ci.quantity,
         p.price, p.name as productName, p.color,
         s.label as sizeLabel,
         (SELECT pi.url FROM product_images pi
           WHERE pi.product_id = p.id AND pi.image_type = 'main' LIMIT 1) as imageUrl
  FROM cart_items ci
  JOIN products p ON p.id = ci.product_id
  JOIN sizes s ON s.id = ci.size_id
  WHERE ci.cart_id = ?
`;

export default router;
