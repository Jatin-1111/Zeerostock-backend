const { supabase } = require('../config/database');

/**
 * SearchIndex Model
 * Handles full-text search, fuzzy matching, and synonym expansion
 */
class SearchIndex {
    /**
     * Get auto-suggestions based on user input
     * @param {string} query - Search query (minimum 2 characters)
     * @param {number} limit - Maximum suggestions to return (default: 10)
     * @returns {Promise<Array>} - Array of suggestions with type, text, metadata
     */
    static async getSuggestions(query, limit = 10) {
        try {
            const normalizedQuery = query.toLowerCase().trim();

            if (normalizedQuery.length < 2) {
                return [];
            }

            // Call fuzzy suggestions function
            const { data: fuzzyResults, error: fuzzyError } = await supabase
                .rpc('get_fuzzy_suggestions', {
                    search_query: normalizedQuery,
                    similarity_threshold: 0.3,
                    result_limit: limit
                });

            if (fuzzyError) {
                console.error('Fuzzy suggestions error:', fuzzyError);

                // Fallback: Direct trigram search on search_suggestions
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('search_suggestions')
                    .select('suggestion, suggestion_type, thumbnail_url, subtitle, popularity_score')
                    .ilike('normalized_suggestion', `%${normalizedQuery}%`)
                    .order('priority', { ascending: false })
                    .order('popularity_score', { ascending: false })
                    .limit(limit);

                if (fallbackError) throw fallbackError;

                return (fallbackData || []).map(item => ({
                    text: item.suggestion,
                    type: item.suggestion_type,
                    thumbnailUrl: item.thumbnail_url,
                    subtitle: item.subtitle,
                    score: item.popularity_score
                }));
            }

            // Format fuzzy results
            return (fuzzyResults || []).map(item => ({
                text: item.suggestion,
                type: 'keyword',
                score: item.similarity_score
            }));

        } catch (error) {
            console.error('Error fetching suggestions:', error);
            throw error;
        }
    }

    /**
     * Search products using full-text search with ranking
     * @param {string} query - Search query
     * @param {Object} filters - Additional filters (category, industry, price, etc.)
     * @param {string} sortBy - Sort option (default: 'relevance')
     * @param {number} page - Page number
     * @param {number} pageSize - Results per page
     * @returns {Promise<Object>} - Search results with products and metadata
     */
    static async searchProducts(query, filters = {}, sortBy = 'relevance', page = 1, pageSize = 20) {
        try {
            const normalizedQuery = query.toLowerCase().trim();
            const offset = (page - 1) * pageSize;

            // Build base query with search
            let queryBuilder = supabase
                .from('products')
                .select(`
          *,
          category:categories(id, name, slug)
        `, { count: 'exact' });

            // Apply full-text search if query exists
            if (normalizedQuery) {
                // Use text search on title and description
                queryBuilder = queryBuilder.or(
                    `title.ilike.%${normalizedQuery}%,description.ilike.%${normalizedQuery}%,brand.ilike.%${normalizedQuery}%`
                );
            }

            // Apply filters
            if (filters.categoryId) {
                queryBuilder = queryBuilder.eq('category_id', filters.categoryId);
            }
            if (filters.minPrice) {
                queryBuilder = queryBuilder.gte('price', filters.minPrice);
            }
            if (filters.maxPrice) {
                queryBuilder = queryBuilder.lte('price', filters.maxPrice);
            }
            if (filters.condition) {
                queryBuilder = queryBuilder.eq('condition', filters.condition);
            }
            if (filters.listingType) {
                queryBuilder = queryBuilder.eq('listing_type', filters.listingType);
            }
            // Note: Seller verification filter removed - requires proper FK setup
            if (filters.city) {
                queryBuilder = queryBuilder.ilike('city', `%${filters.city}%`);
            }
            if (filters.minDiscount) {
                queryBuilder = queryBuilder.gte('discount_percentage', filters.minDiscount);
            }

            // Only active products
            queryBuilder = queryBuilder.eq('status', 'active');

            // Apply sorting
            switch (sortBy) {
                case 'price-asc':
                    queryBuilder = queryBuilder.order('price', { ascending: true });
                    break;
                case 'price-desc':
                    queryBuilder = queryBuilder.order('price', { ascending: false });
                    break;
                case 'newest':
                    queryBuilder = queryBuilder.order('created_at', { ascending: false });
                    break;
                case 'views':
                    queryBuilder = queryBuilder.order('views', { ascending: false });
                    break;
                case 'rating':
                    queryBuilder = queryBuilder.order('rating', { ascending: false });
                    break;
                case 'discount':
                    queryBuilder = queryBuilder.order('discount_percentage', { ascending: false });
                    break;
                case 'ending-soon':
                    queryBuilder = queryBuilder
                        .eq('listing_type', 'auction')
                        .not('auction_end_time', 'is', null)
                        .order('auction_end_time', { ascending: true });
                    break;
                case 'relevance':
                default:
                    // For relevance, prioritize exact title matches, then description matches
                    // This is a simplified relevance sort; in production, use ts_rank
                    queryBuilder = queryBuilder
                        .order('views', { ascending: false })
                        .order('rating', { ascending: false });
                    break;
            }

            // Pagination
            queryBuilder = queryBuilder.range(offset, offset + pageSize - 1);

            const { data: products, error, count } = await queryBuilder;

            if (error) throw error;

            // Track search in popular_searches
            if (normalizedQuery) {
                await this.trackSearchQuery(query);
            }

            return {
                products: products || [],
                total: count || 0,
                page,
                pageSize,
                totalPages: Math.ceil((count || 0) / pageSize),
                hasNext: (offset + pageSize) < (count || 0),
                hasPrev: page > 1
            };

        } catch (error) {
            console.error('Error searching products:', error);
            throw error;
        }
    }

