import { config } from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { audit } from '../utils/audit.js';
import { recordLogin, verifyCredentials } from '../utils/credentials.js';
import { clearOtp, issueOtp, verifyOtp } from '../utils/otp.js';
import { SCOPES, signToken, verifyToken } from '../utils/tokens.js';

// Admin sign-in is two steps:
//   1. POST /login   email + password  -> emails a code, returns a short-lived challengeToken
//   2. POST /verify  challengeToken + code -> admin session token (2 hours)
// The challengeToken proves step 1 passed; on its own it grants nothing.

const PURPOSE = 'admin-login';

async function issueSession(req, res, user) {
  await recordLogin(user);
  await audit(req, 'auth.admin_login', { actor: user, targetType: 'auth', targetId: user._id, summary: 'Admin signed in' });
  res.json({ token: signToken(user, SCOPES.ADMIN), user, expiresIn: config.adminJwtExpiresIn });
}

// Loads the admin behind a challenge token, or throws.
async function adminFromChallenge(challengeToken) {
  const payload = verifyToken(challengeToken);
  const expired = () =>
    new ApiError(401, 'Your sign-in session expired. Please enter your password again.', undefined, { code: 'CHALLENGE_EXPIRED' });
  if (payload?.scope !== SCOPES.ADMIN_2FA) throw expired();

  const user = await User.findById(payload.id).select('+tokenVersion');
  if (!user || user.role !== 'admin' || (payload.v ?? 0) !== user.tokenVersion) throw expired();
  return user;
}

// POST /api/admin/auth/login
export async function adminLogin(req, res) {
  const { email, password } = req.body;

  let user;
  try {
    user = await verifyCredentials(email, password);
  } catch (err) {
    await audit(req, 'auth.admin_login_failed', { targetType: 'auth', summary: `Failed admin sign-in for ${email}`, success: false });
    throw err;
  }

  // A valid client account must not learn anything more than a wrong password would.
  if (user.role !== 'admin' || !user.isVerified) {
    await audit(req, 'auth.admin_login_failed', {
      targetType: 'auth',
      targetId: user._id,
      summary: `Non-admin account ${email} tried to sign in to the admin panel`,
      success: false,
    });
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (!config.admin2fa) return issueSession(req, res, user);

  // Password OK: send the second-factor code. If a code was sent moments ago,
  // the cooldown error tells the UI to reuse it.
  let otp;
  try {
    otp = await issueOtp({ email: user.email, purpose: PURPOSE, name: user.name, userId: user._id });
  } catch (err) {
    if (err.meta?.code !== 'OTP_COOLDOWN') throw err;
    otp = { resendAvailableIn: err.meta.retryAfter, reused: true };
  }

  res.json({
    requiresOtp: true,
    challengeToken: signToken(user, SCOPES.ADMIN_2FA),
    // Partially hidden so the screen confirms where the code went without showing the full address.
    emailHint: user.email.replace(/^(.)(.*)(@.*)$/, (_m, first, middle, domain) => `${first}${'•'.repeat(Math.min(middle.length, 6))}${domain}`),
    ...otp,
  });
}

// POST /api/admin/auth/verify
export async function adminVerify(req, res) {
  const { challengeToken, otp } = req.body;
  const user = await adminFromChallenge(challengeToken);

  try {
    await verifyOtp({ email: user.email, purpose: PURPOSE, code: otp, userId: user._id });
  } catch (err) {
    await audit(req, 'auth.admin_2fa_failed', { actor: user, targetType: 'auth', targetId: user._id, summary: 'Wrong admin sign-in code', success: false });
    throw err;
  }
  await clearOtp(user.email, PURPOSE);
  return issueSession(req, res, user);
}

// POST /api/admin/auth/resend
export async function adminResend(req, res) {
  const user = await adminFromChallenge(req.body.challengeToken);
  const otp = await issueOtp({ email: user.email, purpose: PURPOSE, name: user.name, userId: user._id });
  res.json({ message: 'We sent a new code.', ...otp });
}

// GET /api/admin/auth/me
export function adminMe(req, res) {
  res.json({ user: req.user });
}

// POST /api/admin/auth/logout - recorded for the audit trail (the token is discarded client-side).
export async function adminLogout(req, res) {
  await audit(req, 'auth.admin_logout', { targetType: 'auth', targetId: req.user._id, summary: 'Admin signed out' });
  res.json({ message: 'Signed out.' });
}
