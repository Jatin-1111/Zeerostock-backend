const express = require("express");
const router = express.Router();
const bugController = require("../controllers/bug.controller");
const { verifyToken } = require("../middleware/auth.middleware");
const { requireRoles } = require("../middleware/role.middleware");

// User routes (authenticated users)
router.post("/submit", verifyToken, bugController.submitBugReport);

// Admin routes
router.get(
    "/all",
    verifyToken,
    requireRoles("admin", "super_admin"),
    bugController.getAllBugReports
);

router.get(
    "/statistics",
    verifyToken,
    requireRoles("admin", "super_admin"),
    bugController.getBugReportStatistics
);

router.get(
    "/:id",
    verifyToken,
    requireRoles("admin", "super_admin"),
    bugController.getBugReportById
);

router.patch(
    "/:id/status",
    verifyToken,
    requireRoles("admin", "super_admin"),
    bugController.updateBugReportStatus
);

router.delete(
    "/:id",
    verifyToken,
    requireRoles("admin", "super_admin"),
    bugController.deleteBugReport
);

module.exports = router;
