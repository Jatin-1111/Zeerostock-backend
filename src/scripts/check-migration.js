const { pool } = require('../config/database');

async function check() {
    try {
        const { rows } = await pool.query('SELECT count(*) FROM admins');
        console.log('Admins count:', rows[0].count);
    } catch (e) {
        console.error('Check failed:', e.message);
    } finally {
        pool.end();
    }
}
check();
