const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const categories = [
    "Electronics",
    "Industrial",
    "Construction",
    "Agriculture",
    "Cosmetics",
    "Appliances",
    "Hand Tools",
    "Decor",
    "Cleaning items",
    "Fasteners",
    "Plumbing Materials",
    "Electricals",
    "Power Tools",
    "PPE",
    "Abrasives",
    "Chisels & Drill bits",
    "Food Containers",
];

async function seedCategories() {
    const client = await pool.connect();

    try {
        console.log("Starting category seeding...");

        // Begin transaction
        await client.query("BEGIN");

        // Clear existing categories
        console.log("Clearing existing categories...");
        await client.query("TRUNCATE TABLE categories CASCADE");

        // Insert new categories
        console.log("Inserting new categories...");
        for (let i = 0; i < categories.length; i++) {
            const name = categories[i];
            const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and");

            await client.query(
                `INSERT INTO categories (name, slug, is_active, display_order) 
         VALUES ($1, $2, true, $3)`,
                [name, slug, i + 1]
            );

            console.log(`✓ Added: ${name}`);
        }

        // Commit transaction
        await client.query("COMMIT");

        console.log("\n✅ Categories seeded successfully!");

        // Show results
        const result = await client.query(
            "SELECT id, name, slug FROM categories ORDER BY display_order"
        );
        console.log("\nCategories in database:");
        console.table(
            result.rows.map((r) => ({ ID: r.id.substring(0, 8), Name: r.name, Slug: r.slug }))
        );
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("❌ Error seeding categories:", error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

seedCategories().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
