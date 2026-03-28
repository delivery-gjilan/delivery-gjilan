import pkg from 'pg';
const { Client } = pkg;

async function main() {
    const client = new Client({
        connectionString: process.env.DB_URL,
    });

    await client.connect();
    
    const result = await client.query(`
        SELECT id, user_id, platform, app_type, 
               substring(token, 1, 50) as token_preview,
               length(token) as token_length,
               created_at
        FROM device_tokens 
        ORDER BY created_at DESC
    `);
    
    console.log('Device tokens in database:');
    console.table(result.rows);
    
    await client.end();
    process.exit(0);
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
