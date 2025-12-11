const { supabase } = require('../config/database');

/**
 * Marketplace Model
 * Handles complex marketplace product queries with filters, sorting, and pagination
 */
class Marketplace {
    /**
     * Get products with advanced filtering, sorting, and pagination
     * @param {Object} filters
     * @returns {Promise<Object>}
     */
    static async getProducts(filters = {}) {
        const {
            // Pagination
            page = 1,
            limit = 20,

            // Filters
            categoryId,
            industryId,
            minPrice,
            maxPrice,
            condition,
            listingType,
            verified,
            city,
            minDiscount,
            maxDiscount,
            q, // search query

            // Sorting
            sort = 'relevance'
        } = filters;

        try {
            // Build base query
            let query = supabase
                .from('products')
                .select('*, categories(id, name, slug), industries(id, name, slug)', { count: 'exact' })
                .eq('status', 'active');

            // Apply filters
            if (categoryId) {
                query = query.eq('category_id', categoryId);
            }

            if (industryId) {
                query = query.eq('industry_id', industryId);
            }

            if (minPrice) {
                query = query.gte('price_after', minPrice);
            }

            if (maxPrice) {
                query = query.lte('price_after', maxPrice);
            }

            if (condition) {
                const conditions = Array.isArray(condition) ? condition : [condition];
                query = query.in('condition', conditions);
            }

            if (listingType) {
                const types = Array.isArray(listingType) ? listingType : [listingType];
                query = query.in('listing_type', types);
            }

            if (verified === true || verified === 'true') {
                query = query.eq('supplier_verified', true);
            }

            if (city) {
                query = query.ilike('city', `%${city}%`);
            }

            if (minDiscount) {
                query = query.gte('discount_percent', minDiscount);
            }

            if (maxDiscount) {
                query = query.lte('discount_percent', maxDiscount);
            }

            // Text search
            if (q) {
                query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
            }

            // Apply sorting
            switch (sort) {
                case 'price-asc':
                    query = query.order('price_after', { ascending: true });
                    break;
                case 'price-desc':
                    query = query.order('price_after', { ascending: false });
                    break;
                case 'newest':
                    query = query.order('listed_at', { ascending: false });
                    break;
                case 'views':
                    query = query.order('views_count', { ascending: false });
                    break;
                case 'ending-soon':
                    query = query.not('expires_at', 'is', null)
                        .order('expires_at', { ascending: true });
                    break;
                case 'rating':
                    query = query.order('rating', { ascending: false });
                    break;
                case 'discount':
                    query = query.order('discount_percent', { ascending: false });
                    break;
                case 'relevance':
                default:
                    // Sort by sponsored first, then featured, then trending, then views
                    query = query
                        .order('is_sponsored', { ascending: false })
                        .order('sponsored_priority', { ascending: false })
                        .order('is_featured', { ascending: false })
                        .order('featured_priority', { ascending: false })
                        .order('views_count', { ascending: false });
                    break;
            }

            // Apply pagination
            const offset = (page - 1) * limit;
            query = query.range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) {
                console.error('Error in Marketplace.getProducts:', error);
                throw error;
            }

            return {
                products: data || [],
                total: count || 0,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil((count || 0) / limit)
            };
        } catch (error) {
            console.error('Error in Marketplace.getProducts:', error);
            return {
                products: [],
                total: 0,
                page: 1,
                limit: 20,
                totalPages: 0
            };
        }
    }

    /**
     * Get featured deals (high discount products)
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getFeaturedDeals(limit = 12) {
        const { data, error } = await supabase
            .from('products')
            .select('*, categories(id, name, slug), industries(id, name, slug)')
            .eq('status', 'active')
            .eq('is_featured', true)
            .order('featured_priority', { ascending: false })
            .order('discount_percent', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error in Marketplace.getFeaturedDeals:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Get sponsored listings
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getSponsored(limit = 10) {
        const { data, error } = await supabase
            .from('products')
            .select('*, categories(id, name, slug), industries(id, name, slug)')
            .eq('status', 'active')
            .eq('is_sponsored', true)
            .order('sponsored_priority', { ascending: false })
            .order('views_count', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error in Marketplace.getSponsored:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Get trending products
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getTrending(limit = 20) {
        const { data, error } = await supabase
            .from('products')
            .select('*, categories(id, name, slug), industries(id, name, slug)')
            .eq('status', 'active')
            .eq('is_trending', true)
            .order('views_count', { ascending: false })
            .order('watchers_count', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error in Marketplace.getTrending:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Get filter options with counts
     * @returns {Promise<Object>}
     */
    static async getFilterOptions() {
        try {
            // Get categories with counts
            const { data: categories } = await supabase
                .from('categories')
                .select('id, name, slug, product_count')
                .eq('is_active', true)
                .gt('product_count', 0)
                .order('product_count', { ascending: false });

            // Get industries with counts
            const { data: industries } = await supabase
                .from('industries')
                .select('id, name, slug, product_count')
                .eq('is_active', true)
                .gt('product_count', 0)
                .order('product_count', { ascending: false });

            // Get available cities (from products)
            const { data: cityData } = await supabase
                .from('products')
                .select('city')
                .eq('status', 'active')
                .not('city', 'is', null);

            const cities = [...new Set((cityData || []).map(p => p.city))].sort();

            // Predefined filter options
            const conditions = [
                { value: 'new', label: 'New', count: 0 },
                { value: 'like-new', label: 'Like New', count: 0 },
                { value: 'good', label: 'Good', count: 0 },
                { value: 'fair', label: 'Fair', count: 0 }
            ];

            const listingTypes = [
                { value: 'auction', label: 'Auction', count: 0 },
                { value: 'fixed', label: 'Fixed Price', count: 0 },
                { value: 'negotiable', label: 'Negotiable', count: 0 }
            ];

            const priceRanges = [
                { label: 'Under ₹10,000', min: 0, max: 10000 },
                { label: '₹10,000 - ₹50,000', min: 10000, max: 50000 },
                { label: '₹50,000 - ₹1,00,000', min: 50000, max: 100000 },
                { label: '₹1,00,000 - ₹5,00,000', min: 100000, max: 500000 },
                { label: '₹5,00,000 - ₹10,00,000', min: 500000, max: 1000000 },
                { label: 'Above ₹10,00,000', min: 1000000, max: null }
            ];

            const discountRanges = [
                { label: '10% - 25%', min: 10, max: 25 },
                { label: '25% - 50%', min: 25, max: 50 },
                { label: '50% - 75%', min: 50, max: 75 },
                { label: 'Above 75%', min: 75, max: null }
            ];

            // Get counts for conditions and listing types
            const { data: conditionCounts } = await supabase
                .from('products')
                .select('condition')
                .eq('status', 'active');

            const { data: typeCounts } = await supabase
                .from('products')
                .select('listing_type')
                .eq('status', 'active');

            // Update counts
            conditions.forEach(c => {
                c.count = (conditionCounts || []).filter(p => p.condition === c.value).length;
            });

            listingTypes.forEach(t => {
                t.count = (typeCounts || []).filter(p => p.listing_type === t.value).length;
            });

            return {
                categories: categories || [],
                industries: industries || [],
                cities: cities || [],
                conditions: conditions.filter(c => c.count > 0),
                listingTypes: listingTypes.filter(t => t.count > 0),
                priceRanges,
                discountRanges,
                supplierVerification: [
                    { value: true, label: 'Verified Suppliers Only' }
                ]
            };
        } catch (error) {
            console.error('Error in Marketplace.getFilterOptions:', error);
            return {
                categories: [],
                industries: [],
                cities: [],
                conditions: [],
                listingTypes: [],
                priceRanges: [],
                discountRanges: [],
                supplierVerification: []
            };
        }
    }

    /**
     * Get product statistics
     * @returns {Promise<Object>}
     */
    static async getStats() {
        try {
            const { count: totalProducts } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active');

            const { count: liveAuctions } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active')
                .eq('listing_type', 'auction')
                .not('expires_at', 'is', null)
                .gte('expires_at', new Date().toISOString());

            const { count: featuredDeals } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active')
                .eq('is_featured', true);

            const { count: verifiedSuppliers } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active')
                .eq('supplier_verified', true);

            return {
                totalProducts: totalProducts || 0,
                liveAuctions: liveAuctions || 0,
                featuredDeals: featuredDeals || 0,
                verifiedSuppliers: verifiedSuppliers || 0
            };
        } catch (error) {
            console.error('Error in Marketplace.getStats:', error);
            return {
                totalProducts: 0,
                liveAuctions: 0,
                featuredDeals: 0,
                verifiedSuppliers: 0
            };
        }
    }
}

module.exports = Marketplace;
