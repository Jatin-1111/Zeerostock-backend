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
  },
  logger: true,
  debug: true
});

console.log('📧 Email Service Initialized');
console.log(`SMTP Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
console.log(`SMTP User: ${process.env.SMTP_USER}`);
console.log(`Email From: ${process.env.EMAIL_FROM}`);

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
  },

  /**
   * Send supplier application submitted email
   */
  async sendSupplierApplicationSubmitted(email, { fullName, businessName }) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Supplier Application Received - Zeerostock',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .status-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .timeline { margin: 20px 0; }
            .timeline-item { padding: 10px 0; border-left: 2px solid #28a745; padding-left: 15px; margin-left: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Application Received!</h1>
            </div>
            <div class="content">
              <h2>Hello ${fullName},</h2>
              <p>Thank you for applying to become a verified supplier on Zeerostock!</p>
              
              <div class="status-box">
                <strong>Application Status:</strong> Pending Review<br>
                <strong>Business Name:</strong> ${businessName}<br>
                <strong>Submitted:</strong> ${new Date().toLocaleDateString()}
              </div>

              <h3>What Happens Next?</h3>
              <div class="timeline">
                <div class="timeline-item">
                  <strong>Step 1:</strong> Document Verification (1-2 days)<br>
                  Our team will review your business documents and GST details.
                </div>
                <div class="timeline-item">
                  <strong>Step 2:</strong> Business Validation (1 day)<br>
                  We'll verify your business information and contact details.
                </div>
                <div class="timeline-item">
                  <strong>Step 3:</strong> Final Approval<br>
                  You'll receive an email once your account is approved!
                </div>
              </div>

              <p><strong>Estimated Review Time:</strong> 2-3 business days</p>
              
              <p>We'll notify you via email as soon as your verification is complete.</p>
              
              <p>If you have any questions, feel free to contact our support team.</p>
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
   * Send supplier approved email
   */
  async sendSupplierApproved(email, { fullName, businessName }) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '🎉 Supplier Account Approved - Zeerostock',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .success-box { background-color: #d4edda; border: 2px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; }
            .cta-button { display: inline-block; background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .features { display: flex; flex-wrap: wrap; gap: 15px; margin: 20px 0; }
            .feature { flex: 1; min-width: 200px; background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Congratulations!</h1>
              <p style="font-size: 18px; margin-top: 10px;">Your Supplier Account is Now Active</p>
            </div>
            <div class="content">
              <h2>Hello ${fullName},</h2>
              
              <div class="success-box">
                <h3 style="margin-top: 0; color: #28a745;">✅ Verification Complete!</h3>
                <p style="margin-bottom: 0;">Your supplier account for <strong>${businessName}</strong> has been verified and approved.</p>
              </div>

              <p>You now have full access to supplier features on Zeerostock!</p>

              <h3>What You Can Do Now:</h3>
              <div class="features">
                <div class="feature">
                  📦 <strong>List Products</strong><br>
                  Add your inventory to the marketplace
                </div>
                <div class="feature">
                  📊 <strong>Manage Inventory</strong><br>
                  Track stock and update pricing
                </div>
                <div class="feature">
                  💬 <strong>Respond to Buyers</strong><br>
                  Handle quotes and inquiries
                </div>
                <div class="feature">
                  📈 <strong>View Analytics</strong><br>
                  Track sales and performance
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/dashboard" class="cta-button">Go to Supplier Dashboard</a>
              </div>

              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Switch to Supplier mode from your dashboard</li>
                <li>Complete your supplier profile</li>
                <li>Add your first products</li>
                <li>Start receiving orders!</li>
              </ol>

              <p>Welcome to the Zeerostock supplier community!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
              <p>Need help? Contact us at support@zeerostock.com</p>
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
   * Send supplier rejected email
   */
  async sendSupplierRejected(email, { fullName, businessName, reason }) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Supplier Verification Update - Zeerostock',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .rejection-box { background-color: #f8d7da; border: 2px solid #dc3545; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .cta-button { display: inline-block; background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Supplier Verification Update</h1>
            </div>
            <div class="content">
              <h2>Hello ${fullName},</h2>
              
              <p>Thank you for your interest in becoming a supplier on Zeerostock.</p>
              
              <div class="rejection-box">
                <h3 style="margin-top: 0; color: #dc3545;">Application Status: Not Approved</h3>
                <p>We are unable to approve your supplier account for <strong>${businessName}</strong> at this time.</p>
                <p><strong>Reason:</strong></p>
                <p>${reason}</p>
              </div>

              <h3>What You Can Do:</h3>
              <ul>
                <li>Review the reason provided above</li>
                <li>Address the concerns mentioned</li>
                <li>Gather any missing documents or information</li>
                <li>Reapply once you've made the necessary changes</li>
              </ul>

              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/supplier/apply" class="cta-button">Reapply as Supplier</a>
              </div>

              <p>If you have any questions or need clarification, please don't hesitate to contact our support team.</p>
              
              <p>We appreciate your understanding and look forward to potentially working with you in the future.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
              <p>Contact support: support@zeerostock.com | +91-XXXXXXXXXX</p>
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
   * Send admin credentials email
   */
  async sendAdminCredentials({ email, name, adminId, tempPassword, expiresIn = '24 hours' }) {
    const loginUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin-panel/login';

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your Zeerostock Admin Panel Access Credentials',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; }
            .credentials { background: white; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0; border-radius: 4px; }
            .credential-row { margin: 15px 0; }
            .label { font-weight: bold; color: #6b7280; font-size: 14px; }
            .value { font-family: 'Courier New', monospace; font-size: 18px; color: #111827; background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; }
            .button { display: inline-block; background: #2563eb; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .warning ul { margin: 10px 0; padding-left: 20px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔐 Admin Access Granted</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Zeerostock Admin Panel</p>
            </div>
            
            <div class="content">
              <p style="font-size: 16px;">Hi <strong>${name}</strong>,</p>
              
              <p>Welcome to the Zeerostock Admin Panel! Your admin account has been created successfully.</p>
              
              <p>Use the following credentials to log in:</p>
              
              <div class="credentials">
                <div class="credential-row">
                  <div class="label">Admin ID:</div>
                  <div class="value">${adminId}</div>
                </div>
                <div class="credential-row">
                  <div class="label">Temporary Password:</div>
                  <div class="value">${tempPassword}</div>
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="${loginUrl}" class="button">🚀 Login to Admin Panel</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ IMPORTANT SECURITY NOTES:</strong>
                <ul>
                  <li><strong>You MUST change your password on first login</strong></li>
                  <li>These credentials expire in <strong>${expiresIn}</strong></li>
                  <li>Keep your Admin ID and password confidential</li>
                  <li>Never share your credentials with anyone</li>
                  <li>Contact your administrator if you didn't request this access</li>
                </ul>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                <strong>Need help?</strong> Contact your system administrator or reply to this email.
              </p>
            </div>
            
            <div class="footer">
              <p><strong>Zeerostock Admin Panel</strong></p>
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
              <p style="margin-top: 10px;">This is an automated message. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${name},

Welcome to Zeerostock Admin Panel!

Your admin account has been created. Please use the following credentials to log in:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin ID:           ${adminId}
Temporary Password: ${tempPassword}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 Login URL: ${loginUrl}

⏰ EXPIRES IN: ${expiresIn}

⚠️ IMPORTANT:
1. You MUST change your password on first login
2. These credentials expire in ${expiresIn}
3. Keep your credentials confidential
4. Contact support if you didn't request this

Best regards,
Zeerostock Team

© ${new Date().getFullYear()} Zeerostock. All rights reserved.
      `.trim()
    };

    try {
      if (!transporter.options.auth.user) {
        // Log email in development mode
        console.log('\n📧 ADMIN CREDENTIALS EMAIL (Development Mode):');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`To: ${email}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(mailOptions.text);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return true;
      }

      await transporter.sendMail(mailOptions);
      console.log(`✅ Admin credentials email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending admin credentials email:', error);
      return false;
    }
  },

  /**
   * Send password reset email for admin
   */
  async sendAdminPasswordReset({ email, name, adminId, tempPassword }) {
    const loginUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin-panel/login';

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your Zeerostock Admin Password Has Been Reset',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; }
            .credentials { background: white; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0; border-radius: 4px; }
            .credential-row { margin: 15px 0; }
            .label { font-weight: bold; color: #6b7280; font-size: 14px; }
            .value { font-family: 'Courier New', monospace; font-size: 18px; color: #111827; background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; }
            .button { display: inline-block; background: #dc2626; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔐 Password Reset</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Zeerostock Admin Panel</p>
            </div>
            
            <div class="content">
              <p style="font-size: 16px;">Hi <strong>${name}</strong>,</p>
              
              <p>Your admin password has been reset by your system administrator.</p>
              
              <p>Here are your new temporary credentials:</p>
              
              <div class="credentials">
                <div class="credential-row">
                  <div class="label">Admin ID:</div>
                  <div class="value">${adminId}</div>
                </div>
                <div class="credential-row">
                  <div class="label">New Temporary Password:</div>
                  <div class="value">${tempPassword}</div>
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="${loginUrl}" class="button">🔑 Login Now</a>
              </div>
              
              <p style="background: #fee2e2; padding: 15px; border-radius: 4px; border-left: 4px solid #dc2626;">
                <strong>⚠️ Important:</strong> You will be required to change this password immediately after logging in.
              </p>

              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                If you didn't request this password reset, please contact your system administrator immediately.
              </p>
            </div>
            
            <div class="footer">
              <p><strong>Zeerostock Admin Panel</strong></p>
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${name},

Your admin password has been reset.

New Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin ID:           ${adminId}
Temporary Password: ${tempPassword}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Login URL: ${loginUrl}

⚠️ You will be required to change this password immediately after logging in.

If you didn't request this, contact your administrator immediately.

Best regards,
Zeerostock Team

© ${new Date().getFullYear()} Zeerostock. All rights reserved.
      `.trim()
    };

    try {
      if (!transporter.options.auth.user) {
        console.log('\n📧 PASSWORD RESET EMAIL (Development Mode):');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`To: ${email}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(mailOptions.text);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return true;
      }

      await transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      return false;
    }
  },

  // =====================================================
  // ORDER EMAILS
  // =====================================================

  /**
   * Send order confirmation email to buyer
   */
  async sendOrderConfirmation(email, orderData) {
    const { orderNumber, buyerName, items, totalAmount, paymentMethod, shippingAddress, estimatedDelivery } = orderData;

    console.log(`📧 Attempting to send order confirmation to: ${email}`);
    console.log(`   Order Number: ${orderNumber}`);

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.price.toLocaleString()}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">₹${item.totalPrice.toLocaleString()}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Order Confirmation - ${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .order-box { background: white; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .total-row { font-weight: bold; background: #f3f4f6; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Order Confirmed!</h1>
              <p style="margin: 5px 0;">Thank you for your order</p>
            </div>
            <div class="content">
              <h2>Hello ${buyerName},</h2>
              <p>Your order has been successfully placed and is being processed.</p>
              
              <div class="order-box">
                <h3 style="margin-top: 0;">Order Details</h3>
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Order Date:</strong> ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Payment Method:</strong> ${paymentMethod}</p>
                ${estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>` : ''}
              </div>

              <h3>Order Items</h3>
              <table>
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: center;">Quantity</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                    <th style="padding: 10px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr class="total-row">
                    <td colspan="3" style="padding: 15px; text-align: right;">Total Amount:</td>
                    <td style="padding: 15px; text-align: right; color: #28a745; font-size: 18px;">₹${totalAmount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              ${shippingAddress ? `
                <h3>Shipping Address</h3>
                <div class="order-box">
                  <p>${shippingAddress.name}<br>
                  ${shippingAddress.address}<br>
                  ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.pincode}<br>
                  Phone: ${shippingAddress.phone}</p>
                </div>
              ` : ''}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/buyer/orders/${orderNumber}" class="button">Track Your Order</a>
              </div>

              <p>We'll send you another email once your order has shipped.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Order confirmation email sent successfully`);
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   Response: ${info.response}`);
      return true;
    } catch (error) {
      console.error(`❌ Email send error for order confirmation:`, error);
      console.error(`   To: ${email}`);
      console.error(`   Error Code: ${error.code}`);
      console.error(`   Error Message: ${error.message}`);
      return false;
    }
  },

  /**
   * Send order shipped notification to buyer
   */
  async sendOrderShipped(email, shipmentData) {
    const { orderNumber, buyerName, trackingNumber, courierName, estimatedDelivery, trackingUrl } = shipmentData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Order Shipped - ${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .tracking-box { background: white; padding: 25px; margin: 20px 0; border: 2px solid #2563eb; border-radius: 8px; text-align: center; }
            .tracking-number { font-size: 24px; font-weight: bold; color: #2563eb; letter-spacing: 2px; }
            .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📦 Your Order is On Its Way!</h1>
            </div>
            <div class="content">
              <h2>Hello ${buyerName},</h2>
              <p>Great news! Your order <strong>${orderNumber}</strong> has been shipped.</p>
              
              <div class="tracking-box">
                <p style="margin: 0 0 10px 0; color: #6b7280;">Tracking Number</p>
                <div class="tracking-number">${trackingNumber}</div>
                <p style="margin: 15px 0 0 0; color: #6b7280;">Courier: ${courierName}</p>
              </div>

              ${estimatedDelivery ? `<p style="text-align: center; font-size: 16px;"><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>` : ''}

              ${trackingUrl ? `
                <div style="text-align: center;">
                  <a href="${trackingUrl}" class="button">Track Your Shipment</a>
                </div>
              ` : ''}

              <p>You can track your shipment using the tracking number above on the courier's website.</p>
              <p>We'll notify you once your order has been delivered.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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
   * Send order delivered notification to buyer
   */
  async sendOrderDelivered(email, deliveryData) {
    const { orderNumber, buyerName, deliveredDate } = deliveryData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Order Delivered - ${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .success-box { background: #d4edda; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; border: 2px solid #28a745; }
            .button { display: inline-block; background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
            .button-secondary { background-color: #6c757d; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Order Delivered!</h1>
            </div>
            <div class="content">
              <h2>Hello ${buyerName},</h2>
              
              <div class="success-box">
                <h3 style="margin: 0 0 10px 0; color: #28a745;">✅ Successfully Delivered</h3>
                <p style="margin: 0;">Order ${orderNumber}</p>
                <p style="margin: 10px 0 0 0; color: #6b7280;">Delivered on ${deliveredDate}</p>
              </div>

              <p>We hope you're satisfied with your order!</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/buyer/orders/${orderNumber}" class="button">View Order Details</a>
                <a href="${process.env.FRONTEND_URL}/buyer/orders/${orderNumber}/review" class="button button-secondary">Write a Review</a>
              </div>

              <p>If you have any issues with your order, please contact our support team within 7 days.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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
   * Send order cancellation confirmation
   */
  async sendOrderCancelled(email, cancellationData) {
    const { orderNumber, buyerName, cancellationReason, refundAmount, refundMethod, refundTimeline } = cancellationData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Order Cancelled - ${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #dc3545; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Cancelled</h1>
            </div>
            <div class="content">
              <h2>Hello ${buyerName},</h2>
              <p>Your order <strong>${orderNumber}</strong> has been cancelled.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">Cancellation Details</h3>
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Cancelled On:</strong> ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                ${cancellationReason ? `<p><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
              </div>

              ${refundAmount ? `
                <div class="info-box" style="border-left-color: #28a745;">
                  <h3 style="margin-top: 0; color: #28a745;">Refund Information</h3>
                  <p><strong>Refund Amount:</strong> ₹${refundAmount.toLocaleString()}</p>
                  <p><strong>Refund Method:</strong> ${refundMethod}</p>
                  <p><strong>Expected Timeline:</strong> ${refundTimeline || '5-7 business days'}</p>
                </div>
              ` : ''}

              <p>If you have any questions about this cancellation, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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
   * Send new order notification to supplier
   */
  async sendNewOrderToSupplier(email, orderData) {
    const { supplierName, orderNumber, buyerCompany, items, totalAmount, shippingAddress } = orderData;

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.price.toLocaleString()}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `New Order Received - ${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .order-box { background: white; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛒 New Order Received!</h1>
            </div>
            <div class="content">
              <h2>Hello ${supplierName},</h2>
              <p>You have received a new order from <strong>${buyerCompany}</strong>.</p>
              
              <div class="order-box">
                <h3 style="margin-top: 0;">Order Details</h3>
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Order Date:</strong> ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Total Amount:</strong> ₹${totalAmount.toLocaleString()}</p>
              </div>

              <h3>Order Items</h3>
              <table>
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: center;">Quantity</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              ${shippingAddress ? `
                <h3>Shipping Address</h3>
                <div class="order-box">
                  <p>${shippingAddress.name}<br>
                  ${shippingAddress.address}<br>
                  ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.pincode}<br>
                  Phone: ${shippingAddress.phone}</p>
                </div>
              ` : ''}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/supplier/orders/${orderNumber}" class="button">View Order Details</a>
              </div>

              <p>Please process this order and update the shipping status once dispatched.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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

  // =====================================================
  // PAYMENT EMAILS
  // =====================================================

  /**
   * Send payment success receipt
   */
  async sendPaymentReceipt(email, paymentData) {
    const { buyerName, transactionId, amount, paymentMethod, orderNumber, paymentDate } = paymentData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Payment Receipt - ${transactionId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .receipt-box { background: white; padding: 25px; margin: 20px 0; border: 2px dashed #28a745; border-radius: 8px; }
            .amount { font-size: 32px; font-weight: bold; color: #28a745; text-align: center; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Payment Successful</h1>
            </div>
            <div class="content">
              <h2>Hello ${buyerName},</h2>
              <p>Your payment has been successfully processed.</p>
              
              <div class="amount">₹${amount.toLocaleString()}</div>

              <div class="receipt-box">
                <h3 style="margin-top: 0;">Payment Details</h3>
                <p><strong>Transaction ID:</strong> ${transactionId}</p>
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Payment Method:</strong> ${paymentMethod}</p>
                <p><strong>Date:</strong> ${paymentDate || new Date().toLocaleString('en-IN')}</p>
                <p><strong>Status:</strong> <span style="color: #28a745;">Paid</span></p>
              </div>

              <p style="text-align: center; color: #6b7280; font-size: 14px;">
                This is your payment receipt. Please save it for your records.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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
   * Send payment failed notification
   */
  async sendPaymentFailed(email, paymentData) {
    const { buyerName, orderNumber, amount, failureReason } = paymentData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Payment Failed - Order ${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .error-box { background: #f8d7da; padding: 20px; margin: 20px 0; border-left: 4px solid #dc3545; border-radius: 5px; }
            .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Payment Failed</h1>
            </div>
            <div class="content">
              <h2>Hello ${buyerName},</h2>
              <p>Unfortunately, your payment for order <strong>${orderNumber}</strong> could not be processed.</p>
              
              <div class="error-box">
                <h3 style="margin-top: 0; color: #dc3545;">Payment Details</h3>
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Amount:</strong> ₹${amount.toLocaleString()}</p>
                ${failureReason ? `<p><strong>Reason:</strong> ${failureReason}</p>` : ''}
              </div>

              <h3>What to do next:</h3>
              <ul>
                <li>Check if you have sufficient balance in your account</li>
                <li>Verify your payment details are correct</li>
                <li>Try using a different payment method</li>
                <li>Contact your bank if the issue persists</li>
              </ul>

              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/buyer/orders/${orderNumber}/payment" class="button">Retry Payment</a>
              </div>

              <p>If you continue to face issues, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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
   * Send invoice email with PDF attachment
   */
  async sendInvoice(email, invoiceData, pdfBuffer) {
    const { buyerName, invoiceNumber, orderNumber, amount } = invoiceData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Invoice ${invoiceNumber} - Order ${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .invoice-box { background: white; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📄 Invoice</h1>
            </div>
            <div class="content">
              <h2>Hello ${buyerName},</h2>
              <p>Please find attached your invoice for order <strong>${orderNumber}</strong>.</p>
              
              <div class="invoice-box">
                <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Invoice Date:</strong> ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Total Amount:</strong> ₹${amount.toLocaleString()}</p>
              </div>

              <p>The invoice PDF is attached to this email for your records.</p>
              <p>Thank you for your business!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: pdfBuffer ? [{
        filename: `Invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }] : []
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
   * Send refund initiated notification
   */
  async sendRefundInitiated(email, refundData) {
    const { buyerName, orderNumber, refundAmount, refundMethod, refundId, estimatedDays } = refundData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Refund Initiated - Order ${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .refund-box { background: #fef3c7; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Refund Initiated</h1>
            </div>
            <div class="content">
              <h2>Hello ${buyerName},</h2>
              <p>Your refund for order <strong>${orderNumber}</strong> has been initiated.</p>
              
              <div class="refund-box">
                <h3 style="margin-top: 0;">Refund Details</h3>
                <p><strong>Refund ID:</strong> ${refundId}</p>
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Refund Amount:</strong> ₹${refundAmount.toLocaleString()}</p>
                <p><strong>Refund Method:</strong> ${refundMethod}</p>
                <p><strong>Estimated Timeline:</strong> ${estimatedDays || '5-7'} business days</p>
              </div>

              <p>The refund will be credited to your original payment method.</p>
              <p>You'll receive another email once the refund has been processed.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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
   * Send refund completed notification
   */
  async sendRefundCompleted(email, refundData) {
    const { buyerName, orderNumber, refundAmount, refundMethod, refundId, completedDate } = refundData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Refund Completed - Order ${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .success-box { background: #d4edda; padding: 20px; margin: 20px 0; border-left: 4px solid #28a745; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Refund Completed</h1>
            </div>
            <div class="content">
              <h2>Hello ${buyerName},</h2>
              <p>Your refund for order <strong>${orderNumber}</strong> has been successfully processed.</p>
              
              <div class="success-box">
                <h3 style="margin-top: 0; color: #28a745;">Refund Details</h3>
                <p><strong>Refund ID:</strong> ${refundId}</p>
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Refund Amount:</strong> ₹${refundAmount.toLocaleString()}</p>
                <p><strong>Refund Method:</strong> ${refundMethod}</p>
                <p><strong>Completed On:</strong> ${completedDate || new Date().toLocaleDateString('en-IN')}</p>
              </div>

              <p>The amount has been credited to your ${refundMethod}.</p>
              <p>Depending on your bank, it may take 2-3 business days for the refund to reflect in your account.</p>
              
              <p>Thank you for your patience!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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

  // =====================================================
  // QUOTE EMAILS
  // =====================================================

  /**
   * Send quote submitted confirmation to supplier
   */
  async sendQuoteSubmittedConfirmation(email, quoteData) {
    const { supplierName, quoteNumber, rfqTitle, quotePrice, deliveryDays, validUntil } = quoteData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Quote Submitted - ${quoteNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .quote-box { background: white; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Quote Submitted Successfully</h1>
            </div>
            <div class="content">
              <h2>Hello ${supplierName},</h2>
              <p>Your quote has been successfully submitted to the buyer.</p>
              
              <div class="quote-box">
                <h3 style="margin-top: 0;">Quote Details</h3>
                <p><strong>Quote Number:</strong> ${quoteNumber}</p>
                <p><strong>RFQ:</strong> ${rfqTitle}</p>
                <p><strong>Quote Price:</strong> ₹${quotePrice.toLocaleString()}</p>
                <p><strong>Delivery:</strong> ${deliveryDays} days</p>
                <p><strong>Valid Until:</strong> ${new Date(validUntil).toLocaleDateString('en-IN')}</p>
              </div>

              <p>The buyer has been notified and will review your quote. We'll email you once they respond.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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
   * Send quote accepted notification to supplier
   */
  async sendQuoteAccepted(email, quoteData) {
    const { supplierName, quoteNumber, rfqTitle, buyerCompany, quotePrice, orderCreated, orderNumber } = quoteData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `🎉 Quote Accepted - ${quoteNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .success-box { background: #d4edda; padding: 20px; margin: 20px 0; border: 2px solid #28a745; border-radius: 8px; }
            .button { display: inline-block; background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Congratulations!</h1>
              <p style="margin: 5px 0;">Your Quote Has Been Accepted</p>
            </div>
            <div class="content">
              <h2>Hello ${supplierName},</h2>
              <p>Great news! <strong>${buyerCompany}</strong> has accepted your quote.</p>
              
              <div class="success-box">
                <h3 style="margin-top: 0; color: #28a745;">Quote Accepted</h3>
                <p><strong>Quote Number:</strong> ${quoteNumber}</p>
                <p><strong>RFQ:</strong> ${rfqTitle}</p>
                <p><strong>Quote Price:</strong> ₹${quotePrice.toLocaleString()}</p>
                ${orderCreated ? `<p><strong>Order Number:</strong> ${orderNumber}</p>` : ''}
              </div>

              ${orderCreated ? `
                <p>An order has been automatically created. Please review the order details and prepare for shipment.</p>
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL}/supplier/orders/${orderNumber}" class="button">View Order</a>
                </div>
              ` : `
                <p>Please coordinate with the buyer for the next steps.</p>
              `}

              <p>Keep up the great work!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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
   * Send quote rejected notification to supplier
   */
  async sendQuoteRejected(email, quoteData) {
    const { supplierName, quoteNumber, rfqTitle, buyerCompany, rejectionReason } = quoteData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Quote Update - ${quoteNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #6c757d; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #6c757d; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Quote Status Update</h1>
            </div>
            <div class="content">
              <h2>Hello ${supplierName},</h2>
              <p>Thank you for submitting your quote. Unfortunately, <strong>${buyerCompany}</strong> has decided not to proceed with your quote at this time.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">Quote Details</h3>
                <p><strong>Quote Number:</strong> ${quoteNumber}</p>
                <p><strong>RFQ:</strong> ${rfqTitle}</p>
                ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
              </div>

              <p>Don't be discouraged! There are many more opportunities available on Zeerostock.</p>
              <p>Keep an eye out for new RFQs that match your business.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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

  // =====================================================
  // RFQ EMAILS
  // =====================================================

  /**
   * Send RFQ posted confirmation to buyer
   */
  async sendRFQPostedConfirmation(email, rfqData) {
    const { buyerName, rfqNumber, title, quantity, unit, expiresAt } = rfqData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `RFQ Posted Successfully - ${rfqNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .rfq-box { background: white; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 5px; }
            .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ RFQ Posted Successfully</h1>
            </div>
            <div class="content">
              <h2>Hello ${buyerName},</h2>
              <p>Your Request for Quote has been successfully posted on Zeerostock!</p>
              
              <div class="rfq-box">
                <h3 style="margin-top: 0;">RFQ Details</h3>
                <p><strong>RFQ Number:</strong> ${rfqNumber}</p>
                <p><strong>Title:</strong> ${title}</p>
                <p><strong>Quantity:</strong> ${quantity} ${unit}</p>
                <p><strong>Expires On:</strong> ${new Date(expiresAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>

              <p>Relevant suppliers have been notified about your RFQ. You'll start receiving quotes soon!</p>

              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/buyer/rfq/${rfqNumber}" class="button">View RFQ</a>
              </div>

              <p>We'll notify you via email when suppliers submit their quotes.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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
   * Send new RFQ notification to matching suppliers
   */
  async sendNewRFQToSuppliers(email, rfqData) {
    const { supplierName, rfqNumber, title, buyerCompany, quantity, unit, budgetRange, expiresAt, category } = rfqData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `New RFQ Available - ${title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .rfq-box { background: white; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 5px; }
            .highlight { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; }
            .button { display: inline-block; background-color: #f59e0b; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 New RFQ Opportunity!</h1>
            </div>
            <div class="content">
              <h2>Hello ${supplierName},</h2>
              <p>A new Request for Quote matching your business category has been posted!</p>
              
              <div class="rfq-box">
                <h3 style="margin-top: 0; color: #f59e0b;">RFQ Details</h3>
                <p><strong>RFQ Number:</strong> ${rfqNumber}</p>
                <p><strong>Title:</strong> ${title}</p>
                <p><strong>Company:</strong> ${buyerCompany}</p>
                <p><strong>Category:</strong> ${category}</p>
                <p><strong>Quantity:</strong> ${quantity} ${unit}</p>
                ${budgetRange ? `<p><strong>Budget:</strong> ${budgetRange}</p>` : ''}
                <p><strong>Deadline:</strong> ${new Date(expiresAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>

              <div class="highlight">
                <strong>⏰ Act Fast!</strong> Submit your competitive quote before ${new Date(expiresAt).toLocaleDateString('en-IN')}.
              </div>

              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/supplier/rfq/${rfqNumber}" class="button">View RFQ & Submit Quote</a>
              </div>

              <p>Don't miss this opportunity to win new business!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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
   * Send RFQ closed notification to suppliers who quoted
   */
  async sendRFQClosed(email, rfqData) {
    const { supplierName, rfqNumber, title, closedReason } = rfqData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `RFQ Closed - ${rfqNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #6c757d; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #6c757d; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>RFQ Closed</h1>
            </div>
            <div class="content">
              <h2>Hello ${supplierName},</h2>
              <p>The RFQ you quoted for has been closed.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">RFQ Details</h3>
                <p><strong>RFQ Number:</strong> ${rfqNumber}</p>
                <p><strong>Title:</strong> ${title}</p>
                ${closedReason ? `<p><strong>Reason:</strong> ${closedReason}</p>` : ''}
              </div>

              <p>Thank you for submitting your quote. We appreciate your participation.</p>
              <p>Keep checking for new RFQ opportunities on Zeerostock!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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
   * Send RFQ updated notification to suppliers who quoted
   */
  async sendRFQUpdated(email, rfqData) {
    const { supplierName, rfqNumber, title, updatedFields } = rfqData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `RFQ Updated - ${rfqNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .warning-box { background: #fef3c7; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .button { display: inline-block; background-color: #f59e0b; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ RFQ Updated</h1>
            </div>
            <div class="content">
              <h2>Hello ${supplierName},</h2>
              <p>An RFQ you quoted for has been updated by the buyer.</p>
              
              <div class="warning-box">
                <h3 style="margin-top: 0; color: #f59e0b;">Important Notice</h3>
                <p><strong>RFQ Number:</strong> ${rfqNumber}</p>
                <p><strong>Title:</strong> ${title}</p>
                ${updatedFields ? `<p><strong>Updated:</strong> ${updatedFields}</p>` : ''}
              </div>

              <p>Please review the updated requirements and consider revising your quote if necessary.</p>

              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/supplier/rfq/${rfqNumber}" class="button">View Updated RFQ</a>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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

  // =====================================================
  // ACCOUNT MANAGEMENT EMAILS
  // =====================================================

  /**
   * Send profile updated confirmation
   */
  async sendProfileUpdated(email, profileData) {
    const { userName, updatedFields } = profileData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Profile Updated Successfully',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Profile Updated</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>Your profile has been successfully updated.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">Updated Information</h3>
                <p>${updatedFields || 'Your profile information has been updated.'}</p>
                <p><strong>Updated On:</strong> ${new Date().toLocaleString('en-IN')}</p>
              </div>

              <p>If you didn't make this change, please contact our support team immediately.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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
   * Send role switched notification
   */
  async sendRoleSwitched(email, roleData) {
    const { userName, newRole, previousRole } = roleData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Role Switched Successfully',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .role-box { background: white; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 5px; text-align: center; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔄 Role Switched</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>Your account role has been successfully switched.</p>
              
              <div class="role-box">
                <p style="font-size: 18px;"><strong>${previousRole}</strong></p>
                <p style="font-size: 24px; margin: 10px 0;">↓</p>
                <p style="font-size: 18px; color: #2563eb;"><strong>${newRole}</strong></p>
              </div>

              <p>You now have access to ${newRole} features and functionality.</p>
              <p>If you didn't make this change, please contact support immediately.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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
   * Send account deactivation confirmation
   */
  async sendAccountDeactivated(email, accountData) {
    const { userName, reactivationLink } = accountData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Account Deactivated',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .warning-box { background: #f8d7da; padding: 20px; margin: 20px 0; border-left: 4px solid #dc3545; }
            .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Account Deactivated</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>Your Zeerostock account has been deactivated as requested.</p>
              
              <div class="warning-box">
                <h3 style="margin-top: 0;">What This Means:</h3>
                <ul>
                  <li>You won't be able to access your account</li>
                  <li>Your profile is hidden from other users</li>
                  <li>Active orders and quotes are preserved</li>
                  <li>Your data is retained for 90 days</li>
                </ul>
              </div>

              <p><strong>Changed your mind?</strong> You can reactivate your account anytime within 90 days.</p>

              ${reactivationLink ? `
                <div style="text-align: center;">
                  <a href="${reactivationLink}" class="button">Reactivate Account</a>
                </div>
              ` : ''}

              <p>If you didn't request this, please contact support immediately.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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
   * Send supplier verification under review notification
   */
  async sendSupplierUnderReview(email, supplierData) {
    const { fullName, businessName } = supplierData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Supplier Application Under Review',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .status-box { background: #fef3c7; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Application Under Review</h1>
            </div>
            <div class="content">
              <h2>Hello ${fullName},</h2>
              <p>Your supplier application for <strong>${businessName}</strong> is now under review by our verification team.</p>
              
              <div class="status-box">
                <h3 style="margin-top: 0;">Current Status: Under Review</h3>
                <p>Our team is carefully reviewing your documents and business information.</p>
                <p><strong>Expected Completion:</strong> 1-2 business days</p>
              </div>

              <p>We'll notify you via email once the review is complete.</p>
              <p>Thank you for your patience!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zeerostock. All rights reserved.</p>
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
