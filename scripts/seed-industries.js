require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { supabase } = require('../src/config/database');

/**
 * Seed Industries Script
 * Adds all required industries to the database
 */

const industries = [
    { name: 'Manufacturing', slug: 'manufacturing', description: 'General manufacturing and production', display_order: 1 },
    { name: 'Automotive', slug: 'automotive', description: 'Automotive parts and components', display_order: 2 },
    { name: 'Construction', slug: 'construction', description: 'Construction materials and equipment', display_order: 3 },
    { name: 'Electronics', slug: 'electronics', description: 'Electronic components and devices', display_order: 4 },
    { name: 'Electrical', slug: 'electrical', description: 'Electrical equipment and supplies', display_order: 5 },
    { name: 'Chemical Processing', slug: 'chemical-processing', description: 'Chemical processing and materials', display_order: 6 },
    { name: 'Packaging', slug: 'packaging', description: 'Packaging materials and solutions', display_order: 7 },
    { name: 'FMCG', slug: 'fmcg', description: 'Fast-moving consumer goods', display_order: 8 },
    { name: 'Pharmaceutical', slug: 'pharmaceutical', description: 'Pharmaceutical and medical supplies', display_order: 9 },
    { name: 'Food & Beverage', slug: 'food-beverage', description: 'Food and beverage processing', display_order: 10 },
    { name: 'Retail & E-commerce', slug: 'retail-ecommerce', description: 'Retail and e-commerce supplies', display_order: 11 },
    { name: 'Logistics & Warehousing', slug: 'logistics-warehousing', description: 'Logistics and warehousing equipment', display_order: 12 },
    { name: 'Textile & Apparel', slug: 'textile-apparel', description: 'Textile and apparel manufacturing', display_order: 13 },
    { name: 'Agriculture', slug: 'agriculture', description: 'Agricultural equipment and supplies', display_order: 14 },
    { name: 'Mining & Metals', slug: 'mining-metals', description: 'Mining and metal processing', display_order: 15 },
    { name: 'Oil & Gas', slug: 'oil-gas', description: 'Oil and gas industry equipment', display_order: 16 },
    { name: 'Renewable Energy', slug: 'renewable-energy', description: 'Renewable energy systems and components', display_order: 17 },
    { name: 'Aerospace & Defence', slug: 'aerospace-defence', description: 'Aerospace and defence equipment', display_order: 18 },
    { name: 'IT & Hardware', slug: 'it-hardware', description: 'IT infrastructure and hardware', display_order: 19 },
    { name: 'Hospitality', slug: 'hospitality', description: 'Hospitality and hotel supplies', display_order: 20 },
    { name: 'Healthcare', slug: 'healthcare', description: 'Healthcare equipment and supplies', display_order: 21 },
    { name: 'Printing & Paper', slug: 'printing-paper', description: 'Printing and paper products', display_order: 22 },
    { name: 'Plastics & Polymers', slug: 'plastics-polymers', description: 'Plastics and polymer materials', display_order: 23 },
    { name: 'Heavy Engineering', slug: 'heavy-engineering', description: 'Heavy engineering and machinery', display_order: 24 },
];

async function seedIndustries() {
    console.log('🌱 Starting industries seed...\n');

    try {
        // Check existing industries
        const { data: existing, error: checkError } = await supabase
            .from('industries')
            .select('name');

        if (checkError) {
            throw checkError;
        }

        const existingNames = new Set(existing?.map(i => i.name) || []);
        console.log(`📊 Found ${existing?.length || 0} existing industries\n`);

        // Filter out industries that already exist
        const newIndustries = industries.filter(ind => !existingNames.has(ind.name));

        if (newIndustries.length === 0) {
            console.log('✅ All industries already exist in database!\n');
            return;
        }

        console.log(`📝 Inserting ${newIndustries.length} new industries...\n`);

        // Insert new industries
        const { data: inserted, error: insertError } = await supabase
            .from('industries')
            .insert(newIndustries.map(ind => ({
                name: ind.name,
                slug: ind.slug,
                description: ind.description,
                display_order: ind.display_order,
                is_active: true,
                product_count: 0
            })))
            .select();

        if (insertError) {
            throw insertError;
        }

        console.log(`✅ Successfully inserted ${inserted?.length || 0} industries:\n`);
        newIndustries.forEach(ind => {
            console.log(`   ✓ ${ind.name}`);
        });

        // Get total count
        const { count, error: countError } = await supabase
            .from('industries')
            .select('*', { count: 'exact', head: true });

        if (!countError) {
            console.log(`\n📊 Total industries in database: ${count}`);
        }

        console.log('\n🎉 Industries seed completed successfully!\n');

    } catch (error) {
        console.error('❌ Error seeding industries:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run the seed function
seedIndustries()
    .then(() => {
        console.log('👋 Exiting...');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
