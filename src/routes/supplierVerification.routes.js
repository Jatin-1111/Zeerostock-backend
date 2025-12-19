const express = require('express');
const router = express.Router();
const supplierVerificationController = require('../controllers/supplierVerification.controller');
const { verifyToken } = require('../middleware/auth.middleware');

/**
 * Supplier Verification Routes
 * All routes require authentication
 */

// Save draft (auto-save feature)
router.post('/draft', verifyToken, supplierVerificationController.saveDraft);

// Get saved draft
router.get('/draft', verifyToken, supplierVerificationController.getDraft);

// Upload document to Cloudinary
router.post('/upload', verifyToken, supplierVerificationController.uploadDocument);

// Submit complete verification
router.post('/submit', verifyToken, supplierVerificationController.submitVerification);

// Get verification status
router.get('/status', verifyToken, supplierVerificationController.getVerificationStatus);

module.exports = router;
