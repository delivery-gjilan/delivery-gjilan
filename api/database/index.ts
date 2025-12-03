import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schemas from './schema';

//not required, but the type of db looks better this way
const dbSchema = {
    ...schemas,
};

let db: NodePgDatabase<typeof dbSchema>;

export async function getDB() {
    if (db) {
        return db;
    }

    const connectionString = process.env.DB_URL as string;

    db = drizzle(connectionString, { schema: dbSchema });

    return db;
}

export type DbType = typeof db;
