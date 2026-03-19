import * as schemas from './schema';

//not required, but the type of db looks better this way
const dbSchema = {
    ...schemas,
};

// ── Types ─────────────────────────────────────────────────────────────────────
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

type AnyDb = NodePgDatabase<typeof dbSchema> | PostgresJsDatabase<typeof dbSchema>;

// ── Singletons ────────────────────────────────────────────────────────────────
let db: AnyDb;

// pool is only used with node-postgres (local dev); exported for graceful shutdown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let pool: any = null;

/**
 * Returns true when the DB_URL points at a Supabase-hosted database.
 *
 * Supabase uses PgBouncer in Transaction pooling mode which does NOT support
 * the PostgreSQL extended-query protocol (prepared statements). We must use
 * the `postgres` driver with { prepare: false } in that case, regardless of
 * the NODE_ENV (e.g. seeding prod DB from a local dev machine).
 */
function isSupabaseUrl(url: string): boolean {
    return url.includes('supabase.co') || url.includes('supabase.com');
}

export async function getDB(): Promise<AnyDb> {
    if (db) return db;

    const connectionString = process.env.DB_URL as string;
    console.log('DATABASE FOUP:', connectionString);

    if (isSupabaseUrl(connectionString)) {
        // ── Supabase: postgres.js with prepare:false ─────────────────────────
        // Required for Supabase's PgBouncer Transaction pool mode.
        // Works correctly whether NODE_ENV is development or production.
        const { default: postgres } = await import('postgres');
        const { drizzle } = await import('drizzle-orm/postgres-js');

        const client = postgres(connectionString, {
            prepare: false, // must be false for Supabase Transaction pooling
            max: 10,
        });

        db = drizzle(client, { schema: dbSchema });
    } else {
        // ── Local / self-hosted Postgres: node-postgres Pool ─────────────────
        // Standard pg.Pool works fine for Docker/local Postgres.
        const { Pool } = await import('pg');
        const { drizzle } = await import('drizzle-orm/node-postgres');

        pool = new Pool({
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

export { db };
export type DbType = typeof db;