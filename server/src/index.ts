import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';
import { runMigrations } from './db/schema.js';
import { ensureDatabase, closePool, DATABASE_INFO } from './db/connection.js';
import { logger, LOGS_DIR } from './utils/logger.js';

const PORT = Number(process.env.PORT) || 4000;

async function start(): Promise<void> {
  await ensureDatabase();
  await runMigrations();

  app.listen(PORT, () => {
    logger.info(`CAVERO API روی پورت ${PORT} در حال اجراست`, { url: `http://localhost:${PORT}` });
    logger.info(`Database: ${DATABASE_INFO}`);
    logger.info(`پوشه لاگ: ${LOGS_DIR}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`دریافت سیگنال ${signal}؛ خاموش‌سازی سرور...`);
  await closePool().catch(() => undefined);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled Rejection', { message: error.message, stack: error.stack });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { message: err.message, stack: err.stack });
});

start().catch(async (err) => {
  const error = err instanceof Error ? err : new Error(String(err));
  logger.error('خطا در راه‌اندازی سرور', { message: error.message, stack: error.stack });
  await closePool().catch(() => undefined);
  process.exit(1);
});
