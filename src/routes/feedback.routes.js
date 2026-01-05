const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedback.controller");
const { verifyToken } = require("../middleware/auth.middleware");
const { requireRoles } = require("../middleware/role.middleware");

// User routes (authenticated users)
router.post("/submit", verifyToken, feedbackController.submitFeedback);

// Admin routes
router.get(
    "/all",
    verifyToken,
    requireRoles("admin", "super_admin"),
    feedbackController.getAllFeedback
);

router.get(
    "/statistics",
    verifyToken,
    requireRoles("admin", "super_admin"),
    feedbackController.getFeedbackStatistics
);

router.delete(
    "/:id",
    verifyToken,
    requireRoles("admin", "super_admin"),
    feedbackController.deleteFeedback
);

module.exports = router;
