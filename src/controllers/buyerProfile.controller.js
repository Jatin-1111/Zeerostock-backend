const User = require('../models/User');
const UserAddress = require('../models/UserAddress');
const Order = require('../models/Order');
const { sanitizeUtils, jwtUtils } = require('../utils/auth.utils');
const bcrypt = require('bcryptjs');

/**
 * Buyer Profile Controllers
 * Handles buyer profile and settings operations
 */

/**
 * GET /api/buyer/profile
 * Get buyer profile with statistics
 */
const getBuyerProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user details
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                errorCode: 'USER_NOT_FOUND',
                message: 'User not found'
            });
        }

        // Get order statistics
        const orderStats = await Order.getBuyerStats(userId);

        // Get default shipping address
        const defaultAddress = await UserAddress.getDefaultAddress(userId, 'shipping');

        const profileData = {
            // Basic Info
            firstName: user.first_name,
            lastName: user.last_name,
            companyName: user.company_name,
            email: user.business_email,
            mobile: user.mobile,

            // Business Info
            businessType: user.business_type,
            gstNumber: user.gst_number,
            activeRole: req.role, // Use active role from token

            // Account Status
            isVerified: user.is_verified,
            isActive: user.is_active,

            // Default Address
            defaultShippingAddress: defaultAddress,

            // Statistics
            stats: {
                totalOrders: orderStats.total_orders,
                activeOrders: orderStats.active_orders,
                completedOrders: orderStats.completed_orders,
                totalSpent: orderStats.total_spent,
                averageOrderValue: orderStats.average_order_value
            },

            // Account Info
            memberSince: user.created_at,
            lastLogin: user.last_login
        };

        res.json({
            success: true,
            message: 'Profile retrieved successfully',
            data: profileData
        });

    } catch (error) {
        console.error('Error getting buyer profile:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve profile'
        });
    }
};

/**
 * PUT /api/buyer/profile
 * Update buyer profile
 */
const updateBuyerProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstName, lastName, companyName, businessType, gstNumber } = req.body;

        const updateData = {};
        if (firstName) updateData.first_name = firstName;
        if (lastName) updateData.last_name = lastName;
        if (companyName) updateData.company_name = companyName;
        if (businessType) updateData.business_type = businessType;
        if (gstNumber !== undefined) updateData.gst_number = gstNumber;

        const updatedUser = await User.update(userId, updateData);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: sanitizeUtils.sanitizeUser(updatedUser)
        });

    } catch (error) {
        console.error('Error updating buyer profile:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to update profile'
        });
    }
};

/**
 * PUT /api/buyer/profile/change-password
 * Change buyer password
 */
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        // Get user
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                errorCode: 'USER_NOT_FOUND',
                message: 'User not found'
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                errorCode: 'INVALID_PASSWORD',
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await User.update(userId, { password_hash: hashedPassword });

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to change password'
        });
    }
};

/**
 * GET /api/buyer/profile/addresses
 * Get all buyer addresses
 */
const getAddresses = async (req, res) => {
    try {
        const userId = req.user.id;
        const { addressType } = req.query;

        const addresses = await UserAddress.getByUserId(userId, addressType);

        res.json({
            success: true,
            message: 'Addresses retrieved successfully',
            data: { addresses }
        });

    } catch (error) {
        console.error('Error getting addresses:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve addresses'
        });
    }
};

/**
 * POST /api/buyer/profile/address
 * Add new address
 */
const addAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressData = {
            user_id: userId,
            address_type: req.body.addressType,
            label: req.body.label || null,
            contact_name: req.body.contactName,
            contact_phone: req.body.contactPhone,
            address_line1: req.body.addressLine1,
            address_line2: req.body.addressLine2 || null,
            landmark: req.body.landmark || null,
            city: req.body.city,
            state: req.body.state,
            pincode: req.body.pincode,
            country: req.body.country || 'India',
            is_default: req.body.isDefault || false
        };

        const address = await UserAddress.create(addressData);

        res.status(201).json({
            success: true,
            message: 'Address added successfully',
            data: { address }
        });

    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to add address'
        });
    }
};

/**
 * PUT /api/buyer/profile/address/:addressId
 * Update address
 */
const updateAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { addressId } = req.params;

        const updateData = {};
        if (req.body.addressType) updateData.address_type = req.body.addressType;
        if (req.body.label !== undefined) updateData.label = req.body.label;
        if (req.body.contactName) updateData.contact_name = req.body.contactName;
        if (req.body.contactPhone) updateData.contact_phone = req.body.contactPhone;
        if (req.body.addressLine1) updateData.address_line1 = req.body.addressLine1;
        if (req.body.addressLine2 !== undefined) updateData.address_line2 = req.body.addressLine2;
        if (req.body.landmark !== undefined) updateData.landmark = req.body.landmark;
        if (req.body.city) updateData.city = req.body.city;
        if (req.body.state) updateData.state = req.body.state;
        if (req.body.pincode) updateData.pincode = req.body.pincode;
        if (req.body.country) updateData.country = req.body.country;
        if (req.body.isDefault !== undefined) updateData.is_default = req.body.isDefault;

        const address = await UserAddress.update(addressId, userId, updateData);

        res.json({
            success: true,
            message: 'Address updated successfully',
            data: { address }
        });

    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to update address'
        });
    }
};

/**
 * DELETE /api/buyer/profile/address/:addressId
 * Delete address
 */
const deleteAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { addressId } = req.params;

        await UserAddress.delete(addressId, userId);

        res.json({
            success: true,
            message: 'Address deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to delete address'
        });
    }
};

/**
 * PUT /api/buyer/profile/address/:addressId/set-default
 * Set address as default
 */
const setDefaultAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { addressId } = req.params;

        const address = await UserAddress.setAsDefault(addressId, userId);

        res.json({
            success: true,
            message: 'Default address updated successfully',
            data: { address }
        });

    } catch (error) {
        console.error('Error setting default address:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to set default address'
        });
    }
};

module.exports = {
    getBuyerProfile,
    updateBuyerProfile,
    changePassword,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
};
