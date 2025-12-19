/**
 * Seed Demo Products Script
 * Adds 5 demo products with Unsplash placeholder images
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Demo products with diverse industrial equipment
const demoProducts = [
    {
        title: "Industrial Steel Beams - Grade A36",
        slug: "industrial-steel-beams-grade-a36",
        description: "High-quality structural steel beams, Grade A36, perfect for construction and manufacturing projects. Heat-treated and certified. Available in various lengths from 20ft to 40ft. Specifications: Material Grade - ASTM A36, Heat Treatment - 6161º-6190º, Coating - Hot Dipped Galvanized, Certification - API 5L, ASTM A36. Free shipping on orders above ₹1,00,000. 1 year manufacturer warranty. 30-day return policy.",
        price_before: 85000,
        price_after: 65000,
        discount_percent: 23.53,
        image_url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&h=600&fit=crop",
        gallery_images: [
            "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&h=600&fit=crop"
        ],
        condition: "new",
        quantity: 500,
        unit: "units",
        city: "Mumbai",
        state: "Maharashtra",
        listing_type: "direct_sale",
        is_featured: true,
        is_trending: true,
        status: "active"
    },
    {
        title: "CNC Milling Machine - 3-Axis Desktop",
        slug: "cnc-milling-machine-3-axis-desktop",
        description: "Precision CNC milling machine with 3-axis control. Perfect for small to medium manufacturing operations. Includes software and training materials. Low hours, excellent condition. Specs: Working area 600x400x300mm, Spindle 0-10,000 RPM, Accuracy ±0.01mm, 3-phase 5kW. Freight shipping available. 6 months warranty.",
        price_before: 450000,
        price_after: 325000,
        discount_percent: 27.78,
        image_url: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&h=600&fit=crop",
        gallery_images: [
            "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=800&h=600&fit=crop"
        ],
        condition: "used",
        quantity: 2,
        unit: "units",
        city: "Pune",
        state: "Maharashtra",
        listing_type: "direct_sale",
        is_sponsored: true,
        is_featured: true,
        status: "active"
    },
    {
        title: "Industrial Air Compressor - 100HP",
        slug: "industrial-air-compressor-100hp",
        description: "Heavy-duty rotary screw air compressor, 100HP capacity. Energy-efficient design with advanced cooling system. Ideal for large manufacturing facilities, workshops, and industrial applications. Specs: 100HP/75kW, 550 CFM @ 125 PSI, Air-cooled, 72 dB(A). Specialized freight shipping available. 1 year warranty.",
        price_before: 550000,
        price_after: 425000,
        discount_percent: 22.73,
        image_url: "https://images.unsplash.com/photo-1581092918484-8313e1f7e8c3?w=800&h=600&fit=crop",
        gallery_images: [
            "https://images.unsplash.com/photo-1581092918484-8313e1f7e8c3?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1581092160366-9c0c5c0f4c82?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=800&h=600&fit=crop"
        ],
        condition: "refurbished",
        quantity: 5,
        unit: "units",
        city: "Ahmedabad",
        state: "Gujarat",
        listing_type: "direct_sale",
        is_trending: true,
        status: "active"
    },
    {
        title: "Hydraulic Press - 50 Ton Capacity",
        slug: "hydraulic-press-50-ton-capacity",
        description: "Robust hydraulic press with 50-ton capacity. Suitable for metal forming, stamping, and assembly operations. Features adjustable pressure control and safety guards. Well-maintained with service records. Specs: 50 Ton capacity, 900mm working height, 600x500mm table, 7.5HP pump. Freight shipping available.",
        price_before: 280000,
        price_after: 215000,
        discount_percent: 23.21,
        image_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&h=600&fit=crop",
        gallery_images: [
            "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1581092918484-8313e1f7e8c3?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop"
        ],
        condition: "used",
        quantity: 3,
        unit: "units",
        city: "Coimbatore",
        state: "Tamil Nadu",
        listing_type: "direct_sale",
        is_featured: true,
        status: "active"
    },
    {
        title: "Industrial Conveyor Belt System - 20 Meters",
        slug: "industrial-conveyor-belt-system-20-meters",
        description: "Heavy-duty conveyor belt system, 20 meters length. Modular design allows for easy customization. Includes electric motor, control panel, and adjustable speed drive. Perfect for warehouses and production lines. Specs: 20m length, 600mm width, 100 kg/m capacity, variable speed 0.2-2.0 m/s, 3HP motor. Installation manual included.",
        price_before: 175000,
        price_after: 135000,
        discount_percent: 22.86,
        image_url: "https://images.unsplash.com/photo-1581092160366-9c0c5c0f4c82?w=800&h=600&fit=crop",
        gallery_images: [
            "https://images.unsplash.com/photo-1581092160366-9c0c5c0f4c82?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&h=600&fit=crop"
        ],
        condition: "surplus",
        quantity: 8,
        unit: "systems",
        city: "Bangalore",
        state: "Karnataka",
        listing_type: "direct_sale",
        is_sponsored: true,
        is_trending: true,
        status: "active"
    }
];

async function seedDemoProducts() {
    try {
        console.log('🌱 Starting demo products seeding...\n');

        // Get first supplier user or create a demo supplier
        let { data: supplierUser, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'supplier')
            .limit(1)
            .single();

        if (userError || !supplierUser) {
            console.log('⚠️  No supplier found, creating demo supplier...');

            const { data: newSupplier, error: createError } = await supabase
                .from('users')
                .insert({
                    first_name: 'Demo',
                    last_name: 'Supplier',
                    company_name: 'Industrial Surplus Co.',
                    business_email: 'demo.supplier@zeerostock.com',
                    mobile: '+919999999999',
                    password_hash: '$2b$10$dummyhashfordemopurposes',
                    business_type: 'Manufacturer',
                    role: 'supplier',
                    is_verified: true,
                    is_active: true
                })
                .select()
                .single();

            if (createError) {
                console.error('❌ Failed to create demo supplier:', createError.message);
                process.exit(1);
            }

            supplierUser = newSupplier;
            console.log('✅ Demo supplier created\n');
        }

        // Get first category or create a demo category
        let { data: category, error: categoryError } = await supabase
            .from('categories')
            .select('id')
            .limit(1)
            .single();

        if (categoryError || !category) {
            console.log('⚠️  No category found, creating demo category...');

            const { data: newCategory, error: createCategoryError } = await supabase
                .from('categories')
                .insert({
                    name: 'Industrial Equipment',
                    slug: 'industrial-equipment',
                    description: 'Heavy machinery and industrial equipment',
                    image_url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop'
                })
                .select()
                .single();

            if (createCategoryError) {
                console.error('❌ Failed to create demo category:', createCategoryError.message);
                process.exit(1);
            }

            category = newCategory;
            console.log('✅ Demo category created\n');
        }

        // Check if industry table exists and get first industry
        let industryId = null;
        const { data: industry } = await supabase
            .from('industries')
            .select('id')
            .limit(1)
            .single();

        if (industry) {
            industryId = industry.id;
        }

        console.log('📦 Inserting demo products...\n');

        let successCount = 0;
        let errorCount = 0;

        for (const product of demoProducts) {
            try {
                const productData = {
                    ...product,
                    category_id: category.id,
                    supplier_id: supplierUser.id,
                    industry_id: industryId,
                    gallery_images: JSON.stringify(product.gallery_images)
                };

                const { data, error } = await supabase
                    .from('products')
                    .insert(productData)
                    .select()
                    .single();

                if (error) {
                    console.error(`❌ Failed to insert "${product.title}":`, error.message);
                    errorCount++;
                } else {
                    console.log(`✅ Added: ${product.title}`);
                    console.log(`   Price: ₹${product.price_after.toLocaleString('en-IN')} (${product.discount_percent}% off)`);
                    console.log(`   Location: ${product.city}, ${product.state}`);
                    console.log(`   Condition: ${product.condition}\n`);
                    successCount++;
                }
            } catch (err) {
                console.error(`❌ Error inserting "${product.title}":`, err.message);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Demo Products Seeding Summary');
        console.log('='.repeat(60));
        console.log(`✅ Successfully added: ${successCount} products`);
        console.log(`❌ Failed: ${errorCount} products`);
        console.log(`📍 Supplier: ${supplierUser.id}`);
        console.log(`📂 Category: ${category.id}`);
        console.log('='.repeat(60));

        if (successCount === demoProducts.length) {
            console.log('\n🎉 All demo products added successfully!');
            console.log('🔗 You can now view them in your marketplace at /marketplace');
        }

    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    }
}

// Run the seeding
seedDemoProducts()
    .then(() => {
        console.log('\n✅ Demo products seeding completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Demo products seeding failed:', error);
        process.exit(1);
    });
