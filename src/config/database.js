const { createClient } = require('@supabase/supabase-js');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Supabase Client for PostgreSQL
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Sequelize instance for RFQ/Quote models
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false, // Set to console.log to see SQL queries
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Test database connection
const testConnection = async () => {
    try {
        // Test Supabase client
        const { data, error } = await supabase.from('users').select('count').limit(1);
        if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist yet
            console.error('Database connection error:', error);
            return false;
        }
        console.log('✓ PostgreSQL (Supabase) connected successfully');

        // Test Sequelize connection
        await sequelize.authenticate();
        console.log('✓ Sequelize ORM connected successfully');

        return true;
    } catch (error) {
        console.error('Database connection failed:', error.message);
        return false;
    }
};

// Query method for raw SQL (uses Sequelize with PostgreSQL bind parameters)
const query = async (sql, params = []) => {
    const [results, metadata] = await sequelize.query(sql, {
        bind: params,
        type: sequelize.QueryTypes.RAW
    });
    return { rows: results };
};

module.exports = { supabase, sequelize, testConnection, query };
