import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const urlList = (value) =>
  value
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean);

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  // Staff portal sessions last one working day.
  staffJwtExpiresIn: process.env.STAFF_JWT_EXPIRES_IN || '12h',
  // Admin-panel sessions are deliberately short.
  adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '2h',
  // Email OTP as a second factor for admin logins. Only disable for local testing.
  admin2fa: process.env.ADMIN_2FA !== 'false',
  // Comma-separated lists of frontend origins allowed by CORS.
  clientUrls: urlList(process.env.CLIENT_URL || 'http://localhost:5173'),
  adminUrls: urlList(process.env.ADMIN_URL || 'http://localhost:5174'),
  // Business timezone used to decide what "today" and "past" mean for bookings.
  timezone: process.env.APP_TIMEZONE || 'Asia/Manila',
  // Transactional email (OTP codes) via Brevo's HTTP API.
  brevo: {
    apiKey: process.env.BREVO_API_KEY || '',
    senderEmail: process.env.BREVO_SENDER_EMAIL || '',
    senderName: process.env.BREVO_SENDER_NAME || 'CliniQuick',
  },
  appName: process.env.APP_NAME || 'CliniQuick',
};
