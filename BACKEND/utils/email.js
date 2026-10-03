import { config } from '../config/env.js';
import ApiError from './ApiError.js';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Sends an email through Brevo's HTTP API (not SMTP, which some hosts block).
// In development without an API key, the email is printed to the console instead.
export async function sendEmail({ to, toName, subject, html, text }) {
  const { apiKey, senderEmail, senderName } = config.brevo;

  if (!apiKey) {
    if (config.nodeEnv === 'production') throw new ApiError(500, 'Email service is not configured.');
    console.log(`\n[email:dev] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }

  const response = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to, ...(toName && { name: toName }) }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
    signal: AbortSignal.timeout(15000),
  }).catch((err) => {
    console.error('Brevo request failed:', err.message);
    throw new ApiError(502, 'We could not send the email right now. Please try again shortly.');
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.error(`Brevo error ${response.status}:`, body.code, body.message);
    throw new ApiError(502, 'We could not send the email right now. Please try again shortly.');
  }
}

const COPY = {
  'verify-email': {
    subject: (app) => `Your ${app} verification code`,
    heading: 'Verify your email',
    intro: 'Use this code to finish creating your account:',
  },
  'reset-password': {
    subject: (app) => `Your ${app} password reset code`,
    heading: 'Reset your password',
    intro: 'Use this code to reset your password:',
  },
};

export function sendOtpEmail({ to, name, code, purpose, expiresInMinutes }) {
  const app = config.appName;
  const copy = COPY[purpose];
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,';

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
    <h2 style="margin:0 0 4px;color:#4f46e5">${escapeHtml(app)}</h2>
    <h3 style="margin:0 0 16px;font-weight:600">${copy.heading}</h3>
    <p style="margin:0 0 8px">${greeting}</p>
    <p style="margin:0 0 16px">${copy.intro}</p>
    <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#eef2ff;color:#312e81;
                padding:16px;text-align:center;border-radius:10px">${code}</div>
    <p style="margin:16px 0 0;font-size:14px;color:#475569">
      This code expires in ${expiresInMinutes} minutes. Never share it with anyone.
      If you didn't request it, you can safely ignore this email.
    </p>
  </div>`;

  const text = `${copy.heading}\n\n${copy.intro} ${code}\n\nThis code expires in ${expiresInMinutes} minutes. If you didn't request it, ignore this email.`;

  return sendEmail({ to, toName: name, subject: copy.subject(app), html, text });
}
