import { Router } from 'express';
import { db } from '../db/connection.js';
import { authRequired, AuthenticatedRequest } from '../middlewares/auth.js';
import { cartItemSchema, cartUpdateSchema } from '../utils/validators.js';
import { AppError } from '../middlewares/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authRequired);

async function getCart(userId: number): Promise<number> {
  const cart = (await db.prepare('SELECT id FROM carts WHERE user_id = ?').get(userId)) as
    | { id: number }
    | undefined;
  if (cart) return cart.id;

  const result = await db.prepare('INSERT INTO carts (user_id) VALUES (?)').run(userId);
  return Number(result.lastInsertRowid);
}

async function cartSummary(cartId: number) {
  const items = (await db.prepare(CART_ITEM_SELECT).all(cartId)) as unknown as {
    price: number;
    quantity: number;
  }[];
  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  return { subtotal, count: items.reduce((s, it) => s + it.quantity, 0) };
}

const CART_ITEM_SELECT = `
  SELECT ci.id, ci.product_id as productId, ci.size_id as sizeId, ci.quantity,
         p.name as productName, p.slug as productSlug, p.price, p.color,
         s.code as sizeCode, s.label as sizeLabel,
         (SELECT pi.url FROM product_images pi
           WHERE pi.product_id = p.id AND pi.image_type = 'main' LIMIT 1) as imageUrl
  FROM cart_items ci
  JOIN products p ON p.id = ci.product_id
  JOIN sizes s ON s.id = ci.size_id
  WHERE ci.cart_id = ?
  ORDER BY ci.id
`;

// GET /api/cart
router.get(
  '/',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const cartId = await getCart(req.user!.id);
    const items = (await db.prepare(CART_ITEM_SELECT).all(cartId)) as unknown as {
      id: number;
      productId: number;
      sizeId: number;
      quantity: number;
      productName: string;
      productSlug: string;
      price: number;
      color: string;
      sizeCode: string;
      sizeLabel: string;
      imageUrl: string | null;
    }[];

    const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

    res.json({
      success: true,
      data: {
        items: items.map((it) => ({ ...it, lineTotal: it.price * it.quantity })),
        subtotal,
        count: items.reduce((s, it) => s + it.quantity, 0),
      },
    });
  })
);

// POST /api/cart/items — افزودن به سبد
router.post(
  '/items',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const { productId, sizeId, quantity } = cartItemSchema.parse(req.body);
    const cartId = await getCart(req.user!.id);

    // بررسی موجود بودن سایز و محصول
    const availability = (await db
      .prepare(`
        SELECT ps.stock, p.is_active
        FROM product_sizes ps
        JOIN products p ON p.id = ps.product_id
        WHERE ps.product_id = ? AND ps.size_id = ? AND p.is_active = 1
      `)
      .get(productId, sizeId)) as { stock: number; is_active: number } | undefined;

    if (!availability) {
      throw new AppError('این سایز برای این محصول موجود نیست.', 400);
    }

    const existing = (await db
      .prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND size_id = ?')
      .get(cartId, productId, sizeId)) as { id: number; quantity: number } | undefined;

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > availability.stock) {
        throw new AppError(`موجودی این سایز فقط ${availability.stock} عدد است.`, 400);
      }
      await db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
    } else {
      if (quantity > availability.stock) {
        throw new AppError(`موجودی این سایز فقط ${availability.stock} عدد است.`, 400);
      }
      await db
        .prepare('INSERT INTO cart_items (cart_id, product_id, size_id, quantity) VALUES (?, ?, ?, ?)')
        .run(cartId, productId, sizeId, quantity);
    }

    const summary = await cartSummary(cartId);
    res.json({
      success: true,
      message: 'به سبد خرید اضافه شد.',
      data: summary,
    });
  })
);

// PATCH /api/cart/items/:id — تغییر تعداد
router.patch(
  '/items/:id',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const { quantity } = cartUpdateSchema.parse(req.body);
    const cartId = await getCart(req.user!.id);

    const item = (await db
      .prepare('SELECT ci.*, ps.stock FROM cart_items ci JOIN product_sizes ps ON ps.product_id=ci.product_id AND ps.size_id=ci.size_id WHERE ci.id = ? AND ci.cart_id = ?')
      .get(Number(req.params.id), cartId)) as { id: number; stock: number } | undefined;

    if (!item) throw new AppError('موردی در سبد خرید یافت نشد.', 404);
    if (quantity > item.stock) {
      throw new AppError(`موجودی این سایز فقط ${item.stock} عدد است.`, 400);
    }

    await db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, item.id);

    const summary = await cartSummary(cartId);
    res.json({ success: true, data: summary });
  })
);

// DELETE /api/cart/items/:id — حذف از سبد
router.delete(
  '/items/:id',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const cartId = await getCart(req.user!.id);
    const result = await db
      .prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?')
      .run(Number(req.params.id), cartId);

    if (result.changes === 0) throw new AppError('موردی در سبد خرید یافت نشد.', 404);

    const summary = await cartSummary(cartId);
    res.json({
      success: true,
      message: 'از سبد خرید حذف شد.',
      data: summary,
    });
  })
);

// DELETE /api/cart — خالی کردن سبد
router.delete(
  '/',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const cartId = await getCart(req.user!.id);
    await db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cartId);
    res.json({ success: true, message: 'سبد خرید خالی شد.' });
  })
);

export default router;
