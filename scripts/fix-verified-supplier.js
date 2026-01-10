const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixVerifiedSupplier(userEmail) {
    console.log(`\n🔍 Checking verification status for: ${userEmail}\n`);

    // 1. Get user
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('business_email', userEmail)
        .single();

    if (userError || !user) {
        console.error('❌ User not found');
        return;
    }

    console.log('✅ User found:', user.business_email);
    console.log('📋 Current roles:', user.roles || []);
    console.log('🎯 Active role:', user.active_role);

    // 2. Check supplier_verifications table
    const { data: verification, error: verificationError } = await supabase
        .from('supplier_verifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (verificationError) {
        console.log('\n⚠️ No supplier verification found in supplier_verifications table');
    } else {
        console.log('\n📝 Supplier Verification Status:', verification.status);
        console.log('📅 Submitted at:', verification.created_at);
        if (verification.verified_at) {
            console.log('✅ Verified at:', verification.verified_at);
        }
    }

    // 3. Check supplier_profiles table
    const { data: profile, error: profileError } = await supabase
        .from('supplier_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (profileError) {
        console.log('\n⚠️ No supplier profile found');
    } else {
        console.log('\n👤 Supplier Profile Status:', profile.verification_status);
    }

    // 4. Fix the issue if verification is approved but role not added
    if (verification && verification.status === 'verified' && profile && profile.verification_status === 'verified') {
        const currentRoles = user.roles || [];

        if (!currentRoles.includes('supplier')) {
            console.log('\n🔧 ISSUE DETECTED: Verification is approved but supplier role not in users.roles array');
            console.log('🔨 Adding supplier role...');

            // Add supplier to roles array
            const newRoles = [...currentRoles, 'supplier'];

            const { error: updateError } = await supabase
                .from('users')
                .update({
                    roles: newRoles,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) {
                console.error('❌ Failed to update roles:', updateError.message);
            } else {
                console.log('✅ Successfully added supplier role to user');
                console.log('📋 New roles:', newRoles);
            }
        } else {
            console.log('\n✅ User already has supplier role in array');
        }
    } else if (verification && verification.status !== 'verified') {
        console.log(`\n⚠️ Verification status is: ${verification.status}`);
        console.log('💡 The verification needs to be approved by an admin first');
    } else if (!verification) {
        console.log('\n⚠️ No verification request found');
        console.log('💡 User needs to submit a supplier verification request');
    }

    console.log('\n✅ Check complete!\n');
}

// Get email from command line argument
const userEmail = process.argv[2];

if (!userEmail) {
    console.log('Usage: node fix-verified-supplier.js <user-email>');
    console.log('Example: node fix-verified-supplier.js user@example.com');
    process.exit(1);
}

fixVerifiedSupplier(userEmail)
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error:', err);
        process.exit(1);
    });
