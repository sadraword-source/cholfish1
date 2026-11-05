import { db } from './connection.js';

// ============================================================
//  Schema: CAVERO فروشگاه — SQLite (دیتابیس داخلی لوکال)
//  همان ساختار MySQL؛ برای استقرار تولیدی می‌توان از DB_CLIENT=mysql استفاده کرد.
//  همه دستورات idempotent هستند (CREATE ... IF NOT EXISTS).
// ============================================================

const migrationStatements: string[] = [
  // ---------------------------------------------------------- users
  `CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    phone         TEXT NOT NULL UNIQUE,
    username      TEXT DEFAULT NULL UNIQUE,
    full_name     TEXT NOT NULL DEFAULT '',
    email         TEXT DEFAULT NULL,
    password_hash TEXT DEFAULT NULL,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // کدهای تأیید (OTP)
  `CREATE TABLE IF NOT EXISTS otp_codes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    phone      TEXT NOT NULL,
    code       TEXT NOT NULL,
    purpose    TEXT NOT NULL DEFAULT 'login' CHECK (purpose IN ('login', 'register')),
    expires_at TEXT NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes (phone, created_at)`,

  // اندازه‌های بدن کاربر
  `CREATE TABLE IF NOT EXISTS user_measurements (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    height_cm      REAL,
    weight_kg      REAL,
    chest_cm       REAL,
    waist_cm       REAL,
    hip_cm         REAL,
    shoulder_cm    REAL,
    arm_length_cm  REAL,
    suggested_size TEXT,
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // جنس پارچه
  `CREATE TABLE IF NOT EXISTS fabrics (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    image_url   TEXT DEFAULT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // کت‌وشلوار / مدل‌ها
  `CREATE TABLE IF NOT EXISTS fits (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT ''
  )`,

  // محصولات
  `CREATE TABLE IF NOT EXISTS products (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    description     TEXT NOT NULL DEFAULT '',
    price           INTEGER NOT NULL,
    old_price       INTEGER DEFAULT NULL,
    fabric_id       INTEGER NOT NULL REFERENCES fabrics(id),
    fit_id          INTEGER NOT NULL REFERENCES fits(id),
    stitching_type  TEXT NOT NULL DEFAULT 'فارسی',
    color           TEXT NOT NULL DEFAULT 'مشکی',
    is_featured     INTEGER NOT NULL DEFAULT 0,
    is_active       INTEGER NOT NULL DEFAULT 1,
    meta_title      TEXT DEFAULT NULL,
    meta_description TEXT DEFAULT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // تصاویر محصول (گالری)
  `CREATE TABLE IF NOT EXISTS product_images (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    alt        TEXT NOT NULL DEFAULT '',
    image_type TEXT NOT NULL DEFAULT 'gallery' CHECK (image_type IN ('main', 'gallery')),
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,

  // سایزهای استاندارد
  `CREATE TABLE IF NOT EXISTS sizes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    code          TEXT NOT NULL UNIQUE,
    label         TEXT NOT NULL,
    min_chest_cm  REAL NOT NULL DEFAULT 0,
    max_chest_cm  REAL NOT NULL DEFAULT 0,
    min_waist_cm  REAL NOT NULL DEFAULT 0,
    max_waist_cm  REAL NOT NULL DEFAULT 0,
    min_height_cm REAL NOT NULL DEFAULT 0,
    max_height_cm REAL NOT NULL DEFAULT 0
  )`,

  // موجودی سایز هر محصول
  `CREATE TABLE IF NOT EXISTS product_sizes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size_id    INTEGER NOT NULL REFERENCES sizes(id),
    stock      INTEGER NOT NULL DEFAULT 0,
    UNIQUE (product_id, size_id)
  )`,

  // مقالات
  `CREATE TABLE IF NOT EXISTS articles (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    title            TEXT NOT NULL,
    slug             TEXT NOT NULL UNIQUE,
    excerpt          TEXT NOT NULL DEFAULT '',
    content          TEXT NOT NULL DEFAULT '',
    cover_image      TEXT DEFAULT NULL,
    fabric_id        INTEGER DEFAULT NULL REFERENCES fabrics(id),
    category         TEXT NOT NULL DEFAULT 'راهنما',
    published_at     TEXT NOT NULL DEFAULT (datetime('now')),
    is_published     INTEGER NOT NULL DEFAULT 1,
    meta_title       TEXT DEFAULT NULL,
    meta_description TEXT DEFAULT NULL
  )`,

  // سبد خرید
  `CREATE TABLE IF NOT EXISTS carts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS cart_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_id    INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size_id    INTEGER NOT NULL REFERENCES sizes(id),
    quantity   INTEGER NOT NULL DEFAULT 1,
    UNIQUE (cart_id, product_id, size_id)
  )`,

  // آدرس‌ها
  `CREATE TABLE IF NOT EXISTS addresses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name    TEXT NOT NULL DEFAULT '',
    phone        TEXT NOT NULL DEFAULT '',
    province     TEXT NOT NULL DEFAULT '',
    city         TEXT NOT NULL DEFAULT '',
    address_line TEXT NOT NULL DEFAULT '',
    postal_code  TEXT NOT NULL DEFAULT '',
    is_default   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // سفارش‌ها
  `CREATE TABLE IF NOT EXISTS orders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number   TEXT NOT NULL UNIQUE,
    user_id        INTEGER NOT NULL REFERENCES users(id),
    address_id     INTEGER NOT NULL REFERENCES addresses(id),
    status         TEXT NOT NULL DEFAULT 'registered'
                    CHECK (status IN ('registered', 'preparing', 'shipped_to_post', 'in_transit', 'delivered')),
    payment_status TEXT NOT NULL DEFAULT 'pending',
    subtotal       INTEGER NOT NULL DEFAULT 0,
    shipping_cost  INTEGER NOT NULL DEFAULT 0,
    total          INTEGER NOT NULL DEFAULT 0,
    note           TEXT NOT NULL DEFAULT '',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS order_items (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id    INTEGER NOT NULL REFERENCES products(id),
    size_id       INTEGER NOT NULL REFERENCES sizes(id),
    quantity      INTEGER NOT NULL DEFAULT 1,
    unit_price    INTEGER NOT NULL DEFAULT 0,
    total_price   INTEGER NOT NULL DEFAULT 0,
    product_name  TEXT NOT NULL DEFAULT '',
    size_label    TEXT NOT NULL DEFAULT '',
    image_url     TEXT NOT NULL DEFAULT ''
  )`,

  // تنظیمات فروشگاه (کلید/مقدار) — مثل شماره کارت برای واریز
  `CREATE TABLE IF NOT EXISTS settings (
    setting_key   TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL DEFAULT ''
  )`,

  // نظرات و امتیاز کاربران
  `CREATE TABLE IF NOT EXISTS reviews (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating     INTEGER NOT NULL DEFAULT 5,
    comment    TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (product_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id, created_at DESC)`,

  // خلاصه‌ی هوشمند نظرات (کش)
  `CREATE TABLE IF NOT EXISTS review_summaries (
    product_id   INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    summary      TEXT NOT NULL DEFAULT '',
    review_count INTEGER NOT NULL DEFAULT 0,
    avg_rating   REAL NOT NULL DEFAULT 0,
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

/** مهاجرت دیتابیس‌های قدیمی‌تر که ستون username ندارند. */
async function ensureUsernameColumn(): Promise<void> {
  const columns = (await db
    .prepare("SELECT name FROM pragma_table_info('users')")
    .all()) as { name: string }[];

  if (!columns.some((c) => c.name === 'username')) {
    await db.exec('ALTER TABLE users ADD COLUMN username TEXT');
  }
  await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON users (username)');
}

/** مهاجرت دیتابیس‌های قدیمی‌تر که ستون رسید پرداخت ندارند. */
async function ensureOrderReceiptColumn(): Promise<void> {
  const columns = (await db
    .prepare("SELECT name FROM pragma_table_info('orders')")
    .all()) as { name: string }[];

  if (!columns.some((c) => c.name === 'receipt_image_url')) {
    await db.exec('ALTER TABLE orders ADD COLUMN receipt_image_url TEXT');
  }
}

export async function runMigrations(): Promise<void> {
  for (const statement of migrationStatements) {
    await db.exec(statement);
  }
  await ensureUsernameColumn();
  await ensureOrderReceiptColumn();
}
