const nodemailer = require('nodemailer');
const logger = require('./logger');

// ── Create reusable transporter ───────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// ── Base email template ───────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background: #f0f4ff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a3a8a, #2563EB); padding: 32px 40px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.75); margin: 6px 0 0; font-size: 13px; }
    .body { padding: 36px 40px; }
    .body p { color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #1D4ED8, #2563EB); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 8px 0 24px; }
    .note { background: #F8FAFC; border-radius: 10px; padding: 14px 18px; font-size: 13px; color: #64748B; line-height: 1.6; }
    .footer { background: #F8FAFC; padding: 20px 40px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>LASUConnect</h1>
      <p>Lagos State University · Official Campus Platform</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} LASUConnect · Lagos State University, Ojo<br/>
      This email was sent to a verified LASU student email address.
    </div>
  </div>
</body>
</html>
`;

// ── Send verification email ───────────────────────────────
const sendVerificationEmail = async ({ to, fullName, verificationUrl }) => {
  const transporter = createTransporter();

  const content = `
    <p>Hi <strong>${fullName}</strong> 👋</p>
    <p>Welcome to <strong>LASUConnect</strong> — the official campus social platform for LASU students!</p>
    <p>Please verify your email address to activate your account:</p>
    <div style="text-align:center">
      <a href="${verificationUrl}" class="btn">✅ Verify My Account</a>
    </div>
    <div class="note">
      <strong>Link expires in 24 hours.</strong><br/>
      If you didn't create a LASUConnect account, you can safely ignore this email.
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'LASUConnect <noreply@lasuconnect.com>',
      to,
      subject: '✅ Verify your LASUConnect account',
      html: baseTemplate(content),
    });
    logger.info(`📧 Verification email sent to ${to}`);
  } catch (err) {
    logger.error(`❌ Failed to send verification email to ${to}: ${err.message}`);
    throw err;
  }
};

// ── Send password reset email ─────────────────────────────
const sendPasswordResetEmail = async ({ to, fullName, resetUrl }) => {
  const transporter = createTransporter();

  const content = `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>You requested a password reset for your LASUConnect account.</p>
    <p>Click the button below to set a new password:</p>
    <div style="text-align:center">
      <a href="${resetUrl}" class="btn">🔑 Reset My Password</a>
    </div>
    <div class="note">
      <strong>This link expires in 10 minutes.</strong><br/>
      If you didn't request a password reset, please ignore this email — your account is safe.
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'LASUConnect <noreply@lasuconnect.com>',
      to,
      subject: '🔑 Reset your LASUConnect password',
      html: baseTemplate(content),
    });
    logger.info(`📧 Password reset email sent to ${to}`);
  } catch (err) {
    logger.error(`❌ Failed to send password reset email: ${err.message}`);
    throw err;
  }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
