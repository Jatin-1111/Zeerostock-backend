const { supabase } = require('../config/database');

const SupplierVerification = {
    /**
     * Get all pending verifications (for admin)
     */
    async getPendingVerifications(limit = 50, offset = 0, status = null) {
        let query = supabase
            .from('supplier_profiles')
            .select(`
                *,
                users:user_id (
                    id,
                    business_email,
                    mobile,
                    first_name,
                    last_name,
                    created_at
                )
            `)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        // Filter by status if provided
        if (status) {
            query = query.eq('verification_status', status);
        } else {
            // Default to pending and under_review
            query = query.in('verification_status', ['pending', 'under_review']);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    },

    /**
     * Get verification by supplier profile ID
     */
    async getById(profileId) {
        const { data, error } = await supabase
            .from('supplier_profiles')
            .select(`
                *,
                users:user_id (
                    id,
                    business_email,
                    mobile,
                    first_name,
                    last_name
                )
            `)
            .eq('id', profileId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    /**
     * Get verification by user ID
     */
    async getByUserId(userId) {
        const { data, error } = await supabase
            .from('supplier_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') return null;
        return data;
    },

    /**
     * Update verification status
     */
    async updateStatus(profileId, status, notes, verifiedBy) {
        try {
            // Get the profile first
            const profile = await this.getById(profileId);
            if (!profile) {
                throw new Error('Supplier profile not found');
            }

            // Update supplier profile
            const updateData = {
                verification_status: status,
                verification_notes: notes,
                verified_by: verifiedBy,
                updated_at: new Date().toISOString()
            };

            // Set verified_at for verified status
            if (status === 'verified') {
                updateData.verified_at = new Date().toISOString();
            }

            // Set rejection_reason for rejected status
            if (status === 'rejected') {
                updateData.rejection_reason = notes;
            }

            const { data: updatedProfile, error: updateError } = await supabase
                .from('supplier_profiles')
                .update(updateData)
                .eq('id', profileId)
                .select()
                .single();

            if (updateError) throw updateError;

            // Add to verification history
            const { error: historyError } = await supabase
                .from('supplier_verification_history')
                .insert({
                    supplier_profile_id: profileId,
                    status: status,
                    notes: notes,
                    changed_by: verifiedBy
                });

            if (historyError) console.error('Failed to add history:', historyError);

            // If verified, add supplier role to user
            if (status === 'verified') {
                const { error: roleError } = await supabase.rpc('add_supplier_role', {
                    user_id: profile.user_id
                });

                // If RPC doesn't exist, use raw SQL
                if (roleError) {
                    const { error: sqlError } = await supabase
                        .from('users')
                        .update({
                            roles: supabase.raw('array_append(roles, \'supplier\')'),
                        })
                        .eq('id', profile.user_id)
                        .not('roles', 'cs', '{"supplier"}'); // Only add if not already present

                    if (sqlError) console.error('Failed to add supplier role:', sqlError);
                }
            }

            return updatedProfile;
        } catch (error) {
            console.error('Error updating verification status:', error);
            throw error;
        }
    },

    /**
     * Get verification history
     */
    async getHistory(profileId) {
        const { data, error } = await supabase
            .from('supplier_verification_history')
            .select(`
                *,
                users:changed_by (
                    id,
                    first_name,
                    last_name,
                    business_email
                )
            `)
            .eq('supplier_profile_id', profileId)
            .order('changed_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Get verification statistics (for admin dashboard)
     */
    async getStats() {
        const { data, error } = await supabase
            .from('supplier_profiles')
            .select('verification_status');

        if (error) throw error;

        const stats = {
            pending_count: 0,
            under_review_count: 0,
            verified_count: 0,
            rejected_count: 0,
            total_count: data.length
        };

        data.forEach(profile => {
            switch (profile.verification_status) {
                case 'pending':
                    stats.pending_count++;
                    break;
                case 'under_review':
                    stats.under_review_count++;
                    break;
                case 'verified':
                    stats.verified_count++;
                    break;
                case 'rejected':
                    stats.rejected_count++;
                    break;
            }
        });

        return stats;
    },

    /**
     * Create or update supplier profile
     */
    async createOrUpdate(userId, profileData) {
        const { data, error } = await supabase
            .from('supplier_profiles')
            .upsert({
                user_id: userId,
                ...profileData,
                verification_status: 'pending',
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

module.exports = SupplierVerification;
