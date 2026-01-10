const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listUsers() {
    console.log('\n📋 Fetching all users...\n');

    const { data: users, error } = await supabase
        .from('users')
        .select(`
      id,
      business_email,
      roles,
      active_role,
      created_at
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching users:', error.message);
        return;
    }

    if (!users || users.length === 0) {
        console.log('No users found');
        return;
    }

    console.log(`Found ${users.length} users:\n`);

    users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.business_email}`);
        console.log(`   Roles: ${user.roles ? user.roles.join(', ') : 'none'}`);
        console.log(`   Active: ${user.active_role || 'none'}`);
        console.log(`   ID: ${user.id}`);
        console.log('');
    });
}

listUsers()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error:', err);
        process.exit(1);
    });
