const SearchIndex = require('../models/SearchIndex');
const RecentSearch = require('../models/RecentSearch');
const PopularSearch = require('../models/PopularSearch');
const SearchAnalytics = require('../models/SearchAnalytics');

/**
 * Search Controllers
 * Handle all search-related operations
 */

/**
 * @desc    Get auto-suggestions for search query
 * @route   GET /api/search/suggestions?q={query}
 * @access  Public
 */
const getSuggestions = async (req, res, next) => {
  try {
    const { q, limit } = req.query;

    const suggestions = await SearchIndex.getSuggestions(q, limit);

    res.status(200).json({
      success: true,
      message: 'Suggestions retrieved successfully',
      data: {
        suggestions,
        count: suggestions.length
      }
    });

  } catch (error) {
    console.error('Get suggestions error:', error);
    next(error);
  }
};

/**
 * @desc    Search products with full-text search and filters
 * @route   GET /api/search/products?q={query}
 * @access  Public
 */
const searchProducts = async (req, res, next) => {
  try {
    const { q, page, limit, sort, ...filters } = req.query;

    // Get search results
    const results = await SearchIndex.searchProducts(
      q,
      filters,
      sort,
      page,
      limit
    );

    // Get spell correction if no results
    let didYouMean = null;
    if (results.total === 0) {
      const suggestions = await SearchIndex.getDidYouMean(q, 3);
      if (suggestions.length > 0) {
        didYouMean = suggestions[0].suggestion;
      }
    }

    // Format response
    const formattedProducts = results.products.map(product => ({
      id: product.id,
      title: product.title,
      slug: product.slug,
      imageUrl: product.thumbnail_url,
      price: product.price,
      priceBefore: product.price_before_discount,
      discountPercent: product.discount_percentage,
      rating: product.rating || 0,
      city: product.city,
      condition: product.condition,
      listingType: product.listing_type,
      views: product.views || 0,
      auctionEndTime: product.auction_end_time,
      category: product.category ? {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug
      } : null
    }));

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: {
        query: q,
        products: formattedProducts,
        pagination: {
          total: results.total,
          page: results.page,
          pageSize: results.pageSize,
          totalPages: results.totalPages,
          hasNext: results.hasNext,
          hasPrev: results.hasPrev
        },
        didYouMean
      }
    });

    // Track search in background (don't wait)
    if (req.user) {
      RecentSearch.saveSearch(req.user.id, q, results.total, filters)
        .catch(err => console.error('Failed to save recent search:', err));
    }

  } catch (error) {
    console.error('Search products error:', error);
    next(error);
  }
};

/**
 * @desc    Search categories by name or description
 * @route   GET /api/search/categories?q={query}
 * @access  Public
 */
const searchCategories = async (req, res, next) => {
  try {
    const { q, limit } = req.query;

    const categories = await SearchIndex.searchCategories(q, limit);

    res.status(200).json({
      success: true,
      message: 'Categories found successfully',
      data: {
        categories,
        count: categories.length
      }
    });

  } catch (error) {
    console.error('Search categories error:', error);
    next(error);
  }
};

/**
 * @desc    Get "Did you mean?" spell correction suggestions
 * @route   GET /api/search/did-you-mean?q={query}
 * @access  Public
 */
const getDidYouMean = async (req, res, next) => {
  try {
    const { q, limit } = req.query;

    const suggestions = await SearchIndex.getDidYouMean(q, limit);

    res.status(200).json({
      success: true,
      message: 'Spell suggestions retrieved successfully',
      data: {
        original: q,
        suggestions,
        count: suggestions.length
      }
    });

  } catch (error) {
    console.error('Did you mean error:', error);
    next(error);
  }
};

/**
 * @desc    Get popular searches
 * @route   GET /api/search/popular?period={period}
 * @access  Public
 */
const getPopularSearches = async (req, res, next) => {
  try {
    const { limit, period } = req.query;

    let searches;

    switch (period) {
      case 'daily':
        searches = await PopularSearch.getToday(limit);
        break;
      case 'weekly':
        searches = await PopularSearch.getThisWeek(limit);
        break;
      case 'monthly':
        // Use trending for monthly (includes trending score)
        searches = await PopularSearch.getTrending(limit);
        break;
      case 'all-time':
      default:
        searches = await PopularSearch.getPopular(limit);
        break;
    }

    // Format response with trend data
    const formattedSearches = searches.map((search, index) => ({
      query: search.query,
      count: period === 'daily' ? search.searches_today :
        period === 'weekly' ? search.searches_this_week :
          search.total_searches,
      rank: index + 1,
      trendScore: search.trending_score || null
    }));

    res.status(200).json({
      success: true,
      message: 'Popular searches retrieved successfully',
      data: {
        searches: formattedSearches,
        period,
        count: formattedSearches.length
      }
    });

  } catch (error) {
    console.error('Get popular searches error:', error);
    next(error);
  }
};

/**
 * @desc    Get user's recent searches
 * @route   GET /api/search/recent
 * @access  Private (requires authentication)
 */
const getRecentSearches = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const userId = req.user.id;

    const searches = await RecentSearch.getUniqueRecentSearches(userId, limit);

    const formattedSearches = searches.map(search => ({
      query: search.query,
      searchedAt: search.searched_at
    }));

    res.status(200).json({
      success: true,
      message: 'Recent searches retrieved successfully',
      data: {
        searches: formattedSearches,
        count: formattedSearches.length
      }
    });

  } catch (error) {
    console.error('Get recent searches error:', error);
    next(error);
  }
};

/**
 * @desc    Track search analytics event
 * @route   POST /api/search/track
 * @access  Public
 */
const trackSearch = async (req, res, next) => {
  try {
    const { query, productId, resultPosition, sessionId, action } = req.body;
    const userId = req.user?.id || null;

    // Get device info from user agent
    const userAgent = req.get('user-agent');
    const deviceType = /mobile/i.test(userAgent) ? 'mobile' :
      /tablet/i.test(userAgent) ? 'tablet' : 'desktop';

    // Get IP address
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Track the event
    const eventData = {
      userId,
      sessionId,
      query,
      deviceType,
      userAgent,
      ipAddress
    };

    // Create analytics record
    const analyticsRecord = await SearchAnalytics.trackSearch(eventData);

    // Handle different action types
    if (action === 'click' && productId && analyticsRecord) {
      await SearchAnalytics.trackClick(
        analyticsRecord.id,
        productId,
        resultPosition || 0,
        0 // timeToClick - would need to be sent from frontend
      );

      // Update click count in search index
      await SearchIndex.incrementClickCount(productId);
    }

    if (action === 'view' && productId && analyticsRecord) {
      // Track product view
      await SearchAnalytics.trackClick(
        analyticsRecord.id,
        productId,
        resultPosition || 0,
        0
      );
    }

    if (action === 'conversion' && analyticsRecord) {
      await SearchAnalytics.trackConversion(analyticsRecord.id);
    }

    res.status(200).json({
      success: true,
      message: 'Search event tracked successfully',
      data: {
        tracked: true,
        eventId: analyticsRecord?.id || null
      }
    });

  } catch (error) {
    console.error('Track search error:', error);
    // Don't throw error for analytics - just log it
    res.status(200).json({
      success: true,
      message: 'Search event tracked (with warnings)',
      data: {
        tracked: false
      }
    });
  }
};

module.exports = {
  getSuggestions,
  searchProducts,
  searchCategories,
  getDidYouMean,
  getPopularSearches,
  getRecentSearches,
  trackSearch
};
