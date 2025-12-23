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
  }
};

module.exports = emailService;
