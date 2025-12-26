require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
);

async function checkOrders() {
    try {
        console.log('Fetching all orders...\n');

        const { data: orders, error } = await supabase
            .from('orders')
            .select('id, order_number, user_id, status, created_at')
            .limit(10);

        if (error) {
            console.error('Error fetching orders:', error);
            return;
        }

        if (!orders || orders.length === 0) {
            console.log('No orders found in database');
            return;
        }

        console.log(`Found ${orders.length} orders:\n`);
        orders.forEach((order, index) => {
            console.log(`${index + 1}. Order Number: ${order.order_number}`);
            console.log(`   Order ID: ${order.id}`);
            console.log(`   User ID: ${order.user_id}`);
            console.log(`   Status: ${order.status}`);
            console.log(`   Created: ${order.created_at}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkOrders();
