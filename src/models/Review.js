const { supabase } = require('../config/database');

/**
 * Review Model
 * Handles product reviews and ratings operations
 */
class Review {
    /**
     * Create a new review
     * @param {Object} reviewData
     * @returns {Promise<Object>}
     */
    static async create(reviewData) {
        const { data, error } = await supabase
            .from('reviews')
            .insert([{
                ...reviewData,
                status: 'pending',
                is_visible: false // Will be visible after approval
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint
                throw new Error('REVIEW_ALREADY_EXISTS');
            }
            throw error;
        }

        return data;
    }

    /**
     * Get review by ID
     * @param {string} reviewId
     * @returns {Promise<Object>}
     */
    static async findById(reviewId) {
        const { data, error } = await supabase
            .from('reviews')
            .select(`
                *,
                products (
                    id,
                    title,
                    images
                ),
                users!reviews_buyer_id_fkey (
                    id,
                    first_name,
                    last_name
                )
            `)
            .eq('id', reviewId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get buyer's reviews
     * @param {string} buyerId
     * @param {Object} options - {page, limit}
     * @returns {Promise<Object>}
     */
    static async getByBuyerId(buyerId, options = {}) {
        const { page = 1, limit = 10 } = options;
        const offset = (page - 1) * limit;

        const { data, error, count } = await supabase
            .from('reviews')
            .select(`
                *,
                products (
                    id,
                    title,
                    slug,
                    images
                )
            `, { count: 'exact' })
            .eq('buyer_id', buyerId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return {
            reviews: data || [],
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get product reviews
     * @param {string} productId
     * @param {Object} options - {page, limit, rating}
     * @returns {Promise<Object>}
     */
    static async getByProductId(productId, options = {}) {
        const { page = 1, limit = 10, rating = null } = options;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('reviews')
            .select(`
                *,
                users!reviews_buyer_id_fkey (
                    id,
                    first_name,
                    last_name
                )
            `, { count: 'exact' })
            .eq('product_id', productId)
            .eq('status', 'approved')
            .eq('is_visible', true);

        if (rating) {
            query = query.eq('rating', rating);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return {
            reviews: data || [],
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Update review
     * @param {string} reviewId
     * @param {string} buyerId
     * @param {Object} updateData
     * @returns {Promise<Object>}
     */
    static async update(reviewId, buyerId, updateData) {
        const { data, error } = await supabase
            .from('reviews')
            .update(updateData)
            .eq('id', reviewId)
            .eq('buyer_id', buyerId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete review
     * @param {string} reviewId
     * @param {string} buyerId
     * @returns {Promise<boolean>}
     */
    static async delete(reviewId, buyerId) {
        const { error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', reviewId)
            .eq('buyer_id', buyerId);

        if (error) throw error;
        return true;
    }

    /**
     * Check if buyer can review product
     * @param {string} buyerId
     * @param {string} productId
     * @param {string} orderId
     * @returns {Promise<boolean>}
     */
    static async canReview(buyerId, productId, orderId = null) {
        // Check if review already exists
        let query = supabase
            .from('reviews')
            .select('id')
            .eq('buyer_id', buyerId)
            .eq('product_id', productId);

        if (orderId) {
            query = query.eq('order_id', orderId);
        }

        const { data } = await query.single();

        return !data; // Can review if no existing review found
    }

    /**
     * Mark review as helpful/not helpful
     * @param {string} reviewId
     * @param {string} userId
     * @param {boolean} isHelpful
     * @returns {Promise<Object>}
     */
    static async markHelpfulness(reviewId, userId, isHelpful) {
        // Check if user already marked this review
        const { data: existing } = await supabase
            .from('review_helpfulness')
            .select('id, is_helpful')
            .eq('review_id', reviewId)
            .eq('user_id', userId)
            .single();

        if (existing) {
            // Update if changed
            if (existing.is_helpful !== isHelpful) {
                const { error } = await supabase
                    .from('review_helpfulness')
                    .update({ is_helpful: isHelpful })
                    .eq('id', existing.id);

                if (error) throw error;

                // Update counts
                await this._updateHelpfulnessCounts(reviewId);
            }
        } else {
            // Insert new
            const { error } = await supabase
                .from('review_helpfulness')
                .insert([{
                    review_id: reviewId,
                    user_id: userId,
                    is_helpful: isHelpful
                }]);

            if (error) throw error;

            // Update counts
            await this._updateHelpfulnessCounts(reviewId);
        }

        return { success: true };
    }

    /**
     * Update helpfulness counts (internal method)
     * @param {string} reviewId
     * @private
     */
    static async _updateHelpfulnessCounts(reviewId) {
        const { data: counts } = await supabase
            .from('review_helpfulness')
            .select('is_helpful')
            .eq('review_id', reviewId);

        const helpfulCount = counts?.filter(c => c.is_helpful).length || 0;
        const notHelpfulCount = counts?.filter(c => !c.is_helpful).length || 0;

        await supabase
            .from('reviews')
            .update({
                helpful_count: helpfulCount,
                not_helpful_count: notHelpfulCount
            })
            .eq('id', reviewId);
    }

    /**
     * Get product review summary
     * @param {string} productId
     * @returns {Promise<Object>}
     */
    static async getReviewSummary(productId) {
        const { data, error } = await supabase
            .from('reviews')
            .select('rating')
            .eq('product_id', productId)
            .eq('status', 'approved')
            .eq('is_visible', true);

        if (error) throw error;

        if (!data || data.length === 0) {
            return {
                totalReviews: 0,
                averageRating: 0,
                ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            };
        }

        const totalReviews = data.length;
        const averageRating = data.reduce((sum, r) => sum + parseFloat(r.rating), 0) / totalReviews;

        const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        data.forEach(r => {
            const rating = Math.floor(parseFloat(r.rating));
            ratingDistribution[rating]++;
        });

        return {
            totalReviews,
            averageRating: Math.round(averageRating * 10) / 10,
            ratingDistribution
        };
    }

    /**
     * Approve review (admin function)
     * @param {string} reviewId
     * @returns {Promise<Object>}
     */
    static async approve(reviewId) {
        const { data, error } = await supabase
            .from('reviews')
            .update({
                status: 'approved',
                is_visible: true
            })
            .eq('id', reviewId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Reject review (admin function)
     * @param {string} reviewId
     * @returns {Promise<Object>}
     */
    static async reject(reviewId) {
        const { data, error } = await supabase
            .from('reviews')
            .update({
                status: 'rejected',
                is_visible: false
            })
            .eq('id', reviewId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

module.exports = Review;
