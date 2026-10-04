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
  'change-email': {
    subject: (app) => `Confirm your new ${app} email`,
    heading: 'Confirm your new email',
    intro: 'Use this code to confirm this address as your new account email:',
  },
  'admin-login': {
    subject: (app) => `Your ${app} admin sign-in code`,
    heading: 'Admin sign-in',
    intro: 'Someone (hopefully you) entered your password on the admin panel. Use this code to finish signing in:',
  },
  'staff-invite': {
    subject: (app) => `You're invited to the ${app} staff portal`,
    heading: 'Set up your staff account',
    intro: 'You have been given access to the staff portal, where you can see your schedule and manage your time off. Use this code to set your password:',
    // Where to enter the code (the first configured client-app URL).
    link: () => `${config.clientUrls[0]}/staff/activate`,
  },
};

const expiryText = (minutes) => (minutes >= 120 && minutes % 60 === 0 ? `${minutes / 60} hours` : `${minutes} minutes`);

export function sendOtpEmail({ to, name, code, purpose, expiresInMinutes }) {
  const app = config.appName;
  const copy = COPY[purpose];
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,';
  const link = copy.link?.();
  const expires = expiryText(expiresInMinutes);

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
    <h2 style="margin:0 0 4px;color:#4f46e5">${escapeHtml(app)}</h2>
    <h3 style="margin:0 0 16px;font-weight:600">${copy.heading}</h3>
    <p style="margin:0 0 8px">${greeting}</p>
    <p style="margin:0 0 16px">${copy.intro}</p>
    <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#eef2ff;color:#312e81;
                padding:16px;text-align:center;border-radius:10px">${code}</div>
    ${link ? `<p style="margin:16px 0 0">Enter it at <a href="${escapeHtml(link)}" style="color:#4f46e5">${escapeHtml(link)}</a></p>` : ''}
    <p style="margin:16px 0 0;font-size:14px;color:#475569">
      This code expires in ${expires}. Never share it with anyone.
      If you didn't request it, you can safely ignore this email.
    </p>
  </div>`;

  const text = `${copy.heading}\n\n${copy.intro} ${code}\n${link ? `\nEnter it at ${link}\n` : ''}\nThis code expires in ${expires}. If you didn't request it, ignore this email.`;

  return sendEmail({ to, toName: name, subject: copy.subject(app), html, text });
}
