const { query: db } = require('../config/database');
const { AppError, ERROR_CODES, asyncHandler } = require('../middleware/error.middleware');
const { Quote, RFQ } = require('../models');

/**
 * @route   GET /api/supplier/listings
 * @desc    Get all listings for the authenticated supplier
 * @access  Private (Supplier only)
 */
const getMyListings = asyncHandler(async (req, res) => {
    const supplierId = req.userId;
    const { status, page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE p.supplier_id = $1';
    const params = [supplierId];
    let paramIndex = 2;

    if (status && status !== 'all') {
        whereClause += ` AND p.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
    }

    // Validate sort column
    const allowedSortColumns = ['created_at', 'title', 'price_after', 'views_count', 'status'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get listings with category info
    const listingsQuery = `
        SELECT 
            p.id,
            p.title,
            p.slug,
            p.description,
            p.price_before,
            p.price_after,
            p.discount_percent,
            p.image_url,
            p.condition,
            p.quantity,
            p.unit,
            p.city,
            p.state,
            p.views_count,
            p.watchers_count,
            p.inquiries_count,
            p.status,
            p.listing_type,
            p.listed_at,
            p.expires_at,
            p.created_at,
            p.updated_at,
            c.name as category_name,
            c.slug as category_slug,
            COALESCE(p.rating, 0) as rating,
            COALESCE(p.review_count, 0) as review_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereClause}
        ORDER BY p.${sortColumn} ${order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const listings = await db(listingsQuery, params);

    // Get total count
    const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        ${whereClause}
    `;
    const countResult = await db(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].total);

    res.json({
        success: true,
        message: 'Listings retrieved successfully',
        data: {
            listings: listings.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * @route   GET /api/supplier/listings/:id
 * @desc    Get a specific listing by ID
 * @access  Private (Supplier only)
 */
const getListingById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const supplierId = req.userId;

    const query = `
        SELECT 
            p.*,
            c.name as category_name,
            c.slug as category_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1 AND p.supplier_id = $2
    `;

    const result = await db(query, [id, supplierId]);

    if (result.rows.length === 0) {
        throw new AppError(
            'Listing not found or you do not have permission to access it',
            404,
            ERROR_CODES.NOT_FOUND
        );
    }

    res.json({
        success: true,
        message: 'Listing retrieved successfully',
        data: result.rows[0]
    });
});

/**
 * @route   POST /api/supplier/listings
 * @desc    Create a new listing
 * @access  Private (Supplier only)
 */
const createListing = asyncHandler(async (req, res) => {
    const supplierId = req.userId;
    const {
        title,
        description,
        categoryId,
        priceAfter,
        imageUrl,
        galleryImages,
        condition,
        quantity,
        unit,
        city,
        listingType,
        expiresAt,
        // Technical Specification fields
        materialType,
        materialGrade,
        diameterRange,
        wallThicknessRange,
        lengthMin,
        lengthUnit,
        weightPerUnit,
        weightUnit,
        manufacturingProcess,
        // Compliance & Certification fields
        certifications,
        otherCertification
    } = req.validatedBody;

    // Generate slug from title
    const slug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now();

    const query = `
        INSERT INTO products (
            supplier_id, title, slug, description, category_id,
            price_before, price_after, discount_percent,
            image_url, gallery_images, condition, quantity, unit,
            city, state, listing_type, expires_at,
            available_quantity, min_order_quantity,
            material_type, material_grade, diameter_range, wall_thickness_range,
            length_min, length_unit, weight_per_unit, weight_unit,
            manufacturing_process, certifications, other_certification,
            status, listed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, NOW())
        RETURNING *
    `;

    const result = await db(query, [
        supplierId,
        title,
        slug,
        description,
        categoryId,
        0, // price_before - not used in form
        priceAfter,
        0, // discount_percent - not used in form
        imageUrl,
        galleryImages ? JSON.stringify(galleryImages) : '[]',
        condition,
        quantity,
        unit,
        city,
        '', // state - not used in form
        listingType,
        expiresAt,
        quantity, // available_quantity - same as quantity
        1, // min_order_quantity - default to 1
        materialType || null,
        materialGrade || null,
        diameterRange || null,
        wallThicknessRange || null,
        lengthMin || null,
        lengthUnit || 'meters',
        weightPerUnit || null,
        weightUnit || 'Kg',
        manufacturingProcess || null,
        certifications ? JSON.stringify(certifications) : '[]',
        otherCertification || null,
        'active'
    ]);

    res.status(201).json({
        success: true,
        message: 'Listing created successfully',
        data: result.rows[0]
    });
});

/**
 * @route   PUT /api/supplier/listings/:id
 * @desc    Update a listing
 * @access  Private (Supplier only)
 */
const updateListing = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const supplierId = req.userId;
    const updates = req.validatedBody;

    // Check if listing exists and belongs to supplier
    const checkQuery = 'SELECT id FROM products WHERE id = $1 AND supplier_id = $2';
    const checkResult = await db(checkQuery, [id, supplierId]);

    if (checkResult.rows.length === 0) {
        throw new AppError(
            'Listing not found or you do not have permission to update it',
            404,
            ERROR_CODES.NOT_FOUND
        );
    }

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = {
        title: 'title',
        description: 'description',
        categoryId: 'category_id',
        priceBefore: 'price_before',
        priceAfter: 'price_after',
        discountPercent: 'discount_percent',
        imageUrl: 'image_url',
        galleryImages: 'gallery_images',
        condition: 'condition',
        quantity: 'quantity',
        unit: 'unit',
        city: 'city',
        listingType: 'listing_type',
        status: 'status',
        expiresAt: 'expires_at',
        availableQuantity: 'available_quantity',
        minOrderQuantity: 'min_order_quantity',
        // Technical Specification fields
        materialType: 'material_type',
        materialGrade: 'material_grade',
        diameterRange: 'diameter_range',
        wallThicknessRange: 'wall_thickness_range',
        lengthMin: 'length_min',
        lengthUnit: 'length_unit',
        weightPerUnit: 'weight_per_unit',
        weightUnit: 'weight_unit',
        manufacturingProcess: 'manufacturing_process',
        // Compliance & Certification fields
        certifications: 'certifications',
        otherCertification: 'other_certification'
    };

    Object.keys(updates).forEach(key => {
        if (allowedFields[key]) {
            const dbField = allowedFields[key];
            fields.push(`${dbField} = $${paramIndex}`);

            // Handle JSON fields
            if (key === 'galleryImages' || key === 'certifications') {
                values.push(JSON.stringify(updates[key]));
            } else {
                values.push(updates[key]);
            }
            paramIndex++;
        }
    });

    if (fields.length === 0) {
        throw new AppError('No valid fields to update', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // Add updated_at
    fields.push(`updated_at = NOW()`);

    // Add WHERE clause params
    values.push(id, supplierId);

    const updateQuery = `
        UPDATE products
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex} AND supplier_id = $${paramIndex + 1}
        RETURNING *
    `;

    const result = await db(updateQuery, values);

    res.json({
        success: true,
        message: 'Listing updated successfully',
        data: result.rows[0]
    });
});

/**
 * @route   DELETE /api/supplier/listings/:id
 * @desc    Delete a listing
 * @access  Private (Supplier only)
 */
const deleteListing = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const supplierId = req.userId;

    const query = 'DELETE FROM products WHERE id = $1 AND supplier_id = $2 RETURNING id';
    const result = await db(query, [id, supplierId]);

    if (result.rows.length === 0) {
        throw new AppError(
            'Listing not found or you do not have permission to delete it',
            404,
            ERROR_CODES.NOT_FOUND
        );
    }

    res.json({
        success: true,
        message: 'Listing deleted successfully'
    });
});

/**
 * @route   GET /api/supplier/profile
 * @desc    Get supplier profile with company info and business metrics
 * @access  Private (Supplier only)
 */
const getProfile = asyncHandler(async (req, res) => {
    const supplierId = req.userId;

    // Get user data first
    const userQuery = `
        SELECT 
            id,
            first_name,
            last_name,
            company_name,
            business_email,
            mobile,
            business_type,
            created_at
        FROM users
        WHERE id = $1
    `;

    // Get supplier profile data (if exists)
    const profileQuery = `
        SELECT 
            business_name,
            business_type,
            business_email,
            business_phone,
            product_categories,
            rating,
            verification_status,
            verified_at,
            created_at
        FROM supplier_profiles
        WHERE user_id = $1
    `;

    // Get total reviews count from products
    const reviewsQuery = `
        SELECT 
            COUNT(*) as total_reviews,
            AVG(r.rating) as avg_rating
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        WHERE p.supplier_id = $1
    `;

    // Get response rate (orders processed / total orders)
    const responseRateQuery = `
        SELECT 
            COUNT(*) as total_orders,
            COUNT(*) FILTER (WHERE oi.item_status IN ('processing', 'shipped', 'delivered')) as processed_orders
        FROM order_items oi
        WHERE oi.supplier_id = $1
    `;

    const [userResult, profileResult, reviewsResult, responseResult] = await Promise.all([
        db(userQuery, [supplierId]),
        db(profileQuery, [supplierId]),
        db(reviewsQuery, [supplierId]),
        db(responseRateQuery, [supplierId])
    ]);

    if (!userResult.rows || userResult.rows.length === 0) {
        throw new AppError('User not found', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    const user = userResult.rows[0];
    const profile = profileResult.rows && profileResult.rows.length > 0 ? profileResult.rows[0] : null;
    const reviews = reviewsResult.rows[0];
    const response = responseResult.rows[0];

    // Calculate response rate
    const totalOrders = parseInt(response.total_orders) || 0;
    const processedOrders = parseInt(response.processed_orders) || 0;
    const responseRate = totalOrders > 0 ? Math.round((processedOrders / totalOrders) * 100) : 0;

    // Calculate member since year
    const memberSince = new Date(profile?.created_at || user.created_at).getFullYear();

    // Format product categories as array
    const primaryCategories = profile?.product_categories || [];

    // Use profile data if exists, otherwise use user data
    const companyName = profile?.business_name || user.company_name;
    const businessType = profile?.business_type || user.business_type || 'Trader/ Dealer';
    const phone = profile?.business_phone || user.mobile || '';
    const email = profile?.business_email || user.business_email || '';

    res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
            company_info: {
                company_name: companyName,
                website: companyName,
                business_type: businessType,
                description: `Leading ${businessType} with expertise in surplus inventory management.`,
                phone: phone,
                primary_categories: primaryCategories.slice(0, 3)
            },
            business_metrics: {
                rating: parseFloat(reviews.avg_rating) || parseFloat(profile?.rating) || 0,
                response_rate: responseRate,
                total_reviews: parseInt(reviews.total_reviews) || 0,
                member_since: memberSince
            }
        }
    });
});

/**
 * @route   GET /api/supplier/dashboard/stats
 * @desc    Get supplier dashboard statistics
 * @access  Private (Supplier only)
 */
const getDashboardStats = asyncHandler(async (req, res) => {
    const supplierId = req.userId;

    // Get listings stats
    const listingsStatsQuery = `
        SELECT 
            COUNT(*) FILTER (WHERE status = 'active') as active_listings,
            COUNT(*) as total_listings,
            COUNT(*) FILTER (WHERE status = 'sold') as sold_listings,
            COUNT(*) FILTER (WHERE status = 'expired') as expired_listings,
            SUM(views_count) as total_views,
            SUM(watchers_count) as total_watchers,
            SUM(inquiries_count) as total_inquiries
        FROM products
        WHERE supplier_id = $1
    `;

    // Get orders stats
    const ordersStatsQuery = `
        SELECT 
            COUNT(DISTINCT o.id) as total_orders,
            COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'pending') as pending_orders,
            COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'processing') as processing_orders,
            COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'shipped') as shipped_orders,
            COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') as delivered_orders,
            COALESCE(SUM(oi.subtotal), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN o.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN oi.subtotal ELSE 0 END), 0) as revenue_this_month
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.supplier_id = $1
    `;

    // Get recent activity
    const recentActivityQuery = `
        SELECT 
            p.id,
            p.title,
            p.image_url,
            p.price_after,
            p.views_count,
            p.watchers_count,
            p.quantity,
            p.created_at,
            c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.supplier_id = $1 AND p.status = 'active'
        ORDER BY p.created_at DESC
        LIMIT 5
    `;

    // Get performance metrics
    const performanceQuery = `
        SELECT 
            AVG(r.rating) as avg_rating,
            COUNT(DISTINCT oi.id) as total_orders,
            COUNT(DISTINCT oi.id) FILTER (WHERE oi.item_status IN ('processing', 'shipped', 'delivered')) as processed_orders,
            COUNT(DISTINCT oi.id) FILTER (WHERE oi.item_status = 'delivered') as delivered_orders
        FROM products p
        LEFT JOIN reviews r ON p.id = r.product_id
        LEFT JOIN order_items oi ON p.id = oi.product_id
        WHERE p.supplier_id = $1
    `;

    // Get RFQ match count (if RFQ system exists)
    const rfqMatchQuery = `
        SELECT COUNT(*) as total_matches
        FROM rfqs
        WHERE status = 'open'
        AND (category_id IN (SELECT DISTINCT category_id FROM products WHERE supplier_id = $1) OR category_id IS NULL)
    `;

    const [listingsStats, ordersStats, recentActivity, performance, rfqMatches] = await Promise.all([
        db(listingsStatsQuery, [supplierId]),
        db(ordersStatsQuery, [supplierId]),
        db(recentActivityQuery, [supplierId]),
        db(performanceQuery, [supplierId]),
        db(rfqMatchQuery, [supplierId]).catch(() => ({ rows: [{ total_matches: 0 }] }))
    ]);

    // Calculate performance metrics
    const totalOrders = parseInt(performance.rows[0].total_orders) || 0;
    const processedOrders = parseInt(performance.rows[0].processed_orders) || 0;
    const deliveredOrders = parseInt(performance.rows[0].delivered_orders) || 0;

    const responseRate = totalOrders > 0 ? Math.round((processedOrders / totalOrders) * 100) : null;
    const onTimeDelivery = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : null;

    res.json({
        success: true,
        message: 'Dashboard stats retrieved successfully',
        data: {
            listings: listingsStats.rows[0],
            orders: ordersStats.rows[0],
            recentActivity: recentActivity.rows,
            rfqMatches: {
                totalMatches: parseInt(rfqMatches.rows[0].total_matches) || 0
            },
            performance: {
                rating: parseFloat(performance.rows[0].avg_rating) || null,
                responseRate,
                onTimeDelivery,
                quoteWinRate: null // TODO: Calculate from quotes table when implemented
            }
        }
    });
});

/**
 * @route   GET /api/supplier/orders
 * @desc    Get all orders for the supplier
 * @access  Private (Supplier only)
 */
const getSupplierOrders = asyncHandler(async (req, res) => {
    const supplierId = req.userId;
    const { status, page = 1, limit = 20 } = req.query;

    console.log('🔍 [getSupplierOrders] Supplier ID:', supplierId);
    console.log('🔍 [getSupplierOrders] Status filter:', status);
    console.log('🔍 [getSupplierOrders] Page:', page, 'Limit:', limit);

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE oi.supplier_id = $1';
    const params = [supplierId];
    let paramIndex = 2;

    if (status && status !== 'all') {
        whereClause += ` AND o.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
    }

    const ordersQuery = `
        SELECT 
            o.id,
            o.order_number,
            o.status,
            o.payment_status,
            o.total_amount,
            o.created_at,
            o.updated_at,
            CONCAT(u.first_name, ' ', u.last_name) as buyer_name,
            u.company_name as buyer_company,
            u.mobile as buyer_mobile,
            COUNT(DISTINCT oi.id) as items_count,
            SUM(oi.subtotal) as supplier_total,
            json_agg(
                json_build_object(
                    'id', oi.id,
                    'product_title', oi.product_title,
                    'product_image', oi.product_image,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'final_price', oi.final_price,
                    'subtotal', oi.subtotal,
                    'item_status', oi.item_status
                )
            ) as items
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN users u ON o.user_id = u.id
        ${whereClause}
        GROUP BY o.id, u.first_name, u.last_name, u.company_name, u.mobile
        ORDER BY o.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    console.log('🔍 [getSupplierOrders] Query:', ordersQuery);
    console.log('🔍 [getSupplierOrders] Params:', params);

    const orders = await db(ordersQuery, params);

    console.log('🔍 [getSupplierOrders] Found orders:', orders.rows.length);
    console.log('🔍 [getSupplierOrders] Orders:', JSON.stringify(orders.rows, null, 2));

    // Get total count
    const countQuery = `
        SELECT COUNT(DISTINCT o.id) as total
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        ${whereClause}
    `;
    const countResult = await db(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].total);

    res.json({
        success: true,
        message: 'Orders retrieved successfully',
        data: {
            orders: orders.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * @route   PUT /api/supplier/orders/:orderId/items/:itemId/status
 * @desc    Update order item status
 * @access  Private (Supplier only)
 */
const updateOrderItemStatus = asyncHandler(async (req, res) => {
    const { orderId, itemId } = req.params;
    const { status } = req.validatedBody;
    const supplierId = req.userId;

    // Verify the item belongs to this supplier
    const checkQuery = `
        SELECT id FROM order_items
        WHERE id = $1 AND order_id = $2 AND supplier_id = $3
    `;
    const checkResult = await db(checkQuery, [itemId, orderId, supplierId]);

    if (checkResult.rows.length === 0) {
        throw new AppError(
            'Order item not found or you do not have permission to update it',
            404,
            ERROR_CODES.NOT_FOUND
        );
    }

    const updateQuery = `
        UPDATE order_items
        SET item_status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
    `;
    const result = await db(updateQuery, [status, itemId]);

    res.json({
        success: true,
        message: 'Order item status updated successfully',
        data: result.rows[0]
    });
});

/**
 * @route   GET /api/supplier/analytics
 * @desc    Get supplier analytics and performance metrics
 * @access  Private (Supplier only)
 */
const getAnalytics = asyncHandler(async (req, res) => {
    const supplierId = req.userId;
    const { period = '30' } = req.query; // days

    // Overall stats
    const statsQuery = `
        SELECT 
            COUNT(*) FILTER (WHERE status = 'active') as active_listings,
            SUM(views_count) as total_views,
            SUM(watchers_count) as total_watchers,
            SUM(inquiries_count) as total_inquiries,
            AVG(rating) as avg_rating,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '${parseInt(period)} days') as new_listings
        FROM products
        WHERE supplier_id = $1
    `;

    // Revenue stats from orders
    const revenueQuery = `
        SELECT 
            COUNT(DISTINCT o.id) as total_orders,
            SUM(oi.subtotal) as total_revenue,
            SUM(CASE WHEN o.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN oi.subtotal ELSE 0 END) as revenue_this_month,
            SUM(CASE WHEN o.created_at >= CURRENT_DATE - INTERVAL '60 days' AND o.created_at < CURRENT_DATE - INTERVAL '30 days' THEN oi.subtotal ELSE 0 END) as revenue_last_month
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.supplier_id = $1
    `;

    // Sales by category
    const categoryQuery = `
        SELECT 
            c.name as category,
            COUNT(p.id) as listing_count,
            SUM(p.views_count) as total_views,
            COALESCE(SUM(oi.subtotal), 0) as revenue
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN order_items oi ON p.id = oi.product_id
        WHERE p.supplier_id = $1
        GROUP BY c.name
        ORDER BY revenue DESC
        LIMIT 10
    `;

    // Performance metrics over time (daily for the period)
    const metricsQuery = `
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as listings_added,
            SUM(views_count) as total_views,
            SUM(watchers_count) as total_watchers
        FROM products
        WHERE supplier_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '${parseInt(period)} days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `;

    // Top performing products
    const topProductsQuery = `
        SELECT 
            id,
            title,
            image_url,
            price_after,
            views_count,
            watchers_count,
            inquiries_count,
            rating,
            review_count
        FROM products
        WHERE supplier_id = $1 AND status = 'active'
        ORDER BY views_count DESC
        LIMIT 10
    `;

    // Response time analytics (average time to respond to inquiries)
    const responseTimeQuery = `
        SELECT 
            AVG(EXTRACT(EPOCH FROM (responded_at - created_at))/3600) as avg_response_hours,
            COUNT(*) as total_inquiries,
            COUNT(*) FILTER (WHERE responded_at IS NOT NULL) as responded_inquiries
        FROM product_inquiries
        WHERE supplier_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '${parseInt(period)} days'
    `;

    const [stats, revenue, categories, metrics, topProducts, responseTime] = await Promise.all([
        db(statsQuery, [supplierId]),
        db(revenueQuery, [supplierId]),
        db(categoryQuery, [supplierId]),
        db(metricsQuery, [supplierId]),
        db(topProductsQuery, [supplierId]),
        db(responseTimeQuery, [supplierId]).catch(() => ({ rows: [{ avg_response_hours: 0, total_inquiries: 0, responded_inquiries: 0 }] }))
    ]);

    // Calculate growth percentages
    const revenueGrowth = revenue.rows[0].revenue_last_month > 0
        ? ((revenue.rows[0].revenue_this_month - revenue.rows[0].revenue_last_month) / revenue.rows[0].revenue_last_month * 100).toFixed(1)
        : 0;

    const responseRate = responseTime.rows[0].total_inquiries > 0
        ? (responseTime.rows[0].responded_inquiries / responseTime.rows[0].total_inquiries * 100).toFixed(1)
        : 0;

    res.json({
        success: true,
        message: 'Analytics retrieved successfully',
        data: {
            overview: {
                ...stats.rows[0],
                total_orders: parseInt(revenue.rows[0].total_orders) || 0,
                total_revenue: parseFloat(revenue.rows[0].total_revenue) || 0,
                revenue_this_month: parseFloat(revenue.rows[0].revenue_this_month) || 0,
                revenue_growth: parseFloat(revenueGrowth),
                avg_response_hours: parseFloat(responseTime.rows[0].avg_response_hours) || 0,
                response_rate: parseFloat(responseRate)
            },
            salesByCategory: categories.rows,
            performanceMetrics: metrics.rows,
            topProducts: topProducts.rows,
            period: parseInt(period)
        }
    });
});

