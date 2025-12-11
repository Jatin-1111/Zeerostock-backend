const express = require('express');
const router = express.Router();

// Controllers
const signupController = require('../controllers/signup.controller');
const loginController = require('../controllers/login.controller');
const passwordController = require('../controllers/password.controller');
const profileController = require('../controllers/profile.controller');

// Middleware
const { verifyToken, verifyUserVerified } = require('../middleware/auth.middleware');
const { validate, authValidation } = require('../validators/auth.validator');
// Rate limiters disabled for testing
// const {
//     authLimiter,
//     signupLimiter,
//     otpLimiter,
//     resetPasswordLimiter
// } = require('../middleware/rateLimiter.middleware');

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     description: Create a new user account and send OTP for verification
 */
router.post(
    '/signup',
    validate(authValidation.signup),
    signupController.signup
);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP
 *     tags: [Authentication]
 *     description: Verify OTP and complete registration
 */
router.post(
    '/verify-otp',
    validate(authValidation.verifyOTP),
    signupController.verifyOTP
);

/**
 * @swagger
 * /auth/resend-otp:
 *   post:
 *     summary: Resend OTP
 *     tags: [Authentication]
 *     description: Resend OTP to user's mobile
 */
router.post(
    '/resend-otp',
    validate(authValidation.resendOTP),
    signupController.resendOTP
);

/**
 * @swagger
 * /auth/social/google:
 *   post:
 *     summary: Google OAuth authentication
 *     tags: [Authentication]
 *     description: Authenticate user with Google OAuth
 */
router.post(
    '/social/google',
    validate(authValidation.googleAuth),
    signupController.googleAuth
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email/phone and password
 *     tags: [Authentication]
 *     description: Authenticate user and return JWT tokens
 */
router.post(
    '/login',
    validate(authValidation.login),
    loginController.login
);

/**
 * @swagger
 * /auth/otp-login:
 *   post:
 *     summary: Send OTP for login
 *     tags: [Authentication]
 *     description: Send OTP to user's mobile for passwordless login
 */
router.post(
    '/otp-login',
    validate(authValidation.otpLogin),
    loginController.sendLoginOTP
);

/**
 * @swagger
 * /auth/verify-login-otp:
 *   post:
 *     summary: Verify login OTP
 *     tags: [Authentication]
 *     description: Verify OTP and login user
 */
router.post(
    '/verify-login-otp',
    validate(authValidation.verifyLoginOTP),
    loginController.verifyLoginOTP
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     description: Get new access token using refresh token
 */
router.post(
    '/refresh-token',
    validate(authValidation.refreshToken),
    loginController.refreshAccessToken
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     description: Revoke refresh token and logout
 */
router.post(
    '/logout',
    loginController.logout
);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Authentication]
 *     description: Revoke all refresh tokens
 */
router.post(
    '/logout-all',
    verifyToken,
    loginController.logoutAll
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     description: Send password reset link to email
 */
router.post(
    '/forgot-password',
    validate(authValidation.forgotPassword),
    passwordController.forgotPassword
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password
 *     tags: [Authentication]
 *     description: Reset password using reset token
 */
router.post(
    '/reset-password',
    validate(authValidation.resetPassword),
    passwordController.resetPassword
);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change password
 *     tags: [Authentication]
 *     description: Change password when logged in
 */
router.post(
    '/change-password',
    verifyToken,
    verifyUserVerified,
    passwordController.changePassword
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Profile]
 *     description: Get authenticated user's profile
 */
router.get(
    '/me',
    verifyToken,
    verifyUserVerified,
    profileController.getProfile
);

/**
 * @swagger
 * /auth/me:
 *   put:
 *     summary: Update user profile
 *     tags: [Profile]
 *     description: Update authenticated user's profile
 */
router.put(
    '/me',
    verifyToken,
    verifyUserVerified,
    validate(authValidation.updateProfile),
    profileController.updateProfile
);

/**
 * @swagger
 * /auth/add-gst:
 *   put:
 *     summary: Add GST number
 *     tags: [Profile]
 *     description: Add or update GST number
 */
router.put(
    '/add-gst',
    verifyToken,
    verifyUserVerified,
    validate(authValidation.addGST),
    profileController.addGST
);

/**
 * @swagger
 * /auth/set-role:
 *   put:
 *     summary: Set user role
 *     tags: [Profile]
 *     description: Set user role as buyer or supplier
 */
router.put(
    '/set-role',
    verifyToken,
    verifyUserVerified,
    validate(authValidation.setRole),
    profileController.setRole
);

/**
 * @swagger
 * /auth/me:
 *   delete:
 *     summary: Deactivate account
 *     tags: [Profile]
 *     description: Deactivate user account
 */
router.delete(
    '/me',
    verifyToken,
    verifyUserVerified,
    profileController.deactivateAccount
);

module.exports = router;
