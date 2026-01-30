const express = require('express');
const router = express.Router();
const emailService = require('../services/email.service');

// Test endpoint for sending order confirmation email
router.post('/test-order-email', async (req, res) => {
    try {
        const { email, orderNumber, buyerName } = req.body;

        if (!email || !orderNumber || !buyerName) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: email, orderNumber, buyerName'
            });
        }

        console.log(`\n🧪 TEST ENDPOINT: Sending order confirmation email`);
        console.log(`   Email: ${email}`);
        console.log(`   Order: ${orderNumber}`);
        console.log(`   Buyer: ${buyerName}\n`);

        const result = await emailService.sendOrderConfirmation(email, {
            orderNumber: orderNumber,
            buyerName: buyerName,
            items: [
                {
                    name: 'Test Product',
                    quantity: 1,
                    price: 5000,
                    totalPrice: 5000
                }
            ],
            totalAmount: 5000,
            paymentMethod: 'card',
            shippingAddress: {
                name: buyerName,
                address: '123 Test St',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
                phone: '9999999999'
            },
            estimatedDelivery: '2026-02-05'
        });

        if (result) {
            res.status(200).json({
                success: true,
                message: 'Test order confirmation email sent successfully!',
                email: email,
                orderNumber: orderNumber
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send test order confirmation email'
            });
        }
    } catch (error) {
        console.error('❌ Test endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending test email',
            error: error.message
        });
    }
});

// Test endpoint for sending supplier order notification
router.post('/test-supplier-email', async (req, res) => {
    try {
        const { email, supplierName, orderNumber, buyerCompany } = req.body;

        if (!email || !supplierName || !orderNumber || !buyerCompany) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: email, supplierName, orderNumber, buyerCompany'
            });
        }

        console.log(`\n🧪 TEST ENDPOINT: Sending supplier order notification`);
        console.log(`   Email: ${email}`);
        console.log(`   Supplier: ${supplierName}`);
        console.log(`   Order: ${orderNumber}\n`);

        const result = await emailService.sendNewOrderToSupplier(email, {
            supplierName: supplierName,
            orderNumber: orderNumber,
            buyerCompany: buyerCompany,
            items: [
                {
                    name: 'Test Product',
                    quantity: 1,
                    price: 5000
                }
            ],
            totalAmount: 5000,
            shippingAddress: {
                name: 'Buyer Name',
                address: '123 Test St',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
                phone: '9999999999'
            }
        });

        if (result) {
            res.status(200).json({
                success: true,
                message: 'Test supplier notification email sent successfully!',
                email: email,
                supplierName: supplierName
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send test supplier notification email'
            });
        }
    } catch (error) {
        console.error('❌ Test endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending test supplier email',
            error: error.message
        });
    }
});

module.exports = router;