/**
 * @route   GET /api/supplier/payments
 * @desc    Get supplier payment transactions
 * @access  Private (Supplier only)
 */
const getPayments = asyncHandler(async (req, res) => {
    const supplierId = req.userId;
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.supplier_id = $1';
    const params = [supplierId];
    let paramIndex = 2;

    if (status) {
        whereClause += ` AND p.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
    }

    if (startDate) {
        whereClause += ` AND p.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
    }

    if (endDate) {
        whereClause += ` AND p.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
    }

    // Get transactions
    const transactionsQuery = `
        SELECT 
            p.id,
            p.transaction_id,
            p.order_id,
            o.order_number,
            p.amount,
            p.payment_method,
            p.payment_gateway,
            p.status,
            p.created_at,
            p.updated_at,
            CONCAT(u.first_name, ' ', u.last_name) as buyer_name,
            u.company_name as buyer_company
        FROM payments p
        LEFT JOIN orders o ON p.order_id = o.id
        LEFT JOIN users u ON o.user_id = u.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    // Get summary stats
    const summaryQuery = `
        SELECT 
            COUNT(*) as total_transactions,
            SUM(amount) FILTER (WHERE status = 'completed') as total_received,
            SUM(amount) FILTER (WHERE status = 'pending') as pending_amount,
            SUM(amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND status = 'completed') as received_this_month
        FROM payments
        WHERE supplier_id = $1
    `;

    const [transactions, summary, count] = await Promise.all([
        db(transactionsQuery, params),
        db(summaryQuery, [supplierId]),
        db(`SELECT COUNT(*) as total FROM payments p ${whereClause}`, params.slice(0, paramIndex - 1))
    ]);

    res.json({
        success: true,
        message: 'Payments retrieved successfully',
        data: {
            transactions: transactions.rows,
            summary: summary.rows[0],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(count.rows[0].total),
                totalPages: Math.ceil(parseInt(count.rows[0].total) / limit)
            }
        }
    });
});

