import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import ApiError from './ApiError.js';

// Wrong-password limits. Logins are first limited per IP + account (5 per 15
// minutes, see routes), so one attacker can't lock someone else out. The
// account-wide lock only triggers on many failures from several places (a
// distributed attack). Re-confirming the password while signed in has its own
// low limit, because there the attacker already holds a session.
export const LOCKOUT = { maxAttempts: 20, confirmAttempts: 5, minutes: 15 };

// A real bcrypt hash (of a random string) used when the email doesn't exist,
// so a login for an unknown email takes as long as one for a real account.
const DUMMY_HASH = bcrypt.hashSync(`no-such-user-${Math.random()}`, 12);

const invalid = () => new ApiError(401, 'Invalid email or password.');

/**
 * Checks email + password with account lockout:
 * after LOCKOUT.maxAttempts wrong passwords the account is locked for 15 minutes.
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

/**
 * Re-checks the password of someone who is already signed in (step-up dialogs,
 * changing password or email). On the 5th wrong password in a row the account
 * is locked AND every session is ended, so a stolen session can't keep guessing. Returns the user (with +password
 * +tokenVersion) when correct, or null when wrong so the caller can respond.
 */
export async function confirmCurrentPassword(userId, password) {
  const user = await User.findById(userId).select('+password +tokenVersion +failedConfirmAttempts');
  if (typeof password === 'string' && password && (await user.matchPassword(password))) {
    if (user.failedConfirmAttempts) await User.updateOne({ _id: user._id }, { failedConfirmAttempts: 0 });
    return user;
  }

  const updated = await User.findByIdAndUpdate(user._id, { $inc: { failedConfirmAttempts: 1 } }, { returnDocument: 'after' }).select(
    '+failedConfirmAttempts'
  );
  if (updated.failedConfirmAttempts >= LOCKOUT.confirmAttempts) {
    await User.updateOne(
      { _id: user._id },
      { failedConfirmAttempts: 0, lockUntil: new Date(Date.now() + LOCKOUT.minutes * 60000), $inc: { tokenVersion: 1 } }
    );
    throw new ApiError(401, `Too many incorrect passwords. For your security you have been signed out and the account is locked for ${LOCKOUT.minutes} minutes.`, undefined, {
      code: 'ACCOUNT_LOCKED',
    });
  }
  return null;
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

// A new password must differ from the current one. `user` must be loaded with
// .select('+password'). `field` is the form field the error is shown under.
export async function assertNewPassword(user, password, field = 'password') {
  if (await user.matchPassword(password)) {
    const message = 'New password must be different from your current password.';
    throw new ApiError(400, message, [{ field, message }]);
  }
}

export const recordLogin =(user) => User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });
