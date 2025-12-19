/**
 * Migration Script: Create Payments and Invoices Tables
 * 
 * This script creates the payments and invoices tables required for
 * the supplier payment management features.
 * 
 * Run this script with: node scripts/create-payments-invoices-tables.js
 */

const fs = require('fs');
const path = require('path');
const { query } = require('../src/config/database');

async function createPaymentsAndInvoicesTables() {
    try {
        console.log('🚀 Starting migration: Create payments and invoices tables...\n');

        // Read the SQL file
        const sqlPath = path.join(__dirname, '../database/payments-invoices-schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📖 Reading SQL schema file...');
        console.log(`   File: ${sqlPath}\n`);

        // Execute the SQL
        console.log('🔧 Executing SQL migration...');
        await query(sql);

        console.log('✅ Migration completed successfully!\n');

        // Verify tables were created
        console.log('🔍 Verifying table creation...');
        const verifyResult = await query(`
            SELECT 
                table_name,
                (SELECT COUNT(*) FROM information_schema.columns 
                 WHERE table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public' 
            AND table_name IN ('payments', 'invoices')
            ORDER BY table_name;
        `);

        if (verifyResult.rows.length === 2) {
            console.log('\n✅ Tables verified:');
            verifyResult.rows.forEach(row => {
                console.log(`   - ${row.table_name}: ${row.column_count} columns`);
            });
        } else {
            console.log('\n⚠️  Warning: Expected 2 tables, found', verifyResult.rows.length);
        }

        // Check indexes
        const indexResult = await query(`
            SELECT 
                tablename,
                COUNT(*) as index_count
            FROM pg_indexes
            WHERE schemaname = 'public'
            AND tablename IN ('payments', 'invoices')
            GROUP BY tablename
            ORDER BY tablename;
        `);

        if (indexResult.rows.length > 0) {
            console.log('\n✅ Indexes created:');
            indexResult.rows.forEach(row => {
                console.log(`   - ${row.tablename}: ${row.index_count} indexes`);
            });
        }

        console.log('\n✅ All done! Your database is ready for payment and invoice management.\n');

        console.log('📝 Next steps:');
        console.log('   1. Restart your backend server');
        console.log('   2. Test the /api/supplier/payments endpoint');
        console.log('   3. Test the /api/supplier/invoices endpoint\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\nError details:', error);
        process.exit(1);
    }
}

// Run the migration
createPaymentsAndInvoicesTables();
