import pkg from 'pg';
const { Client } = pkg;

async function main() {
    const client = new Client({
        connectionString: process.env.DB_URL,
    });

    await client.connect();
    console.log('Deleting all device tokens...');
    
    const result = await client.query('DELETE FROM device_tokens');
    
    console.log(`✅ Deleted ${result.rowCount} device tokens`);
    await client.end();
    process.exit(0);
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
