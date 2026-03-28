const pkg = require('pg');

console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
const client = new pkg.Client();

client.connect()
  .then(() => {
    console.log('Connected to database...');
    return client.query(`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS battery_level integer,
        ADD COLUMN IF NOT EXISTS battery_opt_in boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS battery_updated_at timestamptz,
        ADD COLUMN IF NOT EXISTS is_charging boolean;
    `);
  })
  .then(() => {
    console.log('✓ Battery columns added successfully');
    return client.end();
  })
 .catch(err => {
    console.error('✗ Migration error:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  });