/**
 * @route   GET /api/supplier/invoices
 * @desc    Get supplier invoices
 * @access  Private (Supplier only)
 */
const getInvoices = asyncHandler(async (req, res) => {
    const supplierId = req.userId;
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE i.supplier_id = $1';
    const params = [supplierId];
    let paramIndex = 2;

    if (status && status !== 'all') {
        whereClause += ` AND i.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
    }

    const invoicesQuery = `
        SELECT 
            i.id,
            i.invoice_number,
            i.order_id,
            o.order_number,
            i.amount,
            i.tax_amount,
            i.total_amount,
            i.status,
            i.issue_date,
            i.due_date,
            i.paid_date,
            i.created_at,
            CONCAT(u.first_name, ' ', u.last_name) as buyer_name,
            u.company_name as buyer_company,
            u.business_email as buyer_email
        FROM invoices i
        LEFT JOIN orders o ON i.order_id = o.id
        LEFT JOIN users u ON o.user_id = u.id
        ${whereClause}
        ORDER BY i.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const [invoices, count] = await Promise.all([
        db(invoicesQuery, params),
        db(`SELECT COUNT(*) as total FROM invoices i ${whereClause}`, params.slice(0, paramIndex - 1))
    ]);

    res.json({
        success: true,
        message: 'Invoices retrieved successfully',
        data: {
            invoices: invoices.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(count.rows[0].total),
                totalPages: Math.ceil(parseInt(count.rows[0].total) / limit)
            }
        }
    });
});

