const SupportTicket = require('../models/SupportTicket');
const NotificationService = require('../services/notification.service');

/**
 * Support Ticket Controllers
 * Handles customer support tickets operations
 */

/**
 * POST /api/buyer/support/ticket
 * Create a new support ticket
 */
const createTicket = async (req, res) => {
    try {
        const userId = req.user.id;
        const { category, subject, description, priority, orderId, productId, attachments } = req.body;

        const ticket = await SupportTicket.create({
            user_id: userId,
            category,
            subject,
            description,
            priority: priority || 'medium',
            order_id: orderId || null,
            product_id: productId || null,
            attachments: attachments || []
        });

        // Send notification
        await NotificationService.sendAccountNotification(
            userId,
            'Support Ticket Created',
            `Your support ticket ${ticket.ticket_number} has been created. Our team will respond shortly.`
        );

        res.status(201).json({
            success: true,
            message: 'Support ticket created successfully',
            data: {
                ticketId: ticket.id,
                ticketNumber: ticket.ticket_number,
                category: ticket.category,
                subject: ticket.subject,
                status: ticket.status,
                priority: ticket.priority,
                createdAt: ticket.created_at
            }
        });

    } catch (error) {
        console.error('Error creating support ticket:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to create support ticket'
        });
    }
};

/**
 * GET /api/buyer/support/tickets
 * Get user's support tickets
 */
const getTickets = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit, status } = req.query;

        const result = await SupportTicket.getByUserId(userId, { page, limit, status });

        // Format the response
        const formattedTickets = result.tickets.map(ticket => ({
            ticketId: ticket.id,
            ticketNumber: ticket.ticket_number,
            category: ticket.category,
            subject: ticket.subject,
            status: ticket.status,
            priority: ticket.priority,

            // Linked resources
            orderId: ticket.order_id,
            productId: ticket.product_id,

            // Timestamps
            createdAt: ticket.created_at,
            updatedAt: ticket.updated_at,
            resolvedAt: ticket.resolved_at,
            closedAt: ticket.closed_at
        }));

        // Get ticket stats
        const stats = await SupportTicket.getUserStats(userId);

        res.json({
            success: true,
            message: 'Support tickets retrieved successfully',
            data: {
                tickets: formattedTickets,
                pagination: result.pagination,
                stats
            }
        });

    } catch (error) {
        console.error('Error getting support tickets:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve support tickets'
        });
    }
};

/**
 * GET /api/buyer/support/tickets/:ticketId
 * Get specific ticket details with messages
 */
const getTicketById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { ticketId } = req.params;

        const ticket = await SupportTicket.findById(ticketId, userId);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                errorCode: 'TICKET_NOT_FOUND',
                message: 'Support ticket not found'
            });
        }

        // Get ticket messages
        const messages = await SupportTicket.getMessages(ticketId, false);

        const formattedTicket = {
            ticketId: ticket.id,
            ticketNumber: ticket.ticket_number,

            // Ticket details
            category: ticket.category,
            subject: ticket.subject,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            attachments: ticket.attachments,

            // Assignment
            assignedTo: ticket.assigned_user ? {
                id: ticket.assigned_user.id,
                name: `${ticket.assigned_user.first_name} ${ticket.assigned_user.last_name}`
            } : null,
            assignedAt: ticket.assigned_at,

            // Linked resources
            order: ticket.orders ? {
                orderNumber: ticket.orders.order_number,
                status: ticket.orders.status
            } : null,
            product: ticket.products ? {
                title: ticket.products.title,
                slug: ticket.products.slug
            } : null,

            // Resolution
            resolutionNotes: ticket.resolution_notes,
            resolvedAt: ticket.resolved_at,

            // Rating
            satisfactionRating: ticket.satisfaction_rating,
            feedback: ticket.feedback,

            // Messages
            messages: messages.map(msg => ({
                messageId: msg.id,
                sender: {
                    id: msg.users.id,
                    name: `${msg.users.first_name} ${msg.users.last_name}`,
                    role: msg.users.role
                },
                message: msg.message,
                attachments: msg.attachments,
                isAutoResponse: msg.is_auto_response,
                createdAt: msg.created_at
            })),

            // Timestamps
            createdAt: ticket.created_at,
            updatedAt: ticket.updated_at,
            closedAt: ticket.closed_at
        };

        res.json({
            success: true,
            message: 'Ticket details retrieved successfully',
            data: formattedTicket
        });

    } catch (error) {
        console.error('Error getting ticket details:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve ticket details'
        });
    }
};

