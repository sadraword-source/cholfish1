import { ensureDatabase, DATABASE_INFO, closePool } from './connection.js';
import { runMigrations } from './schema.js';

async function main(): Promise<void> {
  await ensureDatabase();
  await runMigrations();
  console.log('[migrate] Schema آماده شد.');
  console.log(`[migrate] Database: ${DATABASE_INFO}`);
}

main()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('[migrate] خطا:', err);
    await closePool().catch(() => undefined);
    process.exit(1);
  });
