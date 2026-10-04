import Staff from '../models/Staff.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { assertAdminPasswordStrength, assertNewPassword, recordLogin, verifyCredentials } from '../utils/credentials.js';
import { clearOtp, findResetToken, issueOtp, issueResetToken, verifyOtp } from '../utils/otp.js';
import { SCOPES, scopeForRole, signToken } from '../utils/tokens.js';

// POST /api/auth/register
// Creates an unverified account and emails a verification code. No login
// token is issued until the code is confirmed at /verify-email.
export async function register(req, res) {
  const { firstName, lastName, email, password } = req.body;
  const phone = req.body.phone || '';
  const phoneCountry = phone ? req.body.phoneCountry : '';

  let user = await User.findOne({ email }).select('+tokenVersion');
  // Verified accounts, and any staff/admin account, can never be taken over by signing up again.
  if (user?.isVerified || (user && user.role !== 'client')) {
    throw new ApiError(409, 'An account with that email already exists.');
  }

  if (user) {
    // Unverified sign-up for this email already exists (e.g. user never
    // entered the code): replace its details so the real owner can finish.
    user.set({ firstName, lastName, password, phone, phoneCountry });
  } else {
    // Role is never taken from the request: everyone who signs up is a client.
    user = new User({ firstName, lastName, email, password, phone, phoneCountry, role: 'client', isVerified: false });
  }
  await user.save();

  const otp = await issueOtp({ email, purpose: 'verify-email', name: user.name });
  res.status(201).json({
    message: `We sent a 6-digit code to ${email}.`,
    email,
    requiresVerification: true,
    ...otp,
  });
}

// POST /api/auth/verify-email
export async function verifyEmail(req, res) {
  const { email, otp } = req.body;
  // Client sign-ups only; staff accounts are activated through their invite.
  const user = await User.findOne({ email, role: 'client' }).select('+tokenVersion');
  if (!user) throw new ApiError(400, 'This code has expired or is invalid. Please request a new one.');
  if (user.isVerified) throw new ApiError(400, 'This email is already verified. Please log in.', undefined, { code: 'ALREADY_VERIFIED' });

  await verifyOtp({ email, purpose: 'verify-email', code: otp });
  user.isVerified = true;
  await user.save();
  await clearOtp(email, 'verify-email');

  res.json({ token: signToken(user), user });
}

// POST /api/auth/resend-otp   { email, purpose: 'verify-email' | 'reset-password' }
export async function resendOtp(req, res) {
  const { email, purpose } = req.body;

  if (purpose === 'reset-password') return sendResetCode(email, res);

  const user = await User.findOne({ email, role: 'client' });
  if (!user) throw new ApiError(404, 'No sign-up found for that email. Please create an account.');
  if (user.isVerified) throw new ApiError(400, 'This email is already verified. Please log in.', undefined, { code: 'ALREADY_VERIFIED' });

  const otp = await issueOtp({ email, purpose: 'verify-email', name: user.name });
  res.json({ message: `We sent a new code to ${email}.`, ...otp });
}

// POST /api/auth/login
export async function login(req, res) {
  const { email, password } = req.body;
  // Same message for unknown email and wrong password, constant-time for both,
  // and the account locks after repeated failures (see utils/credentials.js).
  const user = await verifyCredentials(email, password);

  // Only revealed after the correct password, so it leaks nothing to guessers.
  if (!user.isVerified) {
    throw new ApiError(403, 'Please verify your email before logging in.', undefined, {
      code: 'EMAIL_NOT_VERIFIED',
      email: user.email,
    });
  }

  // Staff need an active staff profile to use the portal (see requireStaff).
  if (user.role === 'staff' && !(await Staff.exists({ user: user._id, isActive: true }))) {
    throw new ApiError(403, 'Your staff profile is inactive or was removed. Please contact an administrator.');
  }

  await recordLogin(user);
  // Clients get a client session; staff get a staff-portal session.
  res.json({ token: signToken(user, scopeForRole(user.role)), user });
}

// ---------- Staff account activation ----------
// An admin's invite creates an inactive staff login and emails a code.
// The staff member proves they own the inbox and chooses their password here.

const invalidInvite = () =>
  new ApiError(400, 'This code is invalid or has expired. Ask an administrator to send a new invite.', undefined, { code: 'INVITE_INVALID' });

async function pendingStaffUser(email) {
  const user = await User.findOne({ email, role: 'staff' }).select('+tokenVersion');
  if (!user) return null;
  // The login must still be linked to a staff record (the admin may have revoked it).
  return (await Staff.exists({ user: user._id })) ? user : null;
}

// POST /api/auth/staff/activate   { email, otp, password }
export async function activateStaff(req, res) {
  const { email, otp, password } = req.body;
  const user = await pendingStaffUser(email);
  if (!user) throw invalidInvite();
  if (user.isVerified) {
    throw new ApiError(400, 'This account is already set up. Please log in.', undefined, { code: 'ALREADY_ACTIVE' });
  }

  await verifyOtp({ email, purpose: 'staff-invite', code: otp });
  user.password = password;
  user.isVerified = true;
  await user.save();
  await clearOtp(email, 'staff-invite');
  await recordLogin(user);

  res.json({ token: signToken(user, SCOPES.STAFF), user });
}

// POST /api/auth/staff/resend   { email }
// Same response whether or not there is a pending invite for this email.
export async function resendStaffInvite(req, res) {
  const { email } = req.body;
  const user = await pendingStaffUser(email);
  const deliver = Boolean(user && !user.isVerified);
  const otp = await issueOtp({ email, purpose: 'staff-invite', name: user?.name, deliver });
  res.json({ message: `If there is a pending invite for ${email}, we sent a new code to it.`, ...otp });
}

// Shared by /forgot-password and /resend-otp (reset). The response is the same
// whether or not the account exists, so this can't be used to find accounts.
async function sendResetCode(email, res) {
  const user = await User.findOne({ email });
  const otp = await issueOtp({ email, purpose: 'reset-password', name: user?.name, deliver: Boolean(user) });
  res.json({ message: `If an account exists for ${email}, we sent a 6-digit code to it.`, ...otp });
}

// POST /api/auth/forgot-password
export function forgotPassword(req, res) {
  return sendResetCode(req.body.email, res);
}

// POST /api/auth/verify-reset-otp  -> { resetToken } used by /reset-password
export async function verifyResetOtp(req, res) {
  const { email, otp } = req.body;
  const record = await verifyOtp({ email, purpose: 'reset-password', code: otp });
  const resetToken = await issueResetToken(record);
  res.json({ message: 'Code verified. You can now set a new password.', resetToken });
}

// POST /api/auth/reset-password
export async function resetPassword(req, res) {
  const { email, resetToken, password } = req.body;

  const resetRecord = await findResetToken({ email, token: resetToken });
  const user = resetRecord && (await User.findOne({ email: resetRecord.email }).select('+password +tokenVersion'));
  if (!user) {
    throw new ApiError(400, 'Your reset session has expired. Please request a new code.', undefined, {
      code: 'RESET_EXPIRED',
    });
  }

  // Checked before the token is used up, so the user can simply try another
  // password. Only reachable with a valid token, i.e. by the inbox owner.
  assertAdminPasswordStrength(user, password);
  await assertNewPassword(user, password);
  user.password = password;
  // Receiving the code proves they own the inbox.
  user.isVerified = true;
  await user.save();
  await resetRecord.deleteOne();

  res.json({ message: 'Your password has been reset. You can now log in.' });
}

// GET /api/auth/me
export function me(req, res) {
  res.json({ user: req.user });
}
