/**
 * User Management Controller
 * Handles admin operations for managing platform users
 */

const { AppError, asyncHandler } = require('../middleware/error.middleware');
const User = require('../models/User');
const { supabase } = require('../config/database');

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering and pagination
 * @access  Private (admin only)
 */
const getAllUsers = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        search = '',
        role = '',
        status = '',
        sortBy = 'created_at',
        sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
        .from('users')
        .select('id, first_name, last_name, business_email, mobile, company_name, roles, active_role, is_active, is_verified, last_login, created_at', { count: 'exact' });

    // Search filter
    if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,business_email.ilike.%${search}%,company_name.ilike.%${search}%`);
    }

    // Role filter
    if (role && role !== 'all') {
        query = query.contains('roles', [role]);
    }

    // Status filter
    if (status === 'active') {
        query = query.eq('is_active', true);
    } else if (status === 'inactive') {
        query = query.eq('is_active', false);
    } else if (status === 'verified') {
        query = query.eq('is_verified', true);
    } else if (status === 'unverified') {
        query = query.eq('is_verified', false);
    }

    // Sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
        throw new AppError('Failed to fetch users', 500, ERROR_CODES.DATABASE_ERROR);
    }

    // Format users
    const formattedUsers = users.map(user => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.business_email,
        mobile: user.mobile,
        company: user.company_name,
        roles: user.roles || [],
        activeRole: user.active_role,
        isActive: user.is_active,
        isVerified: user.is_verified,
        lastLogin: user.last_login,
        createdAt: user.created_at
    }));

    res.json({
        success: true,
        data: {
            users: formattedUsers,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalUsers: count,
                perPage: parseInt(limit)
            }
        }
    });
});

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get user statistics
 * @access  Private (admin only)
 */
const getUserStats = asyncHandler(async (req, res) => {
    // Get total users count
    const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

    // Get active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', thirtyDaysAgo.toISOString());

    // Get new users (created in last 30 days)
    const { count: newUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

    // Get inactive users
    const { count: inactiveUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false);

    // Get verified users
    const { count: verifiedUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true);

    // Get buyers count
    const { count: buyersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .contains('roles', ['buyer']);

    // Get suppliers count
    const { count: suppliersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .contains('roles', ['supplier']);

    res.json({
        success: true,
        data: {
            totalUsers: totalUsers || 0,
            activeUsers: activeUsers || 0,
            newUsers: newUsers || 0,
            inactiveUsers: inactiveUsers || 0,
            verifiedUsers: verifiedUsers || 0,
            buyersCount: buyersCount || 0,
            suppliersCount: suppliersCount || 0
        }
    });
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user details
 * @access  Private (admin only)
 */
const getUserDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !user) {
        throw new AppError('User not found', 404, ERROR_CODES.USER_NOT_FOUND);
    }

    res.json({
        success: true,
        data: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            name: `${user.first_name} ${user.last_name}`,
            email: user.business_email,
            mobile: user.mobile,
            company: user.company_name,
            businessType: user.business_type,
            gstNumber: user.gst_number,
            roles: user.roles || [],
            activeRole: user.active_role,
            isActive: user.is_active,
            isVerified: user.is_verified,
            lastLogin: user.last_login,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        }
    });
});

/**
 * @route   PATCH /api/admin/users/:id/activate
 * @desc    Activate a user
 * @access  Private (admin only)
 */
const activateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data: user, error } = await supabase
        .from('users')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error || !user) {
        throw new AppError('User not found', 404, ERROR_CODES.USER_NOT_FOUND);
    }

    res.json({
        success: true,
        message: 'User activated successfully',
        data: user
    });
});

/**
 * @route   PATCH /api/admin/users/:id/deactivate
 * @desc    Deactivate a user
 * @access  Private (admin only)
 */
const deactivateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data: user, error } = await supabase
        .from('users')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error || !user) {
        throw new AppError('User not found', 404, ERROR_CODES.USER_NOT_FOUND);
    }

    res.json({
        success: true,
        message: 'User deactivated successfully',
        data: user
    });
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user
 * @access  Private (admin only)
 */
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

    if (error) {
        throw new AppError('Failed to delete user', 500, ERROR_CODES.DATABASE_ERROR);
    }

    res.json({
        success: true,
        message: 'User deleted successfully'
    });
});

/**
 * @route   GET /api/users/stats/by-location
 * @desc    Get user statistics grouped by location (state)
 * @access  Private (admin only)
 */
const getUsersByLocation = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    // Get users grouped by state
    const { data: locationData, error } = await supabase
        .from('users')
        .select('state, id, last_login')
        .not('state', 'is', null)
        .neq('state', '');

    if (error) {
        throw new AppError('Failed to fetch location data', 500, ERROR_CODES.DATABASE_ERROR);
    }

    // Group and count by state
    const stateMap = new Map();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    locationData.forEach(user => {
        const state = user.state;
        if (!stateMap.has(state)) {
            stateMap.set(state, { total: 0, active: 0 });
        }
        const stats = stateMap.get(state);
        stats.total++;

        // Count active users (logged in within last 30 days)
        if (user.last_login && new Date(user.last_login) >= thirtyDaysAgo) {
            stats.active++;
        }
    });

    // Convert to array and sort by total users
    const locationStats = Array.from(stateMap.entries())
        .map(([state, stats]) => ({
            state,
            users: stats.total,
            activeUsers: stats.active,
            // TODO: Calculate growth percentage by comparing with previous period
            // percentage: calculateGrowthPercentage(stats.total, previousPeriodCount)
            percentage: 0 // Placeholder for growth percentage
        }))
        .sort((a, b) => b.users - a.users)
        .slice(0, parseInt(limit));

    res.json({
        success: true,
        data: locationStats
    });
});

module.exports = {
    getAllUsers,
    getUserStats,
    getUserDetails,
    activateUser,
    deactivateUser,
    deleteUser,
    getUsersByLocation
};
