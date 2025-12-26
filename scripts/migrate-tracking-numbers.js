require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
);

/**
 * Generate ZEERO tracking number
 * Format: ZEERO-YYYYMMDDHHMMSS-XXXXX
 */
function generateTrackingNumber(createdAt) {
    const date = new Date(createdAt);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    // Random 5 digits
    const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');

    return `ZEERO-${year}${month}${day}${hours}${minutes}${seconds}-${random}`;
}

async function migrateOrderNumbers() {
    try {
        console.log('Fetching all orders...\n');

        const { data: orders, error: fetchError } = await supabase
            .from('orders')
            .select('id, order_number, created_at');

        if (fetchError) {
            console.error('Error fetching orders:', fetchError);
            return;
        }

        if (!orders || orders.length === 0) {
            console.log('No orders found');
            return;
        }

        console.log(`Found ${orders.length} orders. Updating to ZEERO format...\n`);

        for (const order of orders) {
            const newTrackingNumber = generateTrackingNumber(order.created_at);

            const { error: updateError } = await supabase
                .from('orders')
                .update({ order_number: newTrackingNumber })
                .eq('id', order.id);

            if (updateError) {
                console.error(`❌ Failed to update order ${order.id}:`, updateError.message);
            } else {
                console.log(`✅ ${order.order_number} → ${newTrackingNumber}`);
            }
        }

        console.log('\n✅ Migration completed!');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

migrateOrderNumbers();
