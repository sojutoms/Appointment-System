import crypto from 'node:crypto';
import { config } from '../config/env.js';
import Otp from '../models/Otp.js';
import ApiError from './ApiError.js';
import { sendOtpEmail } from './email.js';

export const OTP_RULES = {
  length: 6,
  expiresInMinutes: 10,
  resendCooldownSeconds: 60,
  maxSendsPerHour: 5,
  maxAttempts: 5,
  resetTokenMinutes: 10,
};

// Staff invites can't be expected to be opened within 10 minutes.
const EXPIRY_MINUTES = { 'staff-invite': 24 * 60 };
const expiryMinutes = (purpose) => EXPIRY_MINUTES[purpose] ?? OTP_RULES.expiresInMinutes;

const HOUR = 60 * 60 * 1000;
const seconds = (ms) => Math.max(1, Math.ceil(ms / 1000));

// Codes and reset tokens are stored as HMACs, never in plain text.
const hash = (value) => crypto.createHmac('sha256', config.jwtSecret).update(value).digest('hex');

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

const generateCode = () => crypto.randomInt(0, 10 ** OTP_RULES.length).toString().padStart(OTP_RULES.length, '0');

/**
 * Creates (or replaces) the OTP for an email and sends it.
 * Enforces the resend cooldown and the hourly send limit. When `deliver` is
 * false the limits are still applied but no email is sent; this keeps
 * "forgot password" responses identical whether or not the account exists.
 * Returns { resendAvailableIn, expiresIn } in seconds.
 */
export async function issueOtp({ email, purpose, name, userId = null, deliver = true }) {
  const now = new Date();
  let otp = await Otp.findOne({ email, purpose });
  if (!otp) otp = new Otp({ email, purpose });
  otp.user = userId;

  if (!otp.windowStartedAt || now - otp.windowStartedAt >= HOUR) {
    otp.windowStartedAt = now;
    otp.sendCount = 0;
  }

  const cooldownMs = OTP_RULES.resendCooldownSeconds * 1000;
  if (otp.lastSentAt && now - otp.lastSentAt < cooldownMs) {
    const retryAfter = seconds(cooldownMs - (now - otp.lastSentAt));
    throw new ApiError(429, `Please wait ${retryAfter}s before requesting a new code.`, undefined, {
      code: 'OTP_COOLDOWN',
      retryAfter,
    });
  }

  if (otp.sendCount >= OTP_RULES.maxSendsPerHour) {
    const retryAfter = seconds(otp.windowStartedAt.getTime() + HOUR - now);
    const minutes = Math.ceil(retryAfter / 60);
    throw new ApiError(
      429,
      `Too many codes requested. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      undefined,
      { code: 'OTP_LIMIT', retryAfter }
    );
  }

  const code = generateCode();
  const previous = { lastSentAt: otp.lastSentAt, sendCount: otp.sendCount };

  // The code is stored even when not delivered, so wrong guesses behave the
  // same way for unknown emails (no hint about which emails have accounts).
  const minutes = expiryMinutes(purpose);
  otp.set({
    codeHash: hash(code),
    codeExpiresAt: new Date(now.getTime() + minutes * 60 * 1000),
    attempts: 0,
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    sendCount: otp.sendCount + 1,
    lastSentAt: now,
    // Keep the record (and its limits) until well after the code expires.
    purgeAt: new Date(Math.max(otp.windowStartedAt.getTime() + HOUR, now.getTime() + (minutes + 30) * 60 * 1000)),
  });
  await otp.save();

  if (deliver) {
    try {
      await sendOtpEmail({ to: email, name, code, purpose, expiresInMinutes: minutes });
    } catch (err) {
      // The email never went out, so don't count it against the user's limits.
      otp.set({ ...previous, codeHash: null });
      await otp.save();
      throw err;
    }
  }

  return { resendAvailableIn: OTP_RULES.resendCooldownSeconds, expiresIn: minutes * 60 };
}

/**
 * Checks a code. Wrong codes count toward the attempt limit; a correct code
 * is consumed so it can't be reused. Returns the Otp document on success.
 */
export async function verifyOtp({ email, purpose, code, userId }) {
  const otp = await Otp.findOne({ email, purpose });
  const now = new Date();
  // For account-bound codes (email change), the code only works for the user who requested it.
  const wrongUser = userId && !otp?.user?.equals(userId);

  const expired = () =>
    new ApiError(400, 'This code has expired or is invalid. Please request a new one.', undefined, { code: 'OTP_EXPIRED' });
  const tooMany = () =>
    new ApiError(429, 'Too many incorrect attempts. Please request a new code.', undefined, { code: 'OTP_TOO_MANY_ATTEMPTS' });

  if (!otp?.codeHash || !otp.codeExpiresAt || otp.codeExpiresAt < now || wrongUser) throw expired();
  if (otp.attempts >= OTP_RULES.maxAttempts) throw tooMany();

  // Both branches update atomically (conditional on the same code still being
  // active), so parallel guesses can't each see "0 attempts used", and a
  // correct code can only be consumed once.
  if (!safeEqual(hash(String(code)), otp.codeHash)) {
    const updated = await Otp.findOneAndUpdate(
      { _id: otp._id, codeHash: otp.codeHash },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' }
    );
    if (!updated) throw expired();
    const remaining = OTP_RULES.maxAttempts - updated.attempts;
    if (remaining <= 0) {
      await Otp.updateOne({ _id: otp._id }, { codeHash: null });
      throw tooMany();
    }
    throw new ApiError(400, `Incorrect code. You have ${remaining} attempt${remaining === 1 ? '' : 's'} left.`, undefined, {
      code: 'OTP_INVALID',
      attemptsLeft: remaining,
    });
  }

  const consumed = await Otp.findOneAndUpdate(
    { _id: otp._id, codeHash: otp.codeHash, attempts: { $lt: OTP_RULES.maxAttempts } },
    { codeHash: null, attempts: 0 },
    { returnDocument: 'after' }
  );
  if (!consumed) throw expired();
  return consumed;
}

// After a correct reset code: issue a one-time token for the "new password" step.
export async function issueResetToken(otp) {
  const token = crypto.randomBytes(32).toString('hex');
  otp.resetTokenHash = hash(token);
  otp.resetTokenExpiresAt = new Date(Date.now() + OTP_RULES.resetTokenMinutes * 60 * 1000);
  await otp.save();
  return token;
}

// Returns the reset record if the token is valid, without using it up, so the
// new password can be checked first. Delete the record once the reset succeeds.
export async function findResetToken({ email, token }) {
  const otp = await Otp.findOne({ email, purpose: 'reset-password' });
  if (!otp?.resetTokenHash || otp.resetTokenExpiresAt < new Date() || !safeEqual(hash(token), otp.resetTokenHash)) {
    return null;
  }
  return otp;
}

export const clearOtp = (email, purpose) => Otp.deleteOne({ email, purpose });