/**
 * @route   GET /api/supplier/rfqs
 * @desc    Get RFQ opportunities for supplier
 * @access  Private (Supplier only)
 */
const getRFQs = asyncHandler(async (req, res) => {
    const supplierId = req.userId;
    const { page = 1, limit = 20, status = 'active', categoryId, industryId, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE r.status = $1';
    const params = [status];
    let paramIndex = 2;

    if (categoryId) {
        whereClause += ` AND r.category_id = $${paramIndex}`;
        params.push(categoryId);
        paramIndex++;
    }

    if (industryId) {
        whereClause += ` AND r.industry_id = $${paramIndex}`;
        params.push(industryId);
        paramIndex++;
    }

    if (search) {
        whereClause += ` AND (r.title ILIKE $${paramIndex} OR r.rfq_number ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    // Get RFQs with related data
    const rfqsQuery = `
        SELECT 
            r.id,
            r.rfq_number,
            r.title,
            r.quantity,
            r.unit,
            r.budget_min,
            r.budget_max,
            r.required_by_date,
            r.detailed_requirements,
            r.preferred_location,
            r.duration_days,
            r.status,
            r.view_count,
            r.quote_count,
            r.expires_at,
            r.created_at,
            c.name as category_name,
            i.name as industry_name,
            CONCAT(u.first_name, ' ', u.last_name) as buyer_name,
            u.company_name as buyer_company,
            u.city as buyer_city,
            u.state as buyer_state,
            EXISTS(
                SELECT 1 FROM quotes q 
                WHERE q.rfq_id = r.id AND q.supplier_id = $${paramIndex}
            ) as has_quoted
        FROM rfqs r
        LEFT JOIN categories c ON r.category_id = c.id
        LEFT JOIN industries i ON r.industry_id = i.id
        LEFT JOIN users u ON r.buyer_id = u.id
        ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;

    params.push(supplierId, limit, offset);

    // Get total count
    const countQuery = `
        SELECT COUNT(*) as total
        FROM rfqs r
        ${whereClause}
    `;

    const [rfqs, count] = await Promise.all([
        db(rfqsQuery, params),
        db(countQuery, params.slice(0, paramIndex - 1))
    ]);

    res.json({
        success: true,
        message: 'RFQs retrieved successfully',
        data: {
            rfqs: rfqs.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(count.rows[0].total),
                totalPages: Math.ceil(parseInt(count.rows[0].total) / limit)
            }
        }
    });
});

/**
 * @route   GET /api/supplier/rfqs/:id
 * @desc    Get RFQ details by ID
 * @access  Private (Supplier only)
 */
const getRFQById = asyncHandler(async (req, res) => {
    const supplierId = req.userId;
    const { id } = req.params;

    const rfqQuery = `
        SELECT 
            r.id,
            r.rfq_number,
            r.title,
            r.quantity,
            r.unit,
            r.budget_min,
            r.budget_max,
            r.required_by_date,
            r.detailed_requirements,
            r.preferred_location,
            r.duration_days,
            r.status,
            r.attachments,
            r.view_count,
            r.quote_count,
            r.expires_at,
            r.created_at,
            c.name as category_name,
            i.name as industry_name,
            CONCAT(u.first_name, ' ', u.last_name) as buyer_name,
            u.company_name as buyer_company,
            u.business_email as buyer_email,
            u.mobile as buyer_phone,
            u.city as buyer_city,
            u.state as buyer_state,
            EXISTS(
                SELECT 1 FROM quotes q 
                WHERE q.rfq_id = r.id AND q.supplier_id = $2
            ) as has_quoted,
            (
                SELECT json_build_object(
                    'id', q.id,
                    'quote_number', q.quote_number,
                    'quote_price', q.quote_price,
                    'status', q.status,
                    'created_at', q.created_at
                )
                FROM quotes q
                WHERE q.rfq_id = r.id AND q.supplier_id = $2
                LIMIT 1
            ) as my_quote
        FROM rfqs r
        LEFT JOIN categories c ON r.category_id = c.id
        LEFT JOIN industries i ON r.industry_id = i.id
        LEFT JOIN users u ON r.buyer_id = u.id
        WHERE r.id = $1
    `;

    const result = await db(rfqQuery, [id, supplierId]);

    if (result.rows.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'RFQ not found'
        });
    }

    // Increment view count
    await db('UPDATE rfqs SET view_count = view_count + 1 WHERE id = $1', [id]);

    res.json({
        success: true,
        message: 'RFQ retrieved successfully',
        data: {
            rfq: result.rows[0]
        }
    });
});

