const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS featured_sort_order integer NOT NULL DEFAULT 0;
`)
  .then(() => { console.log('Migration done: is_featured, featured_sort_order added'); pool.end(); })
  .catch(e => { console.error('Migration failed:', e.message); pool.end(); process.exit(1); });
