import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import ApiError from './ApiError.js';

export const LOCKOUT = { maxAttempts: 5, minutes: 15 };

// A real bcrypt hash (of a random string) used when the email doesn't exist,
// so a login for an unknown email takes as long as one for a real account.
const DUMMY_HASH = bcrypt.hashSync(`no-such-user-${Math.random()}`, 12);

const invalid = () => new ApiError(401, 'Invalid email or password.');

/**
 * Checks email + password with account lockout:
 * after 5 wrong passwords the account is locked for 15 minutes.
 * Returns the user (with tokenVersion loaded) or throws.
 */
export async function verifyCredentials(email, password) {
  const user = await User.findOne({ email }).select('+password +tokenVersion +failedLoginAttempts +lockUntil');

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw invalid();
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    const minutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new ApiError(
      429,
      `Too many failed attempts. This account is locked for ${minutes} more minute${minutes === 1 ? '' : 's'}.`,
      undefined,
      { code: 'ACCOUNT_LOCKED', retryAfter: minutes * 60 }
    );
  }

  if (!(await user.matchPassword(password))) {
    // Atomic increment so parallel guesses can't skip the counter.
    const updated = await User.findByIdAndUpdate(
      user._id,
      { $inc: { failedLoginAttempts: 1 } },
      { returnDocument: 'after' }
    ).select('+failedLoginAttempts');
    if (updated.failedLoginAttempts >= LOCKOUT.maxAttempts) {
      await User.updateOne(
        { _id: user._id },
        { failedLoginAttempts: 0, lockUntil: new Date(Date.now() + LOCKOUT.minutes * 60000) }
      );
    }
    throw invalid();
  }

  if (user.failedLoginAttempts || user.lockUntil) {
    await User.updateOne({ _id: user._id }, { failedLoginAttempts: 0, lockUntil: null });
  }
  return user;
}

// Admin accounts need stronger passwords than clients (applied whenever an
// admin sets a new password, whichever app they use).
export function assertAdminPasswordStrength(user, password) {
  if (user.role !== 'admin') return;
  const ok = password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
  if (!ok) {
    throw new ApiError(400, 'Admin passwords need at least 12 characters, with upper- and lowercase letters, a number and a symbol.', [
      { field: 'newPassword', message: 'Admin passwords need 12+ characters with upper/lowercase, a number and a symbol.' },
    ]);
  }
}

export const recordLogin =(user) => User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });
