import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { clearOtp, consumeResetToken, issueOtp, issueResetToken, verifyOtp } from '../utils/otp.js';

export function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role, v: user.tokenVersion ?? 0 }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

// POST /api/auth/register
// Creates an unverified account and emails a verification code. No login
// token is issued until the code is confirmed at /verify-email.
export async function register(req, res) {
  const { name, email, password, phone } = req.body;

  let user = await User.findOne({ email }).select('+tokenVersion');
  if (user?.isVerified) {
    throw new ApiError(409, 'An account with that email already exists.');
  }

  if (user) {
    // Unverified sign-up for this email already exists (e.g. user never
    // entered the code): replace its details so the real owner can finish.
    user.set({ name, password, phone });
  } else {
    // Role is never taken from the request: everyone who signs up is a client.
    user = new User({ name, email, password, phone, role: 'client', isVerified: false });
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
  const user = await User.findOne({ email }).select('+tokenVersion');
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

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'No sign-up found for that email. Please create an account.');
  if (user.isVerified) throw new ApiError(400, 'This email is already verified. Please log in.', undefined, { code: 'ALREADY_VERIFIED' });

  const otp = await issueOtp({ email, purpose: 'verify-email', name: user.name });
  res.json({ message: `We sent a new code to ${email}.`, ...otp });
}

// POST /api/auth/login
export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password +tokenVersion');

  // Same message for unknown email and wrong password so attackers can't
  // discover which emails are registered.
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Only revealed after the correct password, so it leaks nothing to guessers.
  if (!user.isVerified) {
    throw new ApiError(403, 'Please verify your email before logging in.', undefined, {
      code: 'EMAIL_NOT_VERIFIED',
      email: user.email,
    });
  }

  res.json({ token: signToken(user), user });
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

  const valid = await consumeResetToken({ email, token: resetToken });
  const user = valid && (await User.findOne({ email }).select('+tokenVersion'));
  if (!user) {
    throw new ApiError(400, 'Your reset session has expired. Please request a new code.', undefined, {
      code: 'RESET_EXPIRED',
    });
  }

  user.password = password;
  // Receiving the code proves they own the inbox.
  user.isVerified = true;
  await user.save();

  res.json({ message: 'Your password has been reset. You can now log in.' });
}

// GET /api/auth/me
export function me(req, res) {
  res.json({ user: req.user });
}