/**
 * POST /api/buyer/support/tickets/:ticketId/message
 * Add message to ticket
 */
const addTicketMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { ticketId } = req.params;
        const { message, attachments } = req.body;

        // Verify ticket belongs to user
        const ticket = await SupportTicket.findById(ticketId, userId);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                errorCode: 'TICKET_NOT_FOUND',
                message: 'Support ticket not found'
            });
        }

        if (ticket.status === 'closed') {
            return res.status(400).json({
                success: false,
                errorCode: 'TICKET_CLOSED',
                message: 'Cannot add message to closed ticket. Please reopen it first.'
            });
        }

        const ticketMessage = await SupportTicket.addMessage(
            ticketId,
            userId,
            message,
            attachments || [],
            false
        );

        // Update ticket status if it was resolved
        if (ticket.status === 'resolved') {
            await SupportTicket.update(ticketId, {
                status: 'waiting_customer'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Message added successfully',
            data: {
                messageId: ticketMessage.id,
                message: ticketMessage.message,
                createdAt: ticketMessage.created_at
            }
        });

    } catch (error) {
        console.error('Error adding ticket message:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to add message'
        });
    }
};

/**
 * PUT /api/buyer/support/tickets/:ticketId/close
 * Close a ticket
 */
const closeTicket = async (req, res) => {
    try {
        const userId = req.user.id;
        const { ticketId } = req.params;

        const ticket = await SupportTicket.close(ticketId, userId);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                errorCode: 'TICKET_NOT_FOUND',
                message: 'Support ticket not found'
            });
        }

        res.json({
            success: true,
            message: 'Ticket closed successfully',
            data: {
                ticketId: ticket.id,
                ticketNumber: ticket.ticket_number,
                status: ticket.status,
                closedAt: ticket.closed_at
            }
        });

    } catch (error) {
        console.error('Error closing ticket:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to close ticket'
        });
    }
};

/**
 * PUT /api/buyer/support/tickets/:ticketId/reopen
 * Reopen a closed ticket
 */
const reopenTicket = async (req, res) => {
    try {
        const userId = req.user.id;
        const { ticketId } = req.params;

        const ticket = await SupportTicket.reopen(ticketId, userId);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                errorCode: 'TICKET_NOT_FOUND',
                message: 'Support ticket not found'
            });
        }

        res.json({
            success: true,
            message: 'Ticket reopened successfully',
            data: {
                ticketId: ticket.id,
                ticketNumber: ticket.ticket_number,
                status: ticket.status
            }
        });

    } catch (error) {
        console.error('Error reopening ticket:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to reopen ticket'
        });
    }
};

/**
 * POST /api/buyer/support/tickets/:ticketId/rate
 * Rate ticket resolution
 */
const rateTicket = async (req, res) => {
    try {
        const userId = req.user.id;
        const { ticketId } = req.params;
        const { rating, feedback } = req.body;

        // Verify ticket
        const ticket = await SupportTicket.findById(ticketId, userId);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                errorCode: 'TICKET_NOT_FOUND',
                message: 'Support ticket not found'
            });
        }

        if (!['resolved', 'closed'].includes(ticket.status)) {
            return res.status(400).json({
                success: false,
                errorCode: 'TICKET_NOT_RESOLVED',
                message: 'You can only rate resolved or closed tickets'
            });
        }

        const ratedTicket = await SupportTicket.rate(ticketId, userId, rating, feedback);

        res.json({
            success: true,
            message: 'Thank you for rating our support',
            data: {
                ticketId: ratedTicket.id,
                ticketNumber: ratedTicket.ticket_number,
                satisfactionRating: ratedTicket.satisfaction_rating
            }
        });

    } catch (error) {
        console.error('Error rating ticket:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to rate ticket'
        });
    }
};

module.exports = {
    createTicket,
    getTickets,
    getTicketById,
    addTicketMessage,
    closeTicket,
    reopenTicket,
    rateTicket
};
