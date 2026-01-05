const { pool } = require("../config/database");
const nodemailer = require("nodemailer");

// Create email transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Submit bug report
exports.submitBugReport = async (req, res) => {
    const client = await pool.connect();
    try {
        const { title, category, severity, description, steps_to_reproduce } =
            req.body;
        const userId = req.userId || req.user?.id;

        if (!userId) {
            return res.status(401).json({
                error: "Authentication required",
            });
        }

        // Validate required fields
        if (!title || !category || !severity || !description) {
            return res.status(400).json({
                error: "Title, category, severity, and description are required",
            });
        }

        // Validate severity
        const validSeverities = ["low", "medium", "high", "critical"];
        if (!validSeverities.includes(severity)) {
            return res.status(400).json({
                error: "Invalid severity level",
            });
        }

        const result = await client.query(
            `INSERT INTO bug_reports (user_id, title, category, severity, description, steps_to_reproduce)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [userId, title, category, severity, description, steps_to_reproduce || null]
        );

        res.status(201).json({
            message: "Bug report submitted successfully",
            bugReport: result.rows[0],
        });
    } catch (error) {
        console.error("Error submitting bug report:", error);
        res.status(500).json({ error: "Failed to submit bug report" });
    } finally {
        client.release();
    }
};

// Get all bug reports (Admin only)
exports.getAllBugReports = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            page = 1,
            limit = 10,
            status,
            severity,
            category,
            search,
            sortBy = "created_at",
            sortOrder = "DESC",
        } = req.query;

        const offset = (page - 1) * limit;
        let query = `
      SELECT 
        b.*,
        u.first_name,
        u.last_name,
        u.business_email as email,
        u.roles
      FROM bug_reports b
      JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
        const queryParams = [];
        let paramCount = 0;

        // Filter by status
        if (status) {
            paramCount++;
            query += ` AND b.status = $${paramCount}`;
            queryParams.push(status);
        }

        // Filter by severity
        if (severity) {
            paramCount++;
            query += ` AND b.severity = $${paramCount}`;
            queryParams.push(severity);
        }

        // Filter by category
        if (category) {
            paramCount++;
            query += ` AND b.category = $${paramCount}`;
            queryParams.push(category);
        }

        // Search in title, description
        if (search) {
            paramCount++;
            query += ` AND (b.title ILIKE $${paramCount} OR b.description ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.business_email ILIKE $${paramCount})`;
            queryParams.push(`%${search}%`);
        }

        // Add sorting
        const validSortFields = [
            "created_at",
            "severity",
            "status",
            "updated_at",
            "title",
        ];
        const sortField = validSortFields.includes(sortBy) ? sortBy : "created_at";
        const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
        query += ` ORDER BY b.${sortField} ${order}`;

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
      FROM bug_reports b
      JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
        const countParams = [];
        let countParamIndex = 0;

        if (status) {
            countParamIndex++;
            countQuery += ` AND b.status = $${countParamIndex}`;
            countParams.push(status);
        }

        if (severity) {
            countParamIndex++;
            countQuery += ` AND b.severity = $${countParamIndex}`;
            countParams.push(severity);
        }

        if (category) {
            countParamIndex++;
            countQuery += ` AND b.category = $${countParamIndex}`;
            countParams.push(category);
        }

        if (search) {
            countParamIndex++;
            countQuery += ` AND (b.title ILIKE $${countParamIndex} OR b.description ILIKE $${countParamIndex} OR u.first_name ILIKE $${countParamIndex} OR u.last_name ILIKE $${countParamIndex} OR u.business_email ILIKE $${countParamIndex})`;
            countParams.push(`%${search}%`);
        }

        const countResult = await client.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            bugReports: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error getting bug reports:", error);
        res.status(500).json({ error: "Failed to retrieve bug reports" });
    } finally {
        client.release();
    }
};

// Get bug report by ID (Admin only)
exports.getBugReportById = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        // Parse and validate ID
        const bugId = parseInt(id, 10);
        if (isNaN(bugId)) {
            return res.status(400).json({
                error: "Invalid bug report ID",
            });
        }

        const result = await client.query(
            `SELECT 
        b.*,
        u.first_name,
        u.last_name,
        u.business_email as email,
        u.roles
      FROM bug_reports b
      JOIN users u ON b.user_id = u.id
      WHERE b.id = $1`,
            [bugId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Bug report not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error getting bug report:", error);
        res.status(500).json({ error: "Failed to retrieve bug report" });
    } finally {
        client.release();
    }
};

// Update bug report status (Admin only)
exports.updateBugReportStatus = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Parse and validate ID
        const bugId = parseInt(id, 10);
        if (isNaN(bugId)) {
            return res.status(400).json({
                error: "Invalid bug report ID",
            });
        }

        // Validate status
        if (!status || !["pending", "resolved"].includes(status)) {
            return res.status(400).json({
                error: "Invalid status. Must be 'pending' or 'resolved'",
            });
        }

        // Get bug report with user email
        const bugResult = await client.query(
            `SELECT b.*, u.business_email as email, u.first_name, u.last_name 
       FROM bug_reports b
       JOIN users u ON b.user_id = u.id
       WHERE b.id = $1`,
            [bugId]
        );

        if (bugResult.rows.length === 0) {
            return res.status(404).json({ error: "Bug report not found" });
        }

        const bug = bugResult.rows[0];

        // Update status
        const updateResult = await client.query(
            `UPDATE bug_reports 
       SET status = $1, 
           resolved_at = CASE WHEN $2 = 'resolved' THEN CURRENT_TIMESTAMP ELSE NULL END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
            [status, status, bugId]
        );

        // Send email if resolved
        if (status === "resolved" && process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
                    to: bug.email,
                    subject: "Your Bug Report Has Been Resolved - Zeerostock",
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">Bug Report Resolved</h2>
              <p>Dear ${bug.first_name ? `${bug.first_name} ${bug.last_name}` : "User"},</p>
              <p>We're happy to inform you that the bug you reported has been resolved.</p>
              
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #1a1a1a; margin-top: 0;">Bug Report Details:</h3>
                <p><strong>Title:</strong> ${bug.title}</p>
                <p><strong>Category:</strong> ${bug.category}</p>
                <p><strong>Severity:</strong> ${bug.severity}</p>
                <p><strong>Reported on:</strong> ${new Date(bug.created_at).toLocaleDateString()}</p>
              </div>
              
              <p>Thank you for helping us improve Zeerostock. Your feedback is valuable to us.</p>
              
              <p>If you experience any further issues, please don't hesitate to report them.</p>
              
              <p>Best regards,<br>The Zeerostock Team</p>
            </div>
          `,
                });
            } catch (emailError) {
                console.error("Error sending email:", emailError);
                // Don't fail the request if email fails
            }
        }

        res.json({
            message: `Bug report marked as ${status}`,
            bugReport: updateResult.rows[0],
        });
    } catch (error) {
        console.error("Error updating bug report status:", error);
        res.status(500).json({ error: "Failed to update bug report status" });
    } finally {
        client.release();
    }
};