    /**
     * Search categories by name or description
     * @param {string} query - Search query
     * @param {number} limit - Maximum results (default: 10)
     * @returns {Promise<Array>} - Matching categories
     */
    static async searchCategories(query, limit = 10) {
        try {
            const normalizedQuery = query.toLowerCase().trim();

            const { data, error } = await supabase
                .from('categories')
                .select('id, name, slug, icon, description')
                .or(`name.ilike.%${normalizedQuery}%,description.ilike.%${normalizedQuery}%`)
                .eq('is_active', true)
                .order('display_order', { ascending: true })
                .limit(limit);

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Error searching categories:', error);
            throw error;
        }
    }

    /**
     * Get "Did you mean?" suggestions for spell correction
     * @param {string} query - Potentially misspelled query
     * @param {number} limit - Maximum suggestions (default: 5)
     * @returns {Promise<Array>} - Spell correction suggestions
     */
    static async getDidYouMean(query, limit = 5) {
        try {
            const normalizedQuery = query.toLowerCase().trim();

            // Use trigram similarity for spell correction
            const { data, error } = await supabase
                .rpc('get_fuzzy_suggestions', {
                    search_query: normalizedQuery,
                    similarity_threshold: 0.25, // Lower threshold for spell correction
                    result_limit: limit
                });

            if (error) {
                console.error('Did you mean error:', error);

                // Fallback: Search popular_searches with trigram similarity
                const { data: popularData, error: popularError } = await supabase
                    .from('popular_searches')
                    .select('query, total_searches')
                    .neq('normalized_query', normalizedQuery) // Exclude exact match
                    .order('total_searches', { ascending: false })
                    .limit(limit);

                if (popularError) throw popularError;

                return (popularData || []).map(item => ({
                    suggestion: item.query,
                    confidence: 0.5 // Default confidence for fallback
                }));
            }

            // Filter out exact matches and format results
            return (data || [])
                .filter(item => item.suggestion.toLowerCase() !== normalizedQuery)
                .map(item => ({
                    suggestion: item.suggestion,
                    confidence: item.similarity_score
                }));

        } catch (error) {
            console.error('Error getting spell suggestions:', error);
            throw error;
        }
    }

