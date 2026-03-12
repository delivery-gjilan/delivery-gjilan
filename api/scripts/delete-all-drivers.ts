import pkg from 'pg';
const { Client } = pkg;

async function main() {
    const client = new Client({
        connectionString: process.env.DB_URL,
    });

    await client.connect();
    console.log('Deleting all drivers...');

    // Deleting from users where role = DRIVER
    // drivers rows are cascade-deleted via FK
    // orders.driver_id is set to NULL via FK onDelete: set null
    const result = await client.query(`DELETE FROM users WHERE role = 'DRIVER'`);

    console.log(`✅ Deleted ${result.rowCount} driver(s)`);
    await client.end();
    process.exit(0);
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
