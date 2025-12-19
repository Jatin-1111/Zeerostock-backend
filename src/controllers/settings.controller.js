const { supabase } = require('../config/database');

// @desc    Get current user settings
// @route   GET /api/buyer/settings
// @access  Private (Buyer)
const getSettings = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const { data: user, error } = await supabase
            .from('users')
            .select(`
        id,
        first_name,
        last_name,
        business_email,
        mobile,
        company_name,
        gst_number,
        bio,
        street,
        city,
        state,
        zip,
        notification_preferences,
        privacy_settings,
        language,
        region,
        date_format,
        time_format,
        currency
      `)
            .eq('id', userId)
            .single();

        if (error) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                error: error.message
            });
        }

        res.status(200).json({
            success: true,
            data: {
                account: {
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.business_email,
                    phone: user.mobile,
                    companyName: user.company_name,
                    gstNumber: user.gst_number,
                    bio: user.bio || '',
                    street: user.street || '',
                    city: user.city || '',
                    state: user.state || '',
                    zip: user.zip || ''
                },
                notifications: user.notification_preferences || {
                    email: true,
                    sms: false,
                    push: true,
                    marketing: true,
                    digest: false,
                    alerts: true
                },
                privacy: user.privacy_settings || {
                    dataSharing: true,
                    analytics: true
                },
                language: {
                    language: user.language || 'English',
                    region: user.region || 'United States',
                    dateFormat: user.date_format || 'MM/DD/YYYY',
                    timeFormat: user.time_format || '12-hour',
                    currency: user.currency || 'USD'
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user settings (account, notifications, privacy, or language)
// @route   PUT /api/buyer/settings
// @access  Private (Buyer)
const updateSettings = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { section, data } = req.body;

        let updateData = {};

        switch (section) {
            case 'account':
                updateData = {
                    first_name: data.firstName,
                    last_name: data.lastName,
                    mobile: data.phone,
                    company_name: data.companyName,
                    gst_number: data.gstNumber,
                    bio: data.bio,
                    street: data.street,
                    city: data.city,
                    state: data.state,
                    zip: data.zip
                };
                break;

            case 'notifications':
                updateData = {
                    notification_preferences: data
                };
                break;

            case 'privacy':
                updateData = {
                    privacy_settings: data
                };
                break;

            case 'language':
                updateData = {
                    language: data.language,
                    region: data.region,
                    date_format: data.dateFormat,
                    time_format: data.timeFormat,
                    currency: data.currency
                };
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid settings section. Must be one of: account, notifications, privacy, language'
                });
        }

        // Remove undefined values
        Object.keys(updateData).forEach(key =>
            updateData[key] === undefined && delete updateData[key]
        );

        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Failed to update settings',
                error: error.message
            });
        }

        res.status(200).json({
            success: true,
            message: `${section.charAt(0).toUpperCase() + section.slice(1)} settings updated successfully`,
            data: updatedUser
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update notification preferences only
// @route   PUT /api/buyer/settings/notifications
// @access  Private (Buyer)
const updateNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const preferences = req.body;

        const { data: updatedUser, error } = await supabase
            .from('users')
            .update({
                notification_preferences: preferences
            })
            .eq('id', userId)
            .select('notification_preferences')
            .single();

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Failed to update notification preferences',
                error: error.message
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notification preferences updated successfully',
            data: updatedUser.notification_preferences
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update privacy settings only
// @route   PUT /api/buyer/settings/privacy
// @access  Private (Buyer)
const updatePrivacy = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const privacySettings = req.body;

        const { data: updatedUser, error } = await supabase
            .from('users')
            .update({
                privacy_settings: privacySettings
            })
            .eq('id', userId)
            .select('privacy_settings')
            .single();

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Failed to update privacy settings',
                error: error.message
            });
        }

        res.status(200).json({
            success: true,
            message: 'Privacy settings updated successfully',
            data: updatedUser.privacy_settings
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update account information
// @route   PUT /api/buyer/settings/account
// @access  Private (Buyer)
const updateAccount = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const {
            firstName,
            lastName,
            phone,
            companyName,
            gstNumber,
            bio,
            street,
            city,
            state,
            zip
        } = req.body;

        const updateData = {
            first_name: firstName,
            last_name: lastName,
            mobile: phone,
            company_name: companyName,
            gst_number: gstNumber,
            bio,
            street,
            city,
            state,
            zip
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key =>
            updateData[key] === undefined && delete updateData[key]
        );

        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select('first_name, last_name, mobile, company_name, gst_number, bio, street, city, state, zip')
            .single();

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Failed to update account information',
                error: error.message
            });
        }

        res.status(200).json({
            success: true,
            message: 'Account information updated successfully',
            data: updatedUser
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update language and regional preferences
// @route   PUT /api/buyer/settings/language
// @access  Private (Buyer)
const updateLanguage = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const {
            language,
            region,
            dateFormat,
            timeFormat,
            currency
        } = req.body;

        const updateData = {
            language,
            region,
            date_format: dateFormat,
            time_format: timeFormat,
            currency
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key =>
            updateData[key] === undefined && delete updateData[key]
        );

        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select('language, region, date_format, time_format, currency')
            .single();

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Failed to update language preferences',
                error: error.message
            });
        }

        res.status(200).json({
            success: true,
            message: 'Language preferences updated successfully',
            data: updatedUser
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSettings,
    updateSettings,
    updateNotifications,
    updatePrivacy,
    updateAccount,
    updateLanguage
};
