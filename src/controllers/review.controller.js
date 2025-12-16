const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const NotificationService = require('../services/notification.service');

/**
 * Review Controllers
 * Handles product reviews and ratings operations
 */

/**
 * POST /api/buyer/reviews
 * Create a new review
 */
const createReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, orderId, rating, title, comment, images, videos } = req.body;

        // Verify product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                errorCode: 'PRODUCT_NOT_FOUND',
                message: 'Product not found'
            });
        }

        // Check if buyer can review
        const canReview = await Review.canReview(userId, productId, orderId);
        if (!canReview) {
            return res.status(400).json({
                success: false,
                errorCode: 'REVIEW_ALREADY_EXISTS',
                message: 'You have already reviewed this product'
            });
        }

        // If orderId is provided, verify the order
        let isVerifiedPurchase = false;
        if (orderId) {
            const order = await Order.findById(orderId);
            if (order && order.user_id === userId) {
                isVerifiedPurchase = true;
            }
        }

        // Create review
        const review = await Review.create({
            product_id: productId,
            buyer_id: userId,
            order_id: orderId || null,
            rating,
            title: title || null,
            comment,
            images: images || [],
            videos: videos || [],
            is_verified_purchase: isVerifiedPurchase
        });

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully. It will be visible after approval.',
            data: {
                reviewId: review.id,
                productId: review.product_id,
                rating: review.rating,
                status: review.status,
                isVerifiedPurchase: review.is_verified_purchase,
                createdAt: review.created_at
            }
        });

    } catch (error) {
        console.error('Error creating review:', error);

        if (error.message === 'REVIEW_ALREADY_EXISTS') {
            return res.status(400).json({
                success: false,
                errorCode: 'REVIEW_ALREADY_EXISTS',
                message: 'You have already reviewed this product'
            });
        }

        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to submit review'
        });
    }
};

/**
 * GET /api/buyer/reviews/my-reviews
 * Get buyer's reviews
 */
const getMyReviews = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit } = req.query;

        const result = await Review.getByBuyerId(userId, { page, limit });

        // Format the response
        const formattedReviews = result.reviews.map(review => ({
            reviewId: review.id,

            // Product info
            product: {
                id: review.products.id,
                title: review.products.title,
                slug: review.products.slug,
                image: review.products.images?.[0] || null
            },

            // Review content
            rating: review.rating,
            title: review.title,
            comment: review.comment,
            images: review.images,
            videos: review.videos,

            // Status
            status: review.status,
            isVisible: review.is_visible,
            isVerifiedPurchase: review.is_verified_purchase,

            // Engagement
            helpfulCount: review.helpful_count,
            notHelpfulCount: review.not_helpful_count,

            // Supplier response
            supplierResponse: review.supplier_response,
            supplierResponseDate: review.supplier_response_date,

            // Timestamps
            createdAt: review.created_at,
            updatedAt: review.updated_at
        }));

        res.json({
            success: true,
            message: 'Your reviews retrieved successfully',
            data: {
                reviews: formattedReviews,
                pagination: result.pagination
            }
        });

    } catch (error) {
        console.error('Error getting buyer reviews:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve your reviews'
        });
    }
};

/**
 * GET /api/buyer/reviews/:reviewId
 * Get specific review details
 */
const getReviewById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reviewId } = req.params;

        const review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                errorCode: 'REVIEW_NOT_FOUND',
                message: 'Review not found'
            });
        }

        // Verify review belongs to user
        if (review.buyer_id !== userId) {
            return res.status(403).json({
                success: false,
                errorCode: 'FORBIDDEN',
                message: 'You do not have access to this review'
            });
        }

        const formattedReview = {
            reviewId: review.id,

            // Product info
            product: {
                id: review.products.id,
                title: review.products.title,
                image: review.products.images?.[0] || null
            },

            // Review content
            rating: review.rating,
            title: review.title,
            comment: review.comment,
            images: review.images,
            videos: review.videos,

            // Status
            status: review.status,
            isVisible: review.is_visible,
            isVerifiedPurchase: review.is_verified_purchase,

            // Engagement
            helpfulCount: review.helpful_count,
            notHelpfulCount: review.not_helpful_count,

            // Supplier response
            supplierResponse: review.supplier_response,
            supplierResponseDate: review.supplier_response_date,

            // Timestamps
            createdAt: review.created_at,
            updatedAt: review.updated_at
        };

        res.json({
            success: true,
            message: 'Review details retrieved successfully',
            data: formattedReview
        });

    } catch (error) {
        console.error('Error getting review details:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve review details'
        });
    }
};

