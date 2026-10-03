import { DB_CLIENT } from './connection.js';
import { runMigrations as runMysqlMigrations } from './schema.mysql.js';
import { runMigrations as runSqliteMigrations } from './schema.sqlite.js';
import { ensureSettingsDefaults } from '../utils/settings.js';

/** اجرای مهاجرت‌ها بر اساس موتور دیتابیس فعال. */
export async function runMigrations(): Promise<void> {
  if (DB_CLIENT === 'mysql') {
    await runMysqlMigrations();
  } else {
    await runSqliteMigrations();
  }
  await ensureSettingsDefaults();
}
