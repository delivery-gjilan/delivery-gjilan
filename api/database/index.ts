import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import postgres from 'postgres';
import * as schemas from './schema';

// not required, but the type of db looks better this way
const dbSchema = {
  ...schemas,
};

let db: NodePgDatabase<typeof dbSchema>;

export async function getDB() {
  if (db) return db;

  const connectionString = process.env.DB_URL as string;
  if (!connectionString) {
    throw new Error('DB_URL is not defined in environment variables!');
  }

  // Detect Supabase URL
  if (connectionString.includes('supabase')) {
    // Supabase recommended setup
    const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });
    db = drizzle(client, { schema: dbSchema });
  } else {
    // Local Postgres
    const { Pool } = await import('pg'); // dynamic import to avoid clash with postgres-js
    const pool = new Pool({
      connectionString,
      max: 20,
      min: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    db = drizzle(pool, { schema: dbSchema });
  }

  return db;
}

// Export types only
export type DbType = typeof db;
export type Database = NodePgDatabase<typeof dbSchema>;