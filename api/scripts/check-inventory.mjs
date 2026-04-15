import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DB_URL });

try {
    const biz = await pool.query('SELECT id, name, business_type FROM businesses WHERE is_deleted = false ORDER BY created_at');
    console.log('\n=== Businesses ===');
    biz.rows.forEach(b => console.log(b.id, '|', b.name, '|', b.business_type));

    const inv = await pool.query('SELECT business_id, COUNT(*) as cnt FROM personal_inventory GROUP BY business_id');
    console.log('\n=== Inventory rows by business_id ===');
    inv.rows.forEach(r => console.log(r.business_id, '| rows:', r.cnt));

    const settings = await pool.query("SELECT inventory_mode_enabled FROM store_settings WHERE id = 'default'");
    console.log('\n=== Store Settings ===');
    console.log('inventoryModeEnabled:', settings.rows[0]?.inventory_mode_enabled);

    // Check most recent orders and their inventory data
    const recent = await pool.query(`
        SELECT o.id, o.display_id, o.business_id, o.inventory_price,
               b.name as business_name,
               (SELECT COUNT(*) FROM order_coverage_logs ocl WHERE ocl.order_id = o.id) as coverage_logs,
               (SELECT SUM(oi.inventory_quantity) FROM order_items oi WHERE oi.order_id = o.id) as total_inv_qty
        FROM orders o
        JOIN businesses b ON b.id = o.business_id
        ORDER BY o.created_at DESC LIMIT 5
    `);
    console.log('\n=== Recent Orders ===');
    recent.rows.forEach(r => console.log(
        r.display_id, '| biz:', r.business_name, '| inv_price:', r.inventory_price,
        '| coverage_logs:', r.coverage_logs, '| total_inv_qty:', r.total_inv_qty
    ));
} finally {
    await pool.end();
}