/**
 * PUT /api/buyer/reviews/:reviewId
 * Update a review
 */
const updateReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reviewId } = req.params;
        const updateData = req.body;

        // Get existing review
        const existingReview = await Review.findById(reviewId);

        if (!existingReview) {
            return res.status(404).json({
                success: false,
                errorCode: 'REVIEW_NOT_FOUND',
                message: 'Review not found'
            });
        }

        if (existingReview.buyer_id !== userId) {
            return res.status(403).json({
                success: false,
                errorCode: 'FORBIDDEN',
                message: 'You can only update your own reviews'
            });
        }

        // Update review
        const updatedReview = await Review.update(reviewId, userId, {
            ...updateData,
            status: 'pending', // Reset to pending after edit
            is_visible: false
        });

        res.json({
            success: true,
            message: 'Review updated successfully. It will be reviewed again.',
            data: {
                reviewId: updatedReview.id,
                status: updatedReview.status,
                updatedAt: updatedReview.updated_at
            }
        });

    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to update review'
        });
    }
};

/**
 * DELETE /api/buyer/reviews/:reviewId
 * Delete a review
 */
const deleteReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reviewId } = req.params;

        const review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                errorCode: 'REVIEW_NOT_FOUND',
                message: 'Review not found'
            });
        }

        if (review.buyer_id !== userId) {
            return res.status(403).json({
                success: false,
                errorCode: 'FORBIDDEN',
                message: 'You can only delete your own reviews'
            });
        }

        await Review.delete(reviewId, userId);

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to delete review'
        });
    }
};

/**
 * POST /api/buyer/reviews/:reviewId/helpful
 * Mark review as helpful/not helpful
 */
const markReviewHelpfulness = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reviewId } = req.params;
        const { isHelpful } = req.body;

        await Review.markHelpfulness(reviewId, userId, isHelpful);

        res.json({
            success: true,
            message: 'Thank you for your feedback'
        });

    } catch (error) {
        console.error('Error marking review helpfulness:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to submit feedback'
        });
    }
};

/**
 * GET /api/products/:productId/reviews
 * Get product reviews (public endpoint)
 */
const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const { page, limit, rating } = req.query;

        const result = await Review.getByProductId(productId, { page, limit, rating });

        // Format the response
        const formattedReviews = result.reviews.map(review => ({
            reviewId: review.id,

            // Buyer info (anonymized)
            buyer: {
                name: `${review.users.first_name} ${review.users.last_name.charAt(0)}.`,
                isVerifiedPurchase: review.is_verified_purchase
            },

            // Review content
            rating: review.rating,
            title: review.title,
            comment: review.comment,
            images: review.images,
            videos: review.videos,

            // Engagement
            helpfulCount: review.helpful_count,
            notHelpfulCount: review.not_helpful_count,

            // Supplier response
            supplierResponse: review.supplier_response,
            supplierResponseDate: review.supplier_response_date,

            // Timestamps
            createdAt: review.created_at
        }));

        // Get review summary
        const summary = await Review.getReviewSummary(productId);

        res.json({
            success: true,
            message: 'Product reviews retrieved successfully',
            data: {
                reviews: formattedReviews,
                pagination: result.pagination,
                summary
            }
        });

    } catch (error) {
        console.error('Error getting product reviews:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve product reviews'
        });
    }
};

module.exports = {
    createReview,
    getMyReviews,
    getReviewById,
    updateReview,
    deleteReview,
    markReviewHelpfulness,
    getProductReviews
};
