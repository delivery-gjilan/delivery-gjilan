require('dotenv/config');
const { Client } = require('pg');

async function createBannersTable() {
    const client = new Client({
        connectionString: process.env.DB_URL
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const query = `
            CREATE TABLE IF NOT EXISTS banners (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                title text,
                subtitle text,
                image_url text NOT NULL,
                link_type text,
                link_target text,
                sort_order integer DEFAULT 0 NOT NULL,
                is_active boolean DEFAULT true NOT NULL,
                created_at timestamp with time zone DEFAULT now() NOT NULL,
                updated_at timestamp with time zone DEFAULT now() NOT NULL
            );
        `;

        await client.query(query);
        console.log('✓ Banners table created successfully');

        await client.end();
    } catch (error) {
        console.error('Error creating banners table:', error);
        process.exit(1);
    }
}

createBannersTable();
