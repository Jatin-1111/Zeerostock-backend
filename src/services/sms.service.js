const twilio = require('twilio');
require('dotenv').config();

// Initialize Twilio client
let twilioClient = null;

try {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
    }
} catch (error) {
    console.warn('Twilio not configured:', error.message);
}

// SMS service
const smsService = {
    /**
     * Send OTP via SMS
     */
    async sendOTP(mobile, otp) {
        if (!twilioClient) {
            console.warn('Twilio not configured, skipping SMS');
            return false;
        }

        try {
            const message = await twilioClient.messages.create({
                body: `Your Zeerostock verification code is: ${otp}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. Do not share this code.`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+91${mobile}`
            });

            console.log('SMS sent:', message.sid);
            return true;
        } catch (error) {
            console.error('SMS send error:', error);
            return false;
        }
    },

    /**
     * Send login OTP
     */
    async sendLoginOTP(mobile, otp) {
        if (!twilioClient) {
            console.warn('Twilio not configured, skipping SMS');
            return false;
        }

        try {
            const message = await twilioClient.messages.create({
                body: `Your Zeerostock login OTP is: ${otp}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+91${mobile}`
            });

            console.log('SMS sent:', message.sid);
            return true;
        } catch (error) {
            console.error('SMS send error:', error);
            return false;
        }
    },

    /**
     * Format mobile number
     */
    formatMobile(mobile) {
        // Remove all non-digit characters
        mobile = mobile.replace(/\D/g, '');

        // If starts with 91, remove it
        if (mobile.startsWith('91')) {
            mobile = mobile.substring(2);
        }

        // If starts with +91, remove it
        if (mobile.startsWith('+91')) {
            mobile = mobile.substring(3);
        }

        return mobile;
    }
};

module.exports = smsService;
