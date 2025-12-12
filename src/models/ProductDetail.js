const { supabase } = require('../config/database');

/**
 * ProductDetail Model
 * Handles product detail page operations with full information
 */
class ProductDetail {
  /**
   * Get complete product details by ID
   * @param {string} productId - Product UUID
   * @param {string} userId - Current user ID (optional, for watchlist status)
   * @returns {Promise<Object>} - Complete product details
   */
  static async getFullDetails(productId, userId = null) {
    try {
      // Get main product data
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name, slug, image_url)
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;
      if (!product) return null;

      // Get specifications
      const specs = await this.getSpecifications(productId);

      // Get seller info
      const seller = await this.getSellerInfo(product.supplier_id);

      // Get review stats
      const reviewStats = await this.getReviewStats(productId);

      // Get auction details if applicable
      let auction = null;
      if (product.listing_type === 'auction') {
        auction = await this.getAuctionDetails(productId);
      }

      // Check if user is watching
      let isWatching = false;
      if (userId) {
        isWatching = await this.isWatching(productId, userId);
      }

      // Track view
      await this.incrementViews(productId);

      return {
        product,
        specifications: specs,
        seller,
        reviewStats,
        auction,
        isWatching
      };

    } catch (error) {
      console.error('Error fetching full product details:', error);
      throw error;
    }
  }

  /**
   * Get product specifications grouped by category
   * @param {string} productId - Product UUID
   * @returns {Promise<Object>} - Specifications grouped by category
   */
  static async getSpecifications(productId) {
    try {
      const { data, error } = await supabase
        .from('product_specifications')
        .select('*')
        .eq('product_id', productId)
        .order('spec_category', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Group by category
      const grouped = {};
      (data || []).forEach(spec => {
        const category = spec.spec_category || 'General';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push({
          key: spec.spec_key,
          value: spec.spec_value,
          unit: spec.spec_unit,
          highlighted: spec.is_highlighted
        });
      });

      return grouped;

    } catch (error) {
      console.error('Error fetching specifications:', error);
      return {};
    }
  }

  /**
   * Get seller information with trust indicators
   * @param {string} sellerId - Seller UUID
   * @returns {Promise<Object>} - Seller details
   */
  static async getSellerInfo(sellerId) {
    try {
      const { data: seller, error } = await supabase
        .from('users')
        .select('id, company_name, business_email, gst_number, created_at, is_verified')
        .eq('id', sellerId)
        .single();

      if (error) throw error;

      // Get seller stats
      const { count: totalListings } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_id', sellerId)
        .eq('status', 'active');

      const yearsInBusiness = Math.floor(
        (new Date() - new Date(seller.created_at)) / (365.25 * 24 * 60 * 60 * 1000)
      );

      const hasGst = !!seller.gst_number;

      return {
        id: seller.id,
        name: seller.company_name,
        email: seller.business_email,
        verified: seller.is_verified,
        gstVerified: hasGst,
        memberSince: seller.created_at,
        yearsInBusiness: Math.max(yearsInBusiness, 0),
        totalListings: totalListings || 0,
        trustBadges: {
          verified: seller.is_verified,
          gstVerified: hasGst,
          experienced: yearsInBusiness >= 2
        }
      };

    } catch (error) {
      console.error('Error fetching seller info:', error);
      return null;
    }
  }

  /**
   * Get review statistics
   * @param {string} productId - Product UUID
   * @returns {Promise<Object>} - Review stats
   */
  static async getReviewStats(productId) {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('rating, verified_purchase')
        .eq('product_id', productId)
        .eq('status', 'approved');

      if (error) throw error;

      const reviews = data || [];
      const total = reviews.length;

      if (total === 0) {
        return {
          avgRating: 0,
          totalReviews: 0,
          distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          verifiedPurchases: 0
        };
      }

      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      reviews.forEach(r => {
        distribution[r.rating]++;
      });

      return {
        avgRating: Math.round((sum / total) * 10) / 10,
        totalReviews: total,
        distribution,
        verifiedPurchases: reviews.filter(r => r.verified_purchase).length
      };

    } catch (error) {
      console.error('Error fetching review stats:', error);
      return { avgRating: 0, totalReviews: 0, distribution: {}, verifiedPurchases: 0 };
    }
  }

  /**
   * Get paginated reviews
   * @param {string} productId - Product UUID
   * @param {number} page - Page number
   * @param {number} limit - Reviews per page
   * @returns {Promise<Object>} - Reviews with pagination
   */
  static async getReviews(productId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('product_reviews')
        .select(`
          *,
          user:users(first_name, last_name, company_name)
        `, { count: 'exact' })
        .eq('product_id', productId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        reviews: (data || []).map(r => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          verifiedPurchase: r.verified_purchase,
          helpfulCount: r.helpful_count,
          user: {
            name: `${r.user.first_name} ${r.user.last_name}`,
            company: r.user.company_name
          },
          createdAt: r.created_at,
          sellerResponse: r.seller_response
        })),
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: (offset + limit) < (count || 0),
          hasPrev: page > 1
        }
      };

    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }
  }

  /**
   * Get shipping options
   * @param {string} productId - Product UUID
   * @returns {Promise<Array>} - Shipping options
   */
  static async getShippingOptions(productId) {
    try {
      const { data, error } = await supabase
        .from('shipping_options')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true)
        .order('base_rate', { ascending: true });

      if (error) throw error;

      return (data || []).map(option => ({
        id: option.id,
        method: option.shipping_method,
        carrier: option.carrier_name,
        baseRate: option.base_rate,
        deliveryTime: `${option.min_delivery_days}-${option.max_delivery_days} days`,
        features: {
          freeShippingAbove: option.free_shipping_threshold,
          tracking: option.tracking_available,
          insurance: option.insurance_available,
          cod: option.cod_available
        },
        coverage: {
          nationwide: option.nationwide,
          states: option.serviceable_states
        }
      }));

    } catch (error) {
      console.error('Error fetching shipping options:', error);
      return [];
    }
  }

  /**
   * Get related products
   * @param {string} productId - Product UUID
   * @param {number} limit - Number of products
   * @returns {Promise<Array>} - Related products
   */
  static async getRelatedProducts(productId, limit = 8) {
    try {
      // Get current product category
      const { data: current, error: currentError } = await supabase
        .from('products')
        .select('category_id')
        .eq('id', productId)
        .single();

      if (currentError) throw currentError;

      // Get similar products
      const { data, error } = await supabase
        .from('products')
        .select('id, title, slug, thumbnail_url, price, price_before_discount, discount_percentage, rating, condition, city')
        .eq('category_id', current.category_id)
        .eq('status', 'active')
        .neq('id', productId)
        .limit(limit);

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('Error fetching related products:', error);
      return [];
    }
  }

  /**
   * Check if user is watching product
   * @param {string} productId - Product UUID
   * @param {string} userId - User UUID
   * @returns {Promise<boolean>} - Is watching
   */
  static async isWatching(productId, userId) {
    try {
      const { data, error } = await supabase
        .from('product_watches')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      return !!data;

    } catch (error) {
      console.error('Error checking watch status:', error);
      return false;
    }
  }

  /**
   * Add to watchlist
   * @param {string} productId - Product UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} - Watch record
   */
  static async addToWatchlist(productId, userId) {
    try {
      const { data, error } = await supabase
        .from('product_watches')
        .insert({ product_id: productId, user_id: userId })
        .select()
        .single();

      if (error) throw error;

      return data;

    } catch (error) {
      console.error('Error adding to watchlist:', error);
      throw error;
    }
  }

  /**
   * Remove from watchlist
   * @param {string} productId - Product UUID
   * @param {string} userId - User UUID
   * @returns {Promise<void>}
   */
  static async removeFromWatchlist(productId, userId) {
    try {
      const { error } = await supabase
        .from('product_watches')
        .delete()
        .eq('product_id', productId)
        .eq('user_id', userId);

      if (error) throw error;

    } catch (error) {
      console.error('Error removing from watchlist:', error);
      throw error;
    }
  }

  /**
   * Create quote request
   * @param {Object} quoteData - Quote request data
   * @returns {Promise<Object>} - Created quote
   */
  static async createQuoteRequest(quoteData) {
    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .insert({
          product_id: quoteData.productId,
          buyer_id: quoteData.buyerId,
          seller_id: quoteData.sellerId,
          quantity: quoteData.quantity,
          target_price: quoteData.targetPrice,
          message: quoteData.message,
          company_name: quoteData.companyName,
          gst_number: quoteData.gstNumber,
          delivery_pincode: quoteData.deliveryPincode
        })
        .select()
        .single();

      if (error) throw error;

      return data;

    } catch (error) {
      console.error('Error creating quote request:', error);
      throw error;
    }
  }

  /**
   * Create share link
   * @param {string} productId - Product UUID
   * @param {string} userId - User UUID
   * @param {string} method - Share method
   * @returns {Promise<Object>} - Share token and URL
   */
  static async createShareLink(productId, userId, method) {
    try {
      const shareToken = `${productId.substring(0, 8)}-${Date.now()}`;

      const { data, error } = await supabase
        .from('product_shares')
        .insert({
          product_id: productId,
          user_id: userId,
          share_method: method,
          share_token: shareToken
        })
        .select()
        .single();

      if (error) throw error;

      return {
        shareToken,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/products/${productId}?ref=${shareToken}`
      };

    } catch (error) {
      console.error('Error creating share link:', error);
      throw error;
    }
  }

  /**
   * Get auction details
   * @param {string} productId - Product UUID
   * @returns {Promise<Object>} - Auction info
   */
  static async getAuctionDetails(productId) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('auction_start_price, auction_current_bid, auction_end_time, auction_bid_count, auction_min_increment')
        .eq('id', productId)
        .single();

      if (error) throw error;

      const endTime = new Date(data.auction_end_time);
      const now = new Date();
      const remaining = endTime - now;

      return {
        startingBid: data.auction_start_price,
        currentBid: data.auction_current_bid || data.auction_start_price,
        totalBids: data.auction_bid_count || 0,
        minIncrement: data.auction_min_increment,
        endTime: data.auction_end_time,
        timeRemaining: remaining > 0 ? this.formatTime(remaining) : 'Ended',
        isLive: remaining > 0
      };

    } catch (error) {
      console.error('Error fetching auction details:', error);
      return null;
    }
  }

  /**
   * Format milliseconds to readable time
   * @param {number} ms - Milliseconds
   * @returns {string} - Formatted time
   */
  static formatTime(ms) {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return `< 1h`;
  }

  /**
   * Increment view count
   * @param {string} productId - Product UUID
   * @returns {Promise<void>}
   */
  static async incrementViews(productId) {
    try {
      await supabase.rpc('increment_product_views', {
        p_product_id: productId
      });
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  }
}

module.exports = ProductDetail;
