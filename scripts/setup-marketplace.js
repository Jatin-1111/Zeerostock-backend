/**
 * Marketplace Setup Script
 * Ensures marketplace database schema is properly configured
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupMarketplace() {
    try {
        console.log('🚀 Starting marketplace setup...\n');

        // Read marketplace schema file
        const schemaPath = path.join(__dirname, '../database/marketplace-schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

        console.log('📄 Marketplace schema file loaded');
        console.log('📝 Applying marketplace database schema...\n');

        // Split SQL into statements (basic split on semicolons, can be improved)
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];

            // Skip comments and empty statements
            if (statement.startsWith('--') || !statement.trim()) continue;

            try {
                // Execute each statement
                const { error } = await supabase.rpc('exec', {
                    sql: statement + ';'
                });

                if (error) {
                    console.log(`⚠️  Warning on statement ${i + 1}:`, error.message);
                    errorCount++;
                } else {
                    successCount++;
                }
            } catch (err) {
                console.log(`⚠️  Error on statement ${i + 1}:`, err.message);
                errorCount++;
            }
        }

        console.log(`\n✅ Schema application completed`);
        console.log(`   Successfully executed: ${successCount} statements`);
        if (errorCount > 0) {
            console.log(`   ⚠️  Warnings/Errors: ${errorCount} statements`);
            console.log('   (Some errors are expected for existing tables/columns)\n');
        }

        // Now load seed data
        console.log('\n📦 Loading marketplace seed data...\n');
        const seedPath = path.join(__dirname, '../database/seed-marketplace.sql');
        const seedSQL = fs.readFileSync(seedPath, 'utf8');

        // For seed data, we can try to execute it directly
        console.log('📋 Please manually execute the seed data using Supabase SQL Editor:');
        console.log(`   File: ${seedPath}\n`);

        // Test the connection
        console.log('🔍 Testing database connection...\n');

        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('count', { count: 'exact', head: true });

        if (productsError) {
            console.log('⚠️  Warning: Could not query products table:', productsError.message);
        } else {
            console.log(`✅ Products table exists`);
        }

        const { data: industries, error: industriesError } = await supabase
            .from('industries')
            .select('count', { count: 'exact', head: true });

        if (industriesError) {
            console.log('⚠️  Warning: Industries table may not exist yet');
        } else {
            console.log(`✅ Industries table exists`);
        }

        const { data: categories, error: categoriesError } = await supabase
            .from('categories')
            .select('count', { count: 'exact', head: true });

        if (categoriesError) {
            console.log('⚠️  Warning: Could not query categories table:', categoriesError.message);
        } else {
            console.log(`✅ Categories table exists`);
        }

        console.log('\n🎉 Marketplace setup completed!\n');
        console.log('📋 Next steps:');
        console.log('   1. If seed data is not loaded, execute seed-marketplace.sql in Supabase SQL Editor');
        console.log('   2. Start the backend server: npm start');
        console.log('   3. Test marketplace endpoints: GET /api/marketplace/products\n');

    } catch (error) {
        console.error('❌ Error during marketplace setup:', error);
        process.exit(1);
    }
}

// Run the setup
setupMarketplace()
    .then(() => {
        console.log('✅ Setup script completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Setup script failed:', error);
        process.exit(1);
    });
