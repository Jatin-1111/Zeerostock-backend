const emailService = require('../src/services/email.service');
require('dotenv').config();

async function testOrderEmail() {
    console.log('🧪 Testing Order Confirmation Email\n');

    try {
        const testEmail = 'test@example.com'; // Change this to your email

        console.log(`📧 Sending test order confirmation email to: ${testEmail}\n`);

        const result = await emailService.sendOrderConfirmation(testEmail, {
            orderNumber: 'ORD-TEST-001',
            buyerName: 'Test Buyer',
            items: [
                {
                    name: 'Test Product 1',
                    quantity: 2,
                    price: 5000,
                    totalPrice: 10000
                },
                {
                    name: 'Test Product 2',
                    quantity: 1,
                    price: 3000,
                    totalPrice: 3000
                }
            ],
            totalAmount: 13000,
            paymentMethod: 'card',
            shippingAddress: {
                name: 'John Doe',
                address: '123 Main St',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
                phone: '9999999999'
            },
            estimatedDelivery: '2026-02-05'
        });

        if (result) {
            console.log('\n✅ Test email sent successfully!');
            console.log('Check your inbox for the test order confirmation email.');
        } else {
            console.log('\n❌ Failed to send test email');
        }

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

testOrderEmail();
