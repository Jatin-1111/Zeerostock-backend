require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Check for DATABASE_URL
if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL not found in .env");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
    } : false
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log("Starting feedback and bugs migration...");

        // Read and execute the schema file
        const schemaPath = path.join(
            __dirname,
            "../database/feedback-bugs-schema.sql"
        );
        const schema = fs.readFileSync(schemaPath, "utf8");

        await client.query(schema);

        console.log("✅ Feedback and bugs tables created successfully");
        console.log("✅ Indexes created successfully");
        console.log("\nMigration completed successfully!");
    } catch (error) {
        console.error("❌ Error running migration:", error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration()
    .then(() => {
        console.log("\n✨ All done!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Migration failed:", error);
        process.exit(1);
    });
