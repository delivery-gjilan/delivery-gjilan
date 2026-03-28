import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDB } from '.';

async function main() {
    console.log('Starting migrations ...');
    const db = await getDB();
    const migrationsFolder = 'database/migrations';

    await migrate(db, { migrationsFolder });
    console.log('Migrated successfully');

    process.exit(0);
}

main().catch((e) => {
    console.error('Migration failed');
    console.error(e);
    process.exit(1);
});