/**
 * @route   POST /api/supplier/rfqs/:id/quotes
 * @desc    Submit a quote for an RFQ
 * @access  Private (Supplier only)
 */
const submitQuote = asyncHandler(async (req, res) => {
    const supplierId = req.userId;
    const { id: rfqId } = req.params;
    const { quotePrice, deliveryDays, validUntil, notes } = req.body;

    // Validate required fields
    if (!quotePrice || !deliveryDays || !validUntil) {
        return res.status(400).json({
            success: false,
            message: 'Quote price, delivery days, and valid until date are required'
        });
    }

    // Check if RFQ exists and is active using Sequelize
    const rfq = await RFQ.findByPk(rfqId);

    if (!rfq) {
        return res.status(404).json({
            success: false,
            message: 'RFQ not found'
        });
    }

    if (rfq.status !== 'active') {
        return res.status(400).json({
            success: false,
            message: 'This RFQ is no longer accepting quotes'
        });
    }

    // Check if supplier has already submitted a quote using Sequelize
    const existingQuote = await Quote.findOne({
        where: {
            rfqId: rfqId,
            supplierId: supplierId
        }
    });

    if (existingQuote) {
        return res.status(400).json({
            success: false,
            message: 'You have already submitted a quote for this RFQ'
        });
    }

    // Generate quote number with date format (QT-YYYYMMDD-XXX)
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const quoteNumber = `QT-${dateStr}-${random}`;

    // Create quote using Sequelize (this will trigger hooks for RFQ count increment)
    const quote = await Quote.create({
        quoteNumber,
        rfqId,
        supplierId,
        buyerId: rfq.buyerId,
        quotePrice,
        quantity: rfq.quantity,
        unit: rfq.unit,
        deliveryDays,
        validUntil,
        notes,
        status: 'pending'
    });

    // Get buyer and supplier details for email notification
    const detailsQuery = `
        SELECT 
            u.business_email as buyer_email,
            CONCAT(u.first_name, ' ', u.last_name) as buyer_name,
            CONCAT(s.first_name, ' ', s.last_name) as supplier_name,
            s.company_name as supplier_company,
            s.business_email as supplier_email
        FROM users u
        CROSS JOIN users s
        WHERE u.id = $1 AND s.id = $2
    `;

    const details = await db(detailsQuery, [rfq.buyerId, supplierId]);

    if (details.rows.length > 0) {
        const { buyer_email, buyer_name, supplier_name, supplier_company } = details.rows[0];

        // Send email notification to buyer
        const emailService = require('../services/email.service');

        try {
            await emailService.sendEmail({
                to: buyer_email,
                subject: `New Quote Received for RFQ: ${rfq.title}`,
                template: 'new-quote-notification',
                data: {
                    buyerName: buyer_name,
                    rfqTitle: rfq.title,
                    rfqNumber: rfq.rfqNumber,
                    supplierName: supplier_name,
                    supplierCompany: supplier_company,
                    quotePrice: `₹${parseFloat(quotePrice).toLocaleString()}`,
                    deliveryDays: deliveryDays,
                    validUntil: new Date(validUntil).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    notes: notes || 'No additional notes provided',
                    viewQuoteUrl: `${process.env.FRONTEND_URL}/buyer/quotes/${quote.id}`
                }
            });
        } catch (emailError) {
            console.error('Error sending quote notification email:', emailError);
            // Don't fail the request if email fails
        }
    }

    res.status(201).json({
        success: true,
        message: 'Quote submitted successfully. The buyer has been notified.',
        data: {
            quote
        }
    });
});

