const { pool } = require("../config/database");
const nodemailer = require("nodemailer");

// Create email transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Submit feedback
exports.submitFeedback = async (req, res) => {
    const client = await pool.connect();
    try {
        const { rating, comments } = req.body;
        const userId = req.userId || req.user?.id;

        if (!userId) {
            return res.status(401).json({
                error: "Authentication required",
            });
        }

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                error: "Rating must be between 1 and 5",
            });
        }

        const result = await client.query(
            `INSERT INTO user_feedback (user_id, rating, comments)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [userId, rating, comments || null]
        );

        res.status(201).json({
            message: "Feedback submitted successfully",
            feedback: result.rows[0],
        });
    } catch (error) {
        console.error("Error submitting feedback:", error);
        res.status(500).json({ error: "Failed to submit feedback" });
    } finally {
        client.release();
    }
};

// Get all feedback (Admin only)
exports.getAllFeedback = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            page = 1,
            limit = 10,
            rating,
            search,
            sortBy = "created_at",
            sortOrder = "DESC",
        } = req.query;

        const offset = (page - 1) * limit;
        let query = `
      SELECT 
        f.*,
        u.first_name,
        u.last_name,
        u.business_email as email,
        u.roles
      FROM user_feedback f
      JOIN users u ON f.user_id = u.id
      WHERE 1=1
    `;
        const queryParams = [];
        let paramCount = 0;

        // Filter by rating
        if (rating) {
            paramCount++;
            query += ` AND f.rating = $${paramCount}`;
            queryParams.push(rating);
        }

        // Search in comments
        if (search) {
            paramCount++;
            query += ` AND (f.comments ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.business_email ILIKE $${paramCount})`;
            queryParams.push(`%${search}%`);
        }

        // Add sorting
        const validSortFields = ["created_at", "rating", "updated_at"];
        const sortField = validSortFields.includes(sortBy) ? sortBy : "created_at";
        const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
        query += ` ORDER BY f.${sortField} ${order}`;

        // Add pagination
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        queryParams.push(limit);

        paramCount++;
        query += ` OFFSET $${paramCount}`;
        queryParams.push(offset);

        const result = await client.query(query, queryParams);

        // Get total count
        let countQuery = `
      SELECT COUNT(*) 
      FROM user_feedback f
      JOIN users u ON f.user_id = u.id
      WHERE 1=1
    `;
        const countParams = [];
        let countParamIndex = 0;

        if (rating) {
            countParamIndex++;
            countQuery += ` AND f.rating = $${countParamIndex}`;
            countParams.push(rating);
        }

        if (search) {
            countParamIndex++;
            countQuery += ` AND (f.comments ILIKE $${countParamIndex} OR u.first_name ILIKE $${countParamIndex} OR u.last_name ILIKE $${countParamIndex} OR u.business_email ILIKE $${countParamIndex})`;
            countParams.push(`%${search}%`);
        }

        const countResult = await client.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            feedback: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error getting feedback:", error);
        res.status(500).json({ error: "Failed to retrieve feedback" });
    } finally {
        client.release();
    }
};

// Get feedback statistics (Admin only)
exports.getFeedbackStatistics = async (req, res) => {
    const client = await pool.connect();
    try {
        // Get rating distribution
        const ratingDistribution = await client.query(`
      SELECT 
        rating,
        COUNT(*) as count
      FROM user_feedback
      GROUP BY rating
      ORDER BY rating
    `);

        // Get total feedback count
        const totalCount = await client.query(`
      SELECT COUNT(*) as total FROM user_feedback
    `);

        // Get average rating
        const avgRating = await client.query(`
      SELECT AVG(rating)::numeric(10,2) as average FROM user_feedback
    `);

        res.json({
            ratingDistribution: ratingDistribution.rows,
            totalFeedback: parseInt(totalCount.rows[0].total),
            averageRating: parseFloat(avgRating.rows[0].average) || 0,
        });
    } catch (error) {
        console.error("Error getting feedback statistics:", error);
        res.status(500).json({ error: "Failed to retrieve statistics" });
    } finally {
        client.release();
    }
};

// Delete feedback (Admin only)
exports.deleteFeedback = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        // Parse and validate ID
        const feedbackId = parseInt(id, 10);
        if (isNaN(feedbackId)) {
            return res.status(400).json({
                error: "Invalid feedback ID",
            });
        }

        const result = await client.query(
            "DELETE FROM user_feedback WHERE id = $1 RETURNING *",
            [feedbackId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Feedback not found" });
        }

        res.json({ message: "Feedback deleted successfully" });
    } catch (error) {
        console.error("Error deleting feedback:", error);
        res.status(500).json({ error: "Failed to delete feedback" });
    } finally {
        client.release();
    }
};
