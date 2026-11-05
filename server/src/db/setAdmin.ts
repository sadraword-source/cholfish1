import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { db, ensureDatabase, closePool } from './connection.js';

// ساخت/به‌روزرسانی حساب مدیر (نام کاربری + رمز عبور) بدون پاک کردن داده‌ها
async function main(): Promise<void> {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const phone = process.env.ADMIN_PHONE || '09120000000';

  await ensureDatabase();

  const hash = bcrypt.hashSync(password, 10);
  const existing = (await db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)) as
    | { id: number }
    | undefined;

  if (existing) {
    await db
      .prepare("UPDATE users SET username = ?, password_hash = ?, role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(username, hash, existing.id);
    console.log(`[admin] حساب مدیر به‌روزرسانی شد (id=${existing.id})`);
  } else {
    const result = await db
      .prepare("INSERT INTO users (phone, username, full_name, password_hash, role) VALUES (?, ?, ?, ?, 'admin')")
      .run(phone, username, 'مدیر CAVERO', hash);
    await db.prepare('INSERT INTO carts (user_id) VALUES (?)').run(Number(result.lastInsertRowid));
    console.log(`[admin] حساب مدیر ساخته شد (id=${result.lastInsertRowid})`);
  }

  console.log('----------------------------------------');
  console.log(`[admin] نام کاربری: ${username}`);
  console.log(`[admin] رمز عبور  : ${password}`);
  console.log(`[admin] آدرس پنل  : /admin`);
  console.log('========================================');
}

main()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('[admin] خطا:', err);
    await closePool().catch(() => undefined);
    process.exit(1);
  });