/**
 * @route   GET /api/supplier/quotes
 * @desc    Get all quotes submitted by the supplier
 * @access  Private (Supplier only)
 */
const getQuotes = asyncHandler(async (req, res) => {
    const supplierId = req.userId;
    const { status, page = 1, limit = 50 } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE q.supplier_id = $1';
    const params = [supplierId];
    let paramIndex = 2;

    if (status && status !== 'all') {
        whereClause += ` AND q.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
    }

    const quotesQuery = `
        SELECT 
            q.id,
            q.quote_number,
            q.quote_price,
            q.delivery_days,
            q.valid_until,
            q.notes,
            q.status,
            q.created_at,
            q.updated_at,
            r.rfq_number,
            r.title as product_title,
            u.company_name as buyer_company_name,
            u.first_name as buyer_first_name,
            u.last_name as buyer_last_name
        FROM quotes q
        INNER JOIN rfqs r ON q.rfq_id = r.id
        INNER JOIN users u ON r.buyer_id = u.id
        ${whereClause}
        ORDER BY q.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const quotes = await db(quotesQuery, params);

    // Get total count
    const countQuery = `
        SELECT COUNT(*) as total
        FROM quotes q
        ${whereClause}
    `;
    const countResult = await db(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].total);

    res.json({
        success: true,
        message: 'Quotes retrieved successfully',
        data: {
            quotes: quotes.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        }
    });
});

module.exports = {
    getProfile,
    getMyListings,
    getListingById,
    createListing,
    updateListing,
    deleteListing,
    getDashboardStats,
    getSupplierOrders,
    updateOrderItemStatus,
    getAnalytics,
    getPayments,
    getInvoices,
    getRFQs,
    getRFQById,
    submitQuote,
    getQuotes
};
