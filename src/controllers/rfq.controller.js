const RFQ = require('../models/RFQ');
const Quote = require('../models/Quote');
const Category = require('../models/Category');
const Industry = require('../models/Industry');
const User = require('../models/User');
const { Op } = require('sequelize');

/**
 * RFQ Controller
 * Handles all buyer RFQ operations
 */

/**
 * Create new RFQ
 * @route POST /api/buyer/rfq/create
 */
exports.createRFQ = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const {
            title,
            categoryId,
            industryId,
            quantity,
            unit,
            budgetMin,
            budgetMax,
            requiredByDate,
            detailedRequirements,
            preferredLocation,
            durationDays,
            attachments
        } = req.body;

        // Create RFQ
        const rfq = await RFQ.create({
            buyerId,
            title,
            categoryId,
            industryId,
            quantity,
            unit,
            budgetMin,
            budgetMax,
            requiredByDate,
            detailedRequirements,
            preferredLocation,
            durationDays: durationDays || 7,
            attachments: attachments || [],
            status: 'active'
        });

        // Fetch created RFQ with associations
        const createdRFQ = await RFQ.findByPk(rfq.id, {
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                },
                {
                    model: Industry,
                    as: 'industry',
                    attributes: ['id', 'name']
                }
            ]
        });

        res.status(201).json({
            success: true,
            data: {
                rfq: createdRFQ
            },
            message: 'RFQ created successfully'
        });
    } catch (error) {
        console.error('Create RFQ error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to create RFQ',
                details: error.message
            }
        });
    }
};

/**
 * Get buyer's RFQs with pagination and filters
 * @route GET /api/buyer/rfq/list
 */
exports.getMyRFQs = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const {
            page = 1,
            limit = 10,
            status,
            categoryId,
            search
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build where clause
        const where = { buyerId };

        if (status) {
            where.status = status;
        }

        if (categoryId) {
            where.categoryId = categoryId;
        }

        if (search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { rfqNumber: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Fetch RFQs
        const { count, rows: rfqs } = await RFQ.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset,
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                },
                {
                    model: Industry,
                    as: 'industry',
                    attributes: ['id', 'name']
                }
            ]
        });

        res.json({
            success: true,
            data: {
                items: rfqs,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / parseInt(limit)),
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: offset + rfqs.length < count,
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (error) {
        console.error('Get RFQs error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch RFQs',
                details: error.message
            }
        });
    }
};

/**
 * Get RFQ details by ID with quotes
 * @route GET /api/buyer/rfq/:rfqId
 */
exports.getRFQById = async (req, res) => {
    try {
        const { rfqId } = req.params;
        const buyerId = req.user.id;

        const rfq = await RFQ.findOne({
            where: { id: rfqId, buyerId },
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                },
                {
                    model: Industry,
                    as: 'industry',
                    attributes: ['id', 'name']
                },
                {
                    model: Quote,
                    as: 'quotes',
                    include: [
                        {
                            model: User,
                            as: 'supplier',
                            attributes: ['id', 'fullName', 'companyName', 'email', 'phone']
                        }
                    ]
                }
            ]
        });

        if (!rfq) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'RFQ not found',
                    code: 'RFQ_NOT_FOUND'
                }
            });
        }

        // Increment view count if not already viewed recently
        await rfq.increment('viewCount');

        res.json({
            success: true,
            data: {
                rfq,
                quotes: rfq.quotes || []
            }
        });
    } catch (error) {
        console.error('Get RFQ error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch RFQ',
                details: error.message
            }
        });
    }
};

/**
 * Update RFQ
 * @route PUT /api/buyer/rfq/:rfqId
 */