    /**
     * Expand search query with synonyms
     * @param {string} query - Original search query
     * @returns {Promise<Array>} - Array of query expansions
     */
    static async expandWithSynonyms(query) {
        try {
            const terms = query.toLowerCase().split(/\s+/);
            const expansions = [query]; // Always include original

            for (const term of terms) {
                const { data, error } = await supabase
                    .from('search_synonyms')
                    .select('synonyms')
                    .ilike('term', term)
                    .limit(1);

                if (!error && data && data.length > 0) {
                    const synonyms = data[0].synonyms || [];

                    // Replace term with each synonym
                    synonyms.forEach(synonym => {
                        const expandedQuery = query.replace(new RegExp(term, 'gi'), synonym);
                        if (!expansions.includes(expandedQuery)) {
                            expansions.push(expandedQuery);
                        }
                    });

                    // Increment usage count
                    await supabase
                        .from('search_synonyms')
                        .update({ usage_count: supabase.raw('usage_count + 1') })
                        .ilike('term', term);
                }
            }

            return expansions;

        } catch (error) {
            console.error('Error expanding synonyms:', error);
            return [query]; // Return original on error
        }
    }

    /**
     * Track search query in popular_searches
     * @param {string} query - Search query to track
     * @returns {Promise<void>}
     */
    static async trackSearchQuery(query) {
        try {
            // Use the track_search_event function
            await supabase.rpc('track_search_event', {
                search_query: query
            });
        } catch (error) {
            console.error('Error tracking search query:', error);
            // Don't throw - tracking failure shouldn't break search
        }
    }

    /**
     * Update search index for a product
     * @param {string} productId - Product ID to index
     * @returns {Promise<void>}
     */
    static async updateProductIndex(productId) {
        try {
            // Get product details
            const { data: product, error: productError } = await supabase
                .from('products')
                .select(`
          *,
          category:categories(name),
          industry:industries(name)
        `)
                .eq('id', productId)
                .single();

            if (productError) throw productError;

            // Extract keywords
            const keywords = [
                product.title,
                product.description,
                product.brand,
                product.category?.name,
                product.industry?.name
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            // Update search_index
            const { error: indexError } = await supabase
                .from('search_index')
                .upsert({
                    product_id: productId,
                    keywords,
                    normalized_title: product.title.toLowerCase(),
                    normalized_description: (product.description || '').toLowerCase(),
                    category_name: product.category?.name,
                    industry_name: product.industry?.name,
                    brand: product.brand,
                    updated_at: new Date().toISOString()
                });

            if (indexError) throw indexError;

        } catch (error) {
            console.error('Error updating product index:', error);
            throw error;
        }
    }

    /**
     * Increment search count for a product in index
     * @param {string} productId - Product ID
     * @returns {Promise<void>}
     */
    static async incrementSearchCount(productId) {
        try {
            const { error } = await supabase
                .from('search_index')
                .update({
                    search_count: supabase.raw('search_count + 1'),
                    updated_at: new Date().toISOString()
                })
                .eq('product_id', productId);

            if (error) throw error;
        } catch (error) {
            console.error('Error incrementing search count:', error);
            // Don't throw - count increment failure shouldn't break app
        }
    }

    /**
     * Increment click count for a product in index
     * @param {string} productId - Product ID
     * @returns {Promise<void>}
     */
    static async incrementClickCount(productId) {
        try {
            const { error } = await supabase
                .from('search_index')
                .update({
                    click_count: supabase.raw('click_count + 1'),
                    updated_at: new Date().toISOString()
                })
                .eq('product_id', productId);

            if (error) throw error;
        } catch (error) {
            console.error('Error incrementing click count:', error);
            // Don't throw
        }
    }
}

module.exports = SearchIndex;
