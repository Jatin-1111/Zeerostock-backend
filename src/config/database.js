const { createClient } = require('@supabase/supabase-js');
const { Sequelize } = require('sequelize');
const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

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

// Validate DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
}

// Ensure connection string uses pooler parameters in production
let connectionString = databaseUrl;
if (isProduction && !connectionString.includes('pgbouncer=true')) {
    // Add pgbouncer parameter if not present
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString += `${separator}pgbouncer=true&connection_limit=1`;
    console.log('✓ Added pgbouncer parameters to connection string');
}

// PostgreSQL connection pool for raw queries with positional parameters
const pool = new Pool({
    connectionString,
    ssl: isProduction ? {
        require: true,
        rejectUnauthorized: false
    } : false,
    max: isProduction ? 5 : 10,
    min: 0,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 30000
});

// Sequelize instance for RFQ/Quote models
const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: !isProduction ? console.log : false, // Enable logging in development
    dialectOptions: {
        ssl: isProduction ? {
            require: true,
            rejectUnauthorized: false
        } : false,
        // Force IPv4 to avoid IPv6 connection issues on Render
        family: 4
    },
    pool: {
        max: isProduction ? 5 : 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Test database connection
const testConnection = async () => {
    try {
        // Test PostgreSQL pool
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        console.log('✓ PostgreSQL pool connected successfully');

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

// Query method for raw SQL (uses PostgreSQL positional parameters $1, $2, etc.)
const query = async (sql, params = []) => {
    const result = await pool.query(sql, params);
    return { rows: result.rows };
};

module.exports = { supabase, sequelize, testConnection, query };
