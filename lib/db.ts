import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'lumina.db');

const globalForDb = global as unknown as {
  db: Database.Database | undefined;
};

export const db = globalForDb.db ?? new Database(dbPath);

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}

export default db;
