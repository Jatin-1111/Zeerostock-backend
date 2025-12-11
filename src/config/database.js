const { createClient } = require('@supabase/supabase-js');
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
        return true;
    } catch (error) {
        console.error('Database connection failed:', error.message);
        return false;
    }
};

module.exports = { supabase, testConnection };
