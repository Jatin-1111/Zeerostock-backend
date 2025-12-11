const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Email service
const emailService = {
    /**
     * Send OTP email
     */
    async sendOTP(email, otp, firstName) {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Verify Your Zeerostock Account',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .otp-box { background-color: white; padding: 20px; text-align: center; margin: 20px 0; border: 2px dashed #007bff; }
            .otp { font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Zeerostock</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Thank you for signing up with Zeerostock B2B Marketplace!</p>
              <p>Please use the following OTP to verify your account:</p>
              <div class="otp-box">
                <div class="otp">${otp}</div>
              </div>
              <p>This OTP will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
              <p>SOC2 Compliant | GDPR Compliant | SSL Secured</p>
            </div>
          </div>
        </body>
        </html>
      `
        };

        try {
            await transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Email send error:', error);
            return false;
        }
    },

    /**
     * Send password reset email
     */
    async sendPasswordReset(email, resetLink, firstName) {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Reset Your Zeerostock Password',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Zeerostock</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>We received a request to reset your password.</p>
              <p>Click the button below to reset your password:</p>
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
                <p>Or copy and paste this link into your browser:</p>
                <p><a href="${resetLink}">${resetLink}</a></p>
              </div>
              <p>This link will expire in 15 minutes.</p>
              <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
              <p>For security reasons, never share this link with anyone.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
              <p>SOC2 Compliant | GDPR Compliant | SSL Secured</p>
            </div>
          </div>
        </body>
        </html>
      `
        };

        try {
            await transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Email send error:', error);
            return false;
        }
    },

    /**
     * Send welcome email
     */
    async sendWelcome(email, firstName, role) {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Welcome to Zeerostock!',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Zeerostock!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Your account has been successfully verified!</p>
              <p>You're now part of India's leading B2B marketplace as a <strong>${role}</strong>.</p>
              <p>Start exploring and connecting with businesses today!</p>
              <h3>What's Next?</h3>
              <ul>
                <li>Complete your business profile</li>
                <li>Add your GST details (if applicable)</li>
                <li>Browse products and suppliers</li>
                <li>Start placing orders</li>
              </ul>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
              <p>SOC2 Compliant | GDPR Compliant | SSL Secured</p>
            </div>
          </div>
        </body>
        </html>
      `
        };

        try {
            await transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Email send error:', error);
            return false;
        }
    }
};

module.exports = emailService;
