import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schemas from './schema';

//not required, but the type of db looks better this way
const dbSchema = {
    ...schemas,
};

let db: NodePgDatabase<typeof dbSchema>;
let pool: Pool;

export async function getDB() {
    if (db) {
        return db;
    }

    const connectionString = process.env.DB_URL as string;

    pool = new Pool({
        connectionString,
    });

    db = drizzle(pool, { schema: dbSchema });

    return db;
}

export type DbType = typeof db;
