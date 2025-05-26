// utils/sendEmail.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // Use your preferred email service
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
  },
  port: 587, // Correct port for Gmail with TLS
  secure: false, // Use TLS
  tls: {
    rejectUnauthorized: false, // Optional for testing; remove in production
  },
});

const sendVerificationEmail = async (email, name, token) => {
  const verificationUrl = `http://localhost:5000/api/auth/verify-email?token=${token}`; // Update with your domain in production
  const mailOptions = {
    from: `"Sharplogicians" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; background-color: #f0f2f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(90deg, #2563eb, #3b82f6); padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff;">Welcome to Your App Name</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h2 style="font-size: 24px; font-weight: 600; color: #1f2937; margin: 0 0 20px;">Hello, ${name}</h2>
              <p style="font-size: 16px; color: #4b5563; line-height: 1.5; margin: 0 0 20px;">
                Thank you for signing up! To get started, please verify your email address by clicking the button below.
              </p>
              <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 600; color: #ffffff; background: linear-gradient(90deg, #2563eb, #3b82f6); text-decoration: none; border-radius: 8px; transition: background 0.3s;">Verify Your Email</a>
              <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0;">
                This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                &copy; ${new Date().getFullYear()} Your App Name. All rights reserved.<br />
                <a href="https://sharplogicians.com" style="color: #2563eb; text-decoration: none;">Visit our website</a>
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send verification email');
  }
};

module.exports = { sendVerificationEmail };