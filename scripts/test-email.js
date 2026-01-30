const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('🧪 Email Configuration Test');
console.log('============================\n');

// Log configuration
console.log('SMTP Configuration:');
console.log(`  Host: ${process.env.SMTP_HOST}`);
console.log(`  Port: ${process.env.SMTP_PORT}`);
console.log(`  Secure: ${process.env.SMTP_SECURE}`);
console.log(`  User: ${process.env.SMTP_USER}`);
console.log(`  From: ${process.env.EMAIL_FROM}`);
console.log(`  Frontend URL: ${process.env.FRONTEND_URL}\n`);

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

// Test email
async function testEmail() {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: 'test@example.com',  // Change this to a real email
        subject: '🧪 Zeerostock Email Test',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Email Test Successful!</h1>
          </div>
          <div class="content">
            <h2>This is a test email from Zeerostock</h2>
            <p>If you received this email, the SMTP configuration is working correctly.</p>
            <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
            <p><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}</p>
          </div>
        </div>
      </body>
      </html>
    `
    };

    try {
        console.log('📧 Testing email connection...\n');
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Response: ${info.response}`);
        console.log('\n✨ Email service is working correctly!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error sending test email:');
        console.error(`   Code: ${error.code}`);
        console.error(`   Message: ${error.message}`);
        console.error(`   Command: ${error.command}`);
        console.error(`   Response: ${error.response}`);
        console.error('\n⚠️ Check your SMTP credentials in .env file');
        process.exit(1);
    }
}

testEmail();