exports.updateRFQ = async (req, res) => {
    try {
        const { rfqId } = req.params;
        const buyerId = req.user.id;
        const updateData = req.body;

        const rfq = await RFQ.findOne({
            where: { id: rfqId, buyerId }
        });

        if (!rfq) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'RFQ not found',
                    code: 'RFQ_NOT_FOUND'
                }
            });
        }

        // Check if RFQ can be updated (only active RFQs)
        if (rfq.status !== 'active') {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Cannot update closed or expired RFQ',
                    code: 'RFQ_NOT_EDITABLE'
                }
            });
        }

        // Update RFQ
        await rfq.update(updateData);

        // Fetch updated RFQ with associations
        const updatedRFQ = await RFQ.findByPk(rfq.id, {
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                },
                {
                    model: Industry,
                    as: 'industry',
                    attributes: ['id', 'name']
                }
            ]
        });

        res.json({
            success: true,
            data: {
                rfq: updatedRFQ
            },
            message: 'RFQ updated successfully'
        });
    } catch (error) {
        console.error('Update RFQ error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to update RFQ',
                details: error.message
            }
        });
    }
};

/**
 * Close/Cancel RFQ
 * @route PUT /api/buyer/rfq/:rfqId/close
 */
exports.closeRFQ = async (req, res) => {
    try {
        const { rfqId } = req.params;
        const buyerId = req.user.id;
        const { reason } = req.body;

        const rfq = await RFQ.findOne({
            where: { id: rfqId, buyerId }
        });

        if (!rfq) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'RFQ not found',
                    code: 'RFQ_NOT_FOUND'
                }
            });
        }

        // Update status to closed
        await rfq.update({
            status: 'closed',
            // Store reason in a custom field if needed
        });

        // Update all pending quotes to expired
        await Quote.update(
            { status: 'expired' },
            {
                where: {
                    rfqId: rfq.id,
                    status: 'pending'
                }
            }
        );

        res.json({
            success: true,
            data: {
                rfq
            },
            message: 'RFQ closed successfully'
        });
    } catch (error) {
        console.error('Close RFQ error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to close RFQ',
                details: error.message
            }
        });
    }
};

/**
 * Get RFQ categories
 * @route GET /api/buyer/rfq/categories
 */
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.getAll();

        res.json({
            success: true,
            message: 'Categories retrieved successfully',
            data: {
                categories,
                count: categories.length
            }
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch categories',
                details: error.message
            }
        });
    }
};

/**
 * Get RFQ industries
 * @route GET /api/buyer/rfq/industries
 */
exports.getIndustries = async (req, res) => {
    try {
        const industries = await Industry.getAll();

        res.json({
            success: true,
            message: 'Industries retrieved successfully',
            data: {
                industries,
                count: industries.length
            }
        });
    } catch (error) {
        console.error('Get industries error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch industries',
                details: error.message
            }
        });
    }
};

/**
 * Get RFQ statistics for dashboard
 * @route GET /api/buyer/rfq/stats
 */
exports.getRFQStats = async (req, res) => {
    try {
        const buyerId = req.user.id;

        const [active, closed, expired, totalQuotes] = await Promise.all([
            RFQ.count({ where: { buyerId, status: 'active' } }),
            RFQ.count({ where: { buyerId, status: 'closed' } }),
            RFQ.count({ where: { buyerId, status: 'expired' } }),
            RFQ.sum('quoteCount', { where: { buyerId } })
        ]);

        res.json({
            success: true,
            data: {
                activeRFQs: active || 0,
                closedRFQs: closed || 0,
                expiredRFQs: expired || 0,
                totalRFQs: (active || 0) + (closed || 0) + (expired || 0),
                totalQuotesReceived: totalQuotes || 0
            }
        });
    } catch (error) {
        console.error('Get RFQ stats error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch RFQ statistics',
                details: error.message
            }
        });
    }
};

/**
 * Delete RFQ (soft delete by closing)
 * @route DELETE /api/buyer/rfq/:rfqId
 */
exports.deleteRFQ = async (req, res) => {
    try {
        const { rfqId } = req.params;
        const buyerId = req.user.id;

        const rfq = await RFQ.findOne({
            where: { id: rfqId, buyerId }
        });

        if (!rfq) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'RFQ not found',
                    code: 'RFQ_NOT_FOUND'
                }
            });
        }

        // Soft delete by closing
        await rfq.update({ status: 'closed' });

        res.json({
            success: true,
            message: 'RFQ deleted successfully'
        });
    } catch (error) {
        console.error('Delete RFQ error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to delete RFQ',
                details: error.message
            }
        });
    }
};
