import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

async function main() {
    const pool = new pg.Pool({
        connectionString: process.env.DB_URL,
    });

    const db = drizzle(pool);

    // Direct SQL query to check device tokens
    const result = await pool.query('SELECT * FROM device_tokens ORDER BY created_at DESC LIMIT 10');
    
    console.log('\n========================================');
    console.log('  DEVICE TOKENS CHECK');
    console.log('========================================');
    console.log(`Total tokens found: ${result.rows.length}`);
    
    if (result.rows.length === 0) {
        console.log('\n❌ NO DEVICE TOKENS IN DATABASE!');
        console.log('The mobile app has NOT registered any push token.');
        console.log('\nPossible causes:');
        console.log('  1. Token registration mutation failed');
        console.log('  2. User is not authenticated when registering');
        console.log('  3. The registerDeviceToken mutation was never called');
    } else {
        for (const row of result.rows) {
            console.log('\n---');
            console.log(`  ID:       ${row.id}`);
            console.log(`  User ID:  ${row.user_id}`);
            console.log(`  Platform: ${row.platform}`);
            console.log(`  App Type: ${row.app_type}`);
            console.log(`  Device:   ${row.device_id}`);
            console.log(`  Token:    ${String(row.token).substring(0, 50)}...`);
            console.log(`  Created:  ${row.created_at}`);
            console.log(`  Updated:  ${row.updated_at}`);
        }
    }

    console.log('\n========================================\n');

    await pool.end();
    process.exit(0);
}

main().catch((err) => {
    console.error('Script error:', err);
    process.exit(1);
});