// Get bug report statistics (Admin only)
exports.getBugReportStatistics = async (req, res) => {
    const client = await pool.connect();
    try {
        // Get status distribution
        const statusDistribution = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM bug_reports
      GROUP BY status
    `);

        // Get severity distribution
        const severityDistribution = await client.query(`
      SELECT 
        severity,
        COUNT(*) as count
      FROM bug_reports
      GROUP BY severity
      ORDER BY CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END
    `);

        // Get category distribution
        const categoryDistribution = await client.query(`
      SELECT 
        category,
        COUNT(*) as count
      FROM bug_reports
      GROUP BY category
      ORDER BY count DESC
    `);

        // Get total counts
        const totalCount = await client.query(`
      SELECT COUNT(*) as total FROM bug_reports
    `);

        const pendingCount = await client.query(`
      SELECT COUNT(*) as count FROM bug_reports WHERE status = 'pending'
    `);

        const resolvedCount = await client.query(`
      SELECT COUNT(*) as count FROM bug_reports WHERE status = 'resolved'
    `);

        res.json({
            statusDistribution: statusDistribution.rows,
            severityDistribution: severityDistribution.rows,
            categoryDistribution: categoryDistribution.rows,
            totalBugs: parseInt(totalCount.rows[0].total),
            pendingBugs: parseInt(pendingCount.rows[0].count),
            resolvedBugs: parseInt(resolvedCount.rows[0].count),
        });
    } catch (error) {
        console.error("Error getting bug report statistics:", error);
        res.status(500).json({ error: "Failed to retrieve statistics" });
    } finally {
        client.release();
    }
};

// Delete bug report (Admin only)
exports.deleteBugReport = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        // Parse and validate ID
        const bugId = parseInt(id, 10);
        if (isNaN(bugId)) {
            return res.status(400).json({
                error: "Invalid bug report ID",
            });
        }

        const result = await client.query(
            "DELETE FROM bug_reports WHERE id = $1 RETURNING *",
            [bugId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Bug report not found" });
        }

        res.json({ message: "Bug report deleted successfully" });
    } catch (error) {
        console.error("Error deleting bug report:", error);
        res.status(500).json({ error: "Failed to delete bug report" });
    } finally {
        client.release();
    }
};
