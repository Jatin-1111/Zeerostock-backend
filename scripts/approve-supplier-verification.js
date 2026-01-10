const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function approveSupplierVerification(userEmail) {
    console.log(`\n🔍 Processing supplier verification for: ${userEmail}\n`);

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

    // 2. Get supplier verification
    const { data: verification, error: verificationError } = await supabase
        .from('supplier_verifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (verificationError || !verification) {
        console.error('❌ No supplier verification found');
        return;
    }

    console.log('📝 Current verification status:', verification.verification_status || 'undefined');

    // 3. Update supplier_verifications to verified status
    console.log('\n🔨 Updating supplier_verifications status to verified...');
    const { error: updateVerificationError } = await supabase
        .from('supplier_verifications')
        .update({
            verification_status: 'verified',
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', verification.id);

    if (updateVerificationError) {
        console.error('❌ Failed to update verification:', updateVerificationError.message);
        return;
    }
    console.log('✅ Verification status updated to verified');

    // 4. Check if supplier_profiles exists
    const { data: profile, error: profileError } = await supabase
        .from('supplier_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (profileError || !profile) {
        console.log('\n🔨 Creating supplier_profile...');

        const { error: createProfileError } = await supabase
            .from('supplier_profiles')
            .insert({
                user_id: user.id,
                business_name: verification.legal_business_name || 'Business Name',
                business_type: verification.business_type || 'Manufacturer',
                gst_number: verification.business_tax_id,
                business_address: verification.primary_business_address,
                business_phone: verification.business_phone,
                business_email: verification.business_email,
                verification_status: 'verified',
                verified_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (createProfileError) {
            console.error('❌ Failed to create profile:', createProfileError.message);
            return;
        }
        console.log('✅ Supplier profile created');
    } else {
        console.log('\n🔨 Updating existing supplier_profile...');

        const { error: updateProfileError } = await supabase
            .from('supplier_profiles')
            .update({
                verification_status: 'verified',
                verified_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

        if (updateProfileError) {
            console.error('❌ Failed to update profile:', updateProfileError.message);
            return;
        }
        console.log('✅ Supplier profile updated to verified');
    }

    // 5. Add supplier role to user
    const currentRoles = user.roles || [];
    if (!currentRoles.includes('supplier')) {
        console.log('\n🔨 Adding supplier role to user...');

        const newRoles = [...currentRoles, 'supplier'];
        const { error: updateUserError } = await supabase
            .from('users')
            .update({
                roles: newRoles,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateUserError) {
            console.error('❌ Failed to update user roles:', updateUserError.message);
            return;
        }
        console.log('✅ Supplier role added to user');
        console.log('📋 New roles:', newRoles);
    } else {
        console.log('\n✅ User already has supplier role');
    }

    console.log('\n✅ Supplier verification approved successfully!');
    console.log('💡 User can now switch to supplier role\n');
}

const userEmail = process.argv[2];

if (!userEmail) {
    console.log('Usage: node approve-supplier-verification.js <user-email>');
    console.log('Example: node approve-supplier-verification.js user@example.com');
    process.exit(1);
}

approveSupplierVerification(userEmail)
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error:', err);
        process.exit(1);
    });
