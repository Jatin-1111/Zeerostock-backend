const { query: db } = require('../config/database');
const { AppError, ERROR_CODES, asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/supplier/payment-methods
 * @desc    Get all payment methods for the authenticated supplier
 * @access  Private (Supplier only)
 */
const getPaymentMethods = asyncHandler(async (req, res) => {
    const supplierId = req.userId;

    const query = `
        SELECT 
            id,
            type,
            is_primary,
            is_verified,
            status,
            card_last_four,
            card_brand,
            card_holder_name,
            card_expiry_month,
            card_expiry_year,
            bank_account_holder_name,
            bank_account_number_last_four,
            bank_name,
            paypal_email,
            upi_id,
            upi_provider,
            nickname,
            processing_fee_percent,
            processing_time,
            created_at,
            last_used_at,
            verified_at
        FROM payment_methods
        WHERE supplier_id = $1
        ORDER BY is_primary DESC, created_at DESC
    `;

    const result = await db(query, [supplierId]);

    res.json({
        success: true,
        message: 'Payment methods retrieved successfully',
        data: result.rows
    });
});

/**
 * @route   POST /api/supplier/payment-methods
 * @desc    Add a new payment method
 * @access  Private (Supplier only)
 */
const addPaymentMethod = asyncHandler(async (req, res) => {
    const supplierId = req.userId;
    const { type, ...paymentData } = req.validatedBody;

    let query, params;

    if (type === 'card') {
        const {
            cardNumber,
            expiryDate,
            cvv,
            cardName,
            nickname
        } = paymentData;

        // Extract last 4 digits
        const last4 = cardNumber.slice(-4);

        // Extract expiry month and year
        const [month, year] = expiryDate.split('/');
        const expiryYear = parseInt('20' + year);
        const expiryMonth = parseInt(month);

        // TODO: Integrate with payment gateway to tokenize card
        // For now, we'll store a placeholder token
        const cardToken = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Detect card brand (simplified)
        let cardBrand = 'Unknown';
        if (cardNumber.startsWith('4')) cardBrand = 'Visa';
        else if (cardNumber.startsWith('5')) cardBrand = 'Mastercard';
        else if (cardNumber.startsWith('3')) cardBrand = 'American Express';

        query = `
            INSERT INTO payment_methods (
                supplier_id, type, card_last_four, card_brand, card_holder_name,
                card_expiry_month, card_expiry_year, card_token, nickname,
                processing_fee_percent, processing_time, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;

        params = [
            supplierId,
            'card',
            last4,
            cardBrand,
            cardName,
            expiryMonth,
            expiryYear,
            cardToken,
            nickname || `${cardBrand} ending in ${last4}`,
            2.9,
            'Instant',
            'pending_verification'
        ];

    } else if (type === 'bank' || type === 'escrow') {
        const { emailId, password, nickname } = paymentData;

        // TODO: Integrate with PayPal/Escrow API for verification

        query = `
            INSERT INTO payment_methods (
                supplier_id, type, paypal_email, bank_account_type, nickname,
                processing_fee_percent, processing_time, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        params = [
            supplierId,
            'bank',
            emailId,
            'escrow',
            nickname || `PayPal (${emailId})`,
            2.5,
            '2-14 days',
            'pending_verification'
        ];

    } else if (type === 'upi') {
        const { upiId, nickname } = paymentData;

        // Validate UPI ID format
        const upiRegex = /^[\w.-]+@[\w.-]+$/;
        if (!upiRegex.test(upiId)) {
            throw new AppError('Invalid UPI ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        }

        // Detect UPI provider
        let upiProvider = 'Unknown';
        if (upiId.includes('@paytm')) upiProvider = 'Paytm';
        else if (upiId.includes('@ybl')) upiProvider = 'PhonePe';
        else if (upiId.includes('@okaxis') || upiId.includes('@okhdfcbank')) upiProvider = 'Google Pay';

        query = `
            INSERT INTO payment_methods (
                supplier_id, type, upi_id, upi_provider, nickname,
                processing_fee_percent, processing_time, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        params = [
            supplierId,
            'upi',
            upiId,
            upiProvider,
            nickname || `UPI (${upiId})`,
            0,
            'Instant',
            'pending_verification'
        ];
    } else {
        throw new AppError('Invalid payment method type', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await db(query, params);

    res.status(201).json({
        success: true,
        message: 'Payment method added successfully',
        data: result.rows[0]
    });
});

/**
 * @route   PUT /api/supplier/payment-methods/:id/set-primary
 * @desc    Set a payment method as primary
 * @access  Private (Supplier only)
 */
const setPrimaryPaymentMethod = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const supplierId = req.userId;

    // Verify ownership
    const checkQuery = `
        SELECT id FROM payment_methods
        WHERE id = $1 AND supplier_id = $2
    `;
    const checkResult = await db(checkQuery, [id, supplierId]);

    if (checkResult.rows.length === 0) {
        throw new AppError(
            'Payment method not found or you do not have permission',
            404,
            ERROR_CODES.NOT_FOUND
        );
    }

    // Set as primary (trigger will handle unsetting others)
    const updateQuery = `
        UPDATE payment_methods
        SET is_primary = TRUE
        WHERE id = $1
        RETURNING *
    `;

    const result = await db(updateQuery, [id]);

    res.json({
        success: true,
        message: 'Primary payment method updated successfully',
        data: result.rows[0]
    });
});

/**
 * @route   DELETE /api/supplier/payment-methods/:id
 * @desc    Delete a payment method
 * @access  Private (Supplier only)
 */
const deletePaymentMethod = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const supplierId = req.userId;

    // Check if it's the primary method
    const checkQuery = `
        SELECT is_primary FROM payment_methods
        WHERE id = $1 AND supplier_id = $2
    `;
    const checkResult = await db(checkQuery, [id, supplierId]);

    if (checkResult.rows.length === 0) {
        throw new AppError(
            'Payment method not found or you do not have permission',
            404,
            ERROR_CODES.NOT_FOUND
        );
    }

    if (checkResult.rows[0].is_primary) {
        throw new AppError(
            'Cannot delete primary payment method. Set another method as primary first.',
            400,
            ERROR_CODES.VALIDATION_ERROR
        );
    }

    const deleteQuery = `
        DELETE FROM payment_methods
        WHERE id = $1 AND supplier_id = $2
    `;

    await db(deleteQuery, [id, supplierId]);

    res.json({
        success: true,
        message: 'Payment method deleted successfully'
    });
});

/**
 * @route   POST /api/supplier/payment-methods/:id/verify
 * @desc    Verify a payment method (for UPI/Bank)
 * @access  Private (Supplier only)
 */
const verifyPaymentMethod = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const supplierId = req.userId;

    // Get payment method details
    const getQuery = `
        SELECT * FROM payment_methods
        WHERE id = $1 AND supplier_id = $2
    `;
    const getResult = await db(getQuery, [id, supplierId]);

    if (getResult.rows.length === 0) {
        throw new AppError(
            'Payment method not found or you do not have permission',
            404,
            ERROR_CODES.NOT_FOUND
        );
    }

    const paymentMethod = getResult.rows[0];

    // TODO: Implement actual verification logic based on type
    // For now, we'll just mark it as verified

    const updateQuery = `
        UPDATE payment_methods
        SET is_verified = TRUE,
            status = 'active',
            verified_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
    `;

    const result = await db(updateQuery, [id]);

    res.json({
        success: true,
        message: 'Payment method verified successfully',
        data: result.rows[0]
    });
});

module.exports = {
    getPaymentMethods,
    addPaymentMethod,
    setPrimaryPaymentMethod,
    deletePaymentMethod,
    verifyPaymentMethod
};
