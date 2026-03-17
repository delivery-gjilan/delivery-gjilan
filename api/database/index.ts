import * as schemas from './schema';

const dbSchema = {
  ...schemas,
};

let db: any; // important to avoid breaking types everywhere

export async function getDB() {
  if (db) return db;

  const connectionString = process.env.DB_URL as string;
  if (!connectionString) throw new Error('DB_URL missing');

  if (connectionString.includes('supabase')) {
    // ✅ Supabase (postgres-js)
    const postgres = (await import('postgres')).default;
    const { drizzle } = await import('drizzle-orm/postgres-js');

    const client = postgres(connectionString, {
      prepare: false,
      ssl: { rejectUnauthorized: false },
    });

    db = drizzle(client, { schema: dbSchema });
  } else {
    // ✅ Local Postgres (pg)
    const { Pool } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');

    const pool = new Pool({
      connectionString,
    });

    db = drizzle(pool, { schema: dbSchema });
  }

  return db;
}

// ✅ EXPORT DB (you were missing this before)
export { db };

export type DbType = typeof db;
export type Database = NodePgDatabase<typeof dbSchema>;