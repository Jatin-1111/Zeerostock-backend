const Notification = require('../models/Notification');

/**
 * Notification Controllers
 * Handles user notifications operations
 */

/**
 * GET /api/buyer/notifications
 * Get user notifications
 */
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit, type, unreadOnly } = req.query;

        const result = await Notification.getByUserId(userId, {
            page,
            limit,
            type,
            unreadOnly
        });

        // Format the response
        const formattedNotifications = result.notifications.map(notification => ({
            notificationId: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,

            // Linked resources
            resourceType: notification.resource_type,
            resourceId: notification.resource_id,
            actionUrl: notification.action_url,

            // Status
            isRead: notification.is_read,
            readAt: notification.read_at,

            // Priority
            priority: notification.priority,

            // Additional data
            data: notification.data,

            // Timestamps
            createdAt: notification.created_at,
            expiresAt: notification.expires_at
        }));

        // Get unread count
        const unreadCount = await Notification.getUnreadCount(userId);

        res.json({
            success: true,
            message: 'Notifications retrieved successfully',
            data: {
                notifications: formattedNotifications,
                pagination: result.pagination,
                unreadCount
            }
        });

    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve notifications'
        });
    }
};

/**
 * PUT /api/buyer/notifications/mark-read
 * Mark notifications as read
 */
const markNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationIds, markAll } = req.body;

        if (markAll) {
            // Mark all as read
            await Notification.markAllAsRead(userId);

            res.json({
                success: true,
                message: 'All notifications marked as read'
            });
        } else if (notificationIds && notificationIds.length > 0) {
            // Mark specific notifications as read
            const promises = notificationIds.map(id =>
                Notification.markAsRead(id, userId)
            );

            await Promise.all(promises);

            res.json({
                success: true,
                message: `${notificationIds.length} notifications marked as read`
            });
        } else {
            res.status(400).json({
                success: false,
                errorCode: 'INVALID_REQUEST',
                message: 'Please provide notificationIds or set markAll to true'
            });
        }

    } catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to mark notifications as read'
        });
    }
};

/**
 * PUT /api/buyer/notifications/:notificationId/read
 * Mark single notification as read
 */
const markNotificationAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;

        const notification = await Notification.markAsRead(notificationId, userId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                errorCode: 'NOTIFICATION_NOT_FOUND',
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification marked as read',
            data: {
                notificationId: notification.id,
                isRead: notification.is_read,
                readAt: notification.read_at
            }
        });

    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to mark notification as read'
        });
    }
};

/**
 * DELETE /api/buyer/notifications/:notificationId
 * Delete a notification
 */
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;

        await Notification.delete(notificationId, userId);

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to delete notification'
        });
    }
};

/**
 * GET /api/buyer/notifications/unread-count
 * Get unread notifications count
 */
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const count = await Notification.getUnreadCount(userId);

        res.json({
            success: true,
            data: { unreadCount: count }
        });

    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to get unread count'
        });
    }
};

/**
 * DELETE /api/buyer/notifications/clear-old
 * Clear old read notifications
 */
const clearOldNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { daysOld = 30 } = req.query;

        const deletedCount = await Notification.deleteOld(userId, daysOld);

        res.json({
            success: true,
            message: `${deletedCount} old notifications cleared`,
            data: { deletedCount }
        });

    } catch (error) {
        console.error('Error clearing old notifications:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to clear old notifications'
        });
    }
};

module.exports = {
    getNotifications,
    markNotificationsAsRead,
    markNotificationAsRead,
    deleteNotification,
    getUnreadCount,
    clearOldNotifications
};
