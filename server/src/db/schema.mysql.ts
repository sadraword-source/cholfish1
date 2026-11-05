import { db } from './connection.js';

// ============================================================
//  Schema: CAVERO فروشگاه — MySQL 8 (InnoDB / utf8mb4)
//  تمام دستورات DDL اینجا تعریف می‌شوند
// ============================================================

const migrationStatements: string[] = [
  // ---------------------------------------------------------- users
  `CREATE TABLE IF NOT EXISTS users (
    id            INT NOT NULL AUTO_INCREMENT,
    phone         VARCHAR(20) NOT NULL,
    username      VARCHAR(60) DEFAULT NULL,
    full_name     VARCHAR(150) NOT NULL DEFAULT '',
    email         VARCHAR(190) DEFAULT NULL,
    password_hash VARCHAR(255) DEFAULT NULL,
    role          VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_phone (phone),
    UNIQUE KEY uq_users_username (username)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // مهاجرت برای دیتابیس‌های موجود (اگر ستون username نباشد)
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(60) DEFAULT NULL AFTER phone`,
  `ALTER TABLE users ADD UNIQUE KEY IF NOT EXISTS uq_users_username (username)`,

  // کدهای تأیید (OTP)
  `CREATE TABLE IF NOT EXISTS otp_codes (
    id         INT NOT NULL AUTO_INCREMENT,
    phone      VARCHAR(20) NOT NULL,
    code       VARCHAR(10) NOT NULL,
    purpose    VARCHAR(20) NOT NULL DEFAULT 'login',
    expires_at DATETIME NOT NULL,
    used       TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_otp_phone (phone, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // اندازه‌های بدن کاربر
  `CREATE TABLE IF NOT EXISTS user_measurements (
    id             INT NOT NULL AUTO_INCREMENT,
    user_id        INT NOT NULL,
    height_cm      DOUBLE DEFAULT NULL,
    weight_kg      DOUBLE DEFAULT NULL,
    chest_cm       DOUBLE DEFAULT NULL,
    waist_cm       DOUBLE DEFAULT NULL,
    hip_cm         DOUBLE DEFAULT NULL,
    shoulder_cm    DOUBLE DEFAULT NULL,
    arm_length_cm  DOUBLE DEFAULT NULL,
    suggested_size VARCHAR(10) DEFAULT NULL,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_measurements_user (user_id),
    CONSTRAINT fk_measurements_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // جنس پارچه
  `CREATE TABLE IF NOT EXISTS fabrics (
    id          INT NOT NULL AUTO_INCREMENT,
    name        VARCHAR(150) NOT NULL,
    slug        VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    image_url   VARCHAR(500) DEFAULT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_fabrics_slug (slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // کت‌وشلوار / مدل‌ها (Slim Fit و ...)
  `CREATE TABLE IF NOT EXISTS fits (
    id          INT NOT NULL AUTO_INCREMENT,
    name        VARCHAR(150) NOT NULL,
    slug        VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_fits_slug (slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // محصولات
  `CREATE TABLE IF NOT EXISTS products (
    id               INT NOT NULL AUTO_INCREMENT,
    name             VARCHAR(255) NOT NULL,
    slug             VARCHAR(150) NOT NULL,
    description      TEXT NOT NULL,
    price            INT NOT NULL,
    old_price        INT DEFAULT NULL,
    fabric_id        INT NOT NULL,
    fit_id           INT NOT NULL,
    stitching_type   VARCHAR(100) NOT NULL DEFAULT 'فارسی',
    color            VARCHAR(80) NOT NULL DEFAULT 'مشکی',
    is_featured      TINYINT NOT NULL DEFAULT 0,
    is_active        TINYINT NOT NULL DEFAULT 1,
    meta_title       VARCHAR(255) DEFAULT NULL,
    meta_description TEXT DEFAULT NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_products_slug (slug),
    KEY idx_products_fabric (fabric_id),
    KEY idx_products_fit (fit_id),
    CONSTRAINT fk_products_fabric FOREIGN KEY (fabric_id) REFERENCES fabrics (id),
    CONSTRAINT fk_products_fit FOREIGN KEY (fit_id) REFERENCES fits (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // تصاویر محصول (گالری)
  `CREATE TABLE IF NOT EXISTS product_images (
    id         INT NOT NULL AUTO_INCREMENT,
    product_id INT NOT NULL,
    url        VARCHAR(500) NOT NULL,
    alt        VARCHAR(255) NOT NULL DEFAULT '',
    image_type VARCHAR(20) NOT NULL DEFAULT 'gallery',
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_images_product (product_id),
    CONSTRAINT fk_images_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // سایزهای استاندارد
  `CREATE TABLE IF NOT EXISTS sizes (
    id            INT NOT NULL AUTO_INCREMENT,
    code          VARCHAR(10) NOT NULL,
    label         VARCHAR(50) NOT NULL,
    min_chest_cm  DOUBLE NOT NULL DEFAULT 0,
    max_chest_cm  DOUBLE NOT NULL DEFAULT 0,
    min_waist_cm  DOUBLE NOT NULL DEFAULT 0,
    max_waist_cm  DOUBLE NOT NULL DEFAULT 0,
    min_height_cm DOUBLE NOT NULL DEFAULT 0,
    max_height_cm DOUBLE NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sizes_code (code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // موجودی سایز هر محصول
  `CREATE TABLE IF NOT EXISTS product_sizes (
    id         INT NOT NULL AUTO_INCREMENT,
    product_id INT NOT NULL,
    size_id    INT NOT NULL,
    stock      INT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_size (product_id, size_id),
    KEY idx_product_sizes_size (size_id),
    CONSTRAINT fk_product_sizes_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_product_sizes_size FOREIGN KEY (size_id) REFERENCES sizes (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // مقالات
  `CREATE TABLE IF NOT EXISTS articles (
    id               INT NOT NULL AUTO_INCREMENT,
    title            VARCHAR(255) NOT NULL,
    slug             VARCHAR(150) NOT NULL,
    excerpt          TEXT NOT NULL,
    content          MEDIUMTEXT NOT NULL,
    cover_image      VARCHAR(500) DEFAULT NULL,
    fabric_id        INT DEFAULT NULL,
    category         VARCHAR(80) NOT NULL DEFAULT 'راهنما',
    published_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_published     TINYINT NOT NULL DEFAULT 1,
    meta_title       VARCHAR(255) DEFAULT NULL,
    meta_description TEXT DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_articles_slug (slug),
    KEY idx_articles_fabric (fabric_id),
    CONSTRAINT fk_articles_fabric FOREIGN KEY (fabric_id) REFERENCES fabrics (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // سبد خرید
  `CREATE TABLE IF NOT EXISTS carts (
    id         INT NOT NULL AUTO_INCREMENT,
    user_id    INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_carts_user (user_id),
    CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS cart_items (
    id         INT NOT NULL AUTO_INCREMENT,
    cart_id    INT NOT NULL,
    product_id INT NOT NULL,
    size_id    INT NOT NULL,
    quantity   INT NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_cart_item (cart_id, product_id, size_id),
    KEY idx_cart_items_product (product_id),
    KEY idx_cart_items_size (size_id),
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts (id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_size FOREIGN KEY (size_id) REFERENCES sizes (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // آدرس‌ها
  `CREATE TABLE IF NOT EXISTS addresses (
    id           INT NOT NULL AUTO_INCREMENT,
    user_id      INT NOT NULL,
    full_name    VARCHAR(150) NOT NULL DEFAULT '',
    phone        VARCHAR(20) NOT NULL DEFAULT '',
    province     VARCHAR(100) NOT NULL DEFAULT '',
    city         VARCHAR(100) NOT NULL DEFAULT '',
    address_line VARCHAR(500) NOT NULL DEFAULT '',
    postal_code  VARCHAR(20) NOT NULL DEFAULT '',
    is_default   TINYINT NOT NULL DEFAULT 0,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_addresses_user (user_id),
    CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // سفارش‌ها
  `CREATE TABLE IF NOT EXISTS orders (
    id             INT NOT NULL AUTO_INCREMENT,
    order_number   VARCHAR(50) NOT NULL,
    user_id        INT NOT NULL,
    address_id     INT NOT NULL,
    status         VARCHAR(30) NOT NULL DEFAULT 'registered',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    subtotal       INT NOT NULL DEFAULT 0,
    shipping_cost  INT NOT NULL DEFAULT 0,
    total          INT NOT NULL DEFAULT 0,
    note           TEXT NOT NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_orders_number (order_number),
    KEY idx_orders_user (user_id),
    KEY idx_orders_address (address_id),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_orders_address FOREIGN KEY (address_id) REFERENCES addresses (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS order_items (
    id           INT NOT NULL AUTO_INCREMENT,
    order_id     INT NOT NULL,
    product_id   INT NOT NULL,
    size_id      INT NOT NULL,
    quantity     INT NOT NULL DEFAULT 1,
    unit_price   INT NOT NULL DEFAULT 0,
    total_price  INT NOT NULL DEFAULT 0,
    product_name VARCHAR(255) NOT NULL DEFAULT '',
    size_label   VARCHAR(50) NOT NULL DEFAULT '',
    image_url    VARCHAR(500) NOT NULL DEFAULT '',
    PRIMARY KEY (id),
    KEY idx_order_items_order (order_id),
    KEY idx_order_items_product (product_id),
    KEY idx_order_items_size (size_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_order_items_size FOREIGN KEY (size_id) REFERENCES sizes (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // مهاجرت برای دیتابیس‌های موجود: ستون رسید پرداخت
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_image_url VARCHAR(500) DEFAULT NULL`,

  // تنظیمات فروشگاه (کلید/مقدار) — مثل شماره کارت برای واریز
  `CREATE TABLE IF NOT EXISTS settings (
    setting_key   VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    PRIMARY KEY (setting_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // نظرات و امتیاز کاربران
  `CREATE TABLE IF NOT EXISTS reviews (
    id         INT NOT NULL AUTO_INCREMENT,
    product_id INT NOT NULL,
    user_id    INT NOT NULL,
    rating     TINYINT NOT NULL DEFAULT 5,
    comment    TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_reviews_product_user (product_id, user_id),
    KEY idx_reviews_product (product_id),
    CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // خلاصه‌ی هوشمند نظرات (کش)
  `CREATE TABLE IF NOT EXISTS review_summaries (
    product_id   INT NOT NULL,
    summary      TEXT NOT NULL,
    review_count INT NOT NULL DEFAULT 0,
    avg_rating   DOUBLE NOT NULL DEFAULT 0,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id),
    CONSTRAINT fk_review_summaries_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
];

export async function runMigrations(): Promise<void> {
  for (const statement of migrationStatements) {
    await db.exec(statement);
  }
}
