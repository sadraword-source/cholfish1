import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';
import { runMigrations } from './db/schema.js';
import { ensureDatabase, closePool, DATABASE_INFO } from './db/connection.js';

const PORT = Number(process.env.PORT) || 4000;

async function start(): Promise<void> {
  await ensureDatabase();
  await runMigrations();

  app.listen(PORT, () => {
    console.log(`[server] چولفیش کت API روی پورت ${PORT} در حال اجراست`);
    console.log(`[server] http://localhost:${PORT}`);
    console.log(`[server] Database: ${DATABASE_INFO}`);
  });
}

async function shutdown(): Promise<void> {
  await closePool().catch(() => undefined);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch(async (err) => {
  console.error('[server] خطا در راه‌اندازی:', err);
  await closePool().catch(() => undefined);
  process.exit(1);
});
