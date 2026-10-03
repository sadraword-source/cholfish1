import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import mysql, { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import { DatabaseSync } from 'node:sqlite';

dotenv.config();

export type DbDriver = 'sqlite' | 'mysql';

/**
 * انتخاب موتور دیتابیس:
 *   sqlite (پیش‌فرض) → دیتابیس داخلی فایل‌محور، بدون نیاز به سرویس جداگانه (مناسب لوکال)
 *   mysql            → MySQL/MariaDB (مناسب استقرار تولیدی)
 * با متغیر محیطی DB_CLIENT قابل تغییر است.
 */
export const DB_CLIENT: DbDriver = process.env.DB_CLIENT === 'mysql' ? 'mysql' : 'sqlite';

export interface RunResult {
  lastInsertRowid: number;
  changes: number;
}

interface PreparedStatement {
  get<T = Record<string, unknown>>(...params: unknown[]): Promise<T | undefined>;
  all<T = Record<string, unknown>>(...params: unknown[]): Promise<T[]>;
  run(...params: unknown[]): Promise<RunResult>;
}

export interface QueryClient {
  prepare(sql: string): PreparedStatement;
  exec(sql: string): Promise<void>;
}

type Queryable = Pool | PoolConnection;

// ---------------------------------------------------------------------------
//  MySQL
// ---------------------------------------------------------------------------

const DB_NAME = process.env.MYSQL_DATABASE ?? 'sadra';

if (!/^[A-Za-z0-9_]+$/.test(DB_NAME)) {
  throw new Error('نام دیتابیس MySQL نامعتبر است.');
}

const baseConfig = {
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  charset: 'utf8mb4',
  dateStrings: true,
};

let mysqlPool: Pool | null = null;

function getMysqlPool(): Pool {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      ...baseConfig,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT ?? 10),
      queueLimit: 0,
    });
  }
  return mysqlPool;
}

class MysqlClient implements QueryClient {
  constructor(private readonly source: Queryable) {}

  prepare(sql: string): PreparedStatement {
    return {
      get: async <T = Record<string, unknown>>(...params: unknown[]): Promise<T | undefined> => {
        const [rows] = await this.source.query(sql, params);
        return (rows as T[])[0];
      },
      all: async <T = Record<string, unknown>>(...params: unknown[]): Promise<T[]> => {
        const [rows] = await this.source.query(sql, params);
        return rows as T[];
      },
      run: async (...params: unknown[]): Promise<RunResult> => {
        const [result] = await this.source.query<ResultSetHeader>(sql, params);
        return { lastInsertRowid: result.insertId, changes: result.affectedRows };
      },
    };
  }

  async exec(sql: string): Promise<void> {
    await this.source.query(sql);
  }
}

// ---------------------------------------------------------------------------
//  SQLite (node:sqlite — بدون وابستگی بومی)
// ---------------------------------------------------------------------------

type SqliteInput = null | number | bigint | string | NodeJS.ArrayBufferView;

/** فقط مقادیر مجاز SQLite را می‌پذیرد؛ Date و boolean به مقدار سازگار تبدیل می‌شوند. */
function normalizeParam(value: unknown): SqliteInput {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return formatSqliteDate(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value as SqliteInput;
}

function formatSqliteDate(value: Date): string {
  return value.toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:MM:SS (UTC)
}

function resolveSqlitePath(): string {
  const configured = process.env.SQLITE_PATH || path.join('data', 'sadra.db');
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

let sqliteConn: DatabaseSync | null = null;

function getSqlite(): DatabaseSync {
  if (!sqliteConn) {
    const dbPath = resolveSqlitePath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    sqliteConn = new DatabaseSync(dbPath, { enableForeignKeyConstraints: true, timeout: 5000 });
    sqliteConn.exec('PRAGMA journal_mode = WAL;');
  }
  return sqliteConn;
}

class SqliteClient implements QueryClient {
  constructor(private readonly conn: DatabaseSync) {}

  prepare(sql: string): PreparedStatement {
    const statement = this.conn.prepare(sql);
    const bind = (params: unknown[]): SqliteInput[] => params.map(normalizeParam);

    return {
      get: async <T = Record<string, unknown>>(...params: unknown[]): Promise<T | undefined> => {
        return statement.get(...bind(params)) as T | undefined;
      },
      all: async <T = Record<string, unknown>>(...params: unknown[]): Promise<T[]> => {
        return statement.all(...bind(params)) as T[];
      },
      run: async (...params: unknown[]): Promise<RunResult> => {
        const result = statement.run(...bind(params));
        return { lastInsertRowid: Number(result.lastInsertRowid), changes: Number(result.changes) };
      },
    };
  }

  async exec(sql: string): Promise<void> {
    this.conn.exec(sql);
  }
}

// ---------------------------------------------------------------------------
//  کلاینت فعال
// ---------------------------------------------------------------------------

export const db: QueryClient =
  DB_CLIENT === 'mysql' ? new MysqlClient(getMysqlPool()) : new SqliteClient(getSqlite());

export async function withTransaction<T>(fn: (tx: QueryClient) => Promise<T>): Promise<T> {
  if (DB_CLIENT === 'mysql') {
    const connection = await getMysqlPool().getConnection();
    const tx = new MysqlClient(connection);
    try {
      await connection.beginTransaction();
      const result = await fn(tx);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  const conn = getSqlite();
  conn.exec('BEGIN');
  try {
    const result = await fn(new SqliteClient(conn));
    conn.exec('COMMIT');
    return result;
  } catch (err) {
    conn.exec('ROLLBACK');
    throw err;
  }
}

/** آماده‌سازی دیتابیس — برای MySQL دیتابیس را می‌سازد و برای SQLite فایل را باز می‌کند. */
export async function ensureDatabase(): Promise<void> {
  if (DB_CLIENT === 'mysql') {
    const connection = await mysql.createConnection(baseConfig);
    try {
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    } finally {
      await connection.end();
    }
    return;
  }
  getSqlite();
}

export async function closePool(): Promise<void> {
  if (DB_CLIENT === 'mysql') {
    if (mysqlPool) {
      await mysqlPool.end();
      mysqlPool = null;
    }
    return;
  }
  if (sqliteConn) {
    sqliteConn.close();
    sqliteConn = null;
  }
}

export const DATABASE_INFO =
  DB_CLIENT === 'mysql'
    ? `mysql://${baseConfig.user}@${baseConfig.host}:${baseConfig.port}/${DB_NAME}`
    : `sqlite://${resolveSqlitePath()}`;
