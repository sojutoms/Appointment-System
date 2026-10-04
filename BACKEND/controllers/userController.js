import User, { ROLES } from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Staff from '../models/Staff.js';
import Otp from '../models/Otp.js';
import ApiError from '../utils/ApiError.js';
import { audit } from '../utils/audit.js';
import { assertAdminPasswordStrength, assertNewPassword, confirmCurrentPassword } from '../utils/credentials.js';
import { SCOPES, signToken } from '../utils/tokens.js';
import { clearOtp, issueOtp, verifyOtp } from '../utils/otp.js';
import { sendEmailChangedNotice } from '../utils/email.js';
import { getPagination, paginated, searchRegex } from '../utils/query.js';

// GET /api/users/me
export function getProfile(req, res) {
  res.json({ user: req.user });
}

// PUT /api/users/me
// Email is changed separately (below), because the new address must be verified.
// Admins can sign in to the client app with just a password (no emailed code),
// so account-security changes for admins are only allowed from an admin-panel
// session, which did pass 2FA. Otherwise a stolen admin password alone could
// take over the account by changing its email or password.
function assertAdminPanelForAdmins(req, message) {
  if (req.user.role === 'admin' && req.scope !== SCOPES.ADMIN) throw new ApiError(403, message);
}

function assertCanChangeEmail(req) {
  if (req.user.role === 'staff') throw new ApiError(403, 'Your work email is managed by an administrator.');
  assertAdminPanelForAdmins(req, "For security, an administrator's email can't be changed from the client app.");
}

const wrongCurrentPassword = () =>
  new ApiError(400, 'Current password is incorrect.', [{ field: 'currentPassword', message: 'Current password is incorrect.' }]);

export async function updateProfile(req, res) {
  const { firstName, lastName, phone, phoneCountry, currentPassword, newPassword } = req.body;
  let user;
  if (newPassword) {
    assertAdminPanelForAdmins(req, 'For security, administrators change their password in the admin panel.');
    user = await confirmCurrentPassword(req.user._id, currentPassword);
    if (!user) throw wrongCurrentPassword();
  } else {
    user = await User.findById(req.user._id).select('+password +tokenVersion');
  }

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (phone !== undefined) {
    user.phone = phone || '';
    user.phoneCountry = phone ? phoneCountry : '';
  }

  if (newPassword) {
    assertAdminPasswordStrength(user, newPassword);
    await assertNewPassword(user, newPassword, 'newPassword');
    user.password = newPassword;
  }

  await user.save();
  if (newPassword && req.scope === SCOPES.ADMIN) {
    await audit(req, 'account.password_change', { targetType: 'user', targetId: user._id, summary: 'Admin changed own password' });
  }
  // A password change invalidates older tokens (other devices get logged out),
  // so give this session a fresh one of the same kind (client or admin).
  res.json({ user, ...(newPassword && { token: signToken(user, req.scope) }) });
}

// POST /api/users/me/email   { newEmail, currentPassword }
// Step 1 of changing email: confirm the password, then email a code to the NEW address.
export async function requestEmailChange(req, res) {
  const { newEmail, currentPassword } = req.body;
  assertCanChangeEmail(req);
  const user = await confirmCurrentPassword(req.user._id, currentPassword);
  if (!user) throw wrongCurrentPassword();
  if (newEmail === user.email) throw new ApiError(400, 'That is already your email address.');
  if (await User.exists({ email: newEmail })) {
    throw new ApiError(409, 'That email is already used by another account.');
  }

  const otp = await issueOtp({ email: newEmail, purpose: 'change-email', name: user.name, userId: user._id });
  res.json({ message: `We sent a 6-digit code to ${newEmail}.`, ...otp });
}

// POST /api/users/me/email/verify   { newEmail, otp }
// Step 2: the code proves the user owns the new address.
export async function confirmEmailChange(req, res) {
  const { newEmail, otp } = req.body;
  assertCanChangeEmail(req);
  await verifyOtp({ email: newEmail, purpose: 'change-email', code: otp, userId: req.user._id });

  // Re-check: someone may have registered this address in the meantime.
  if (await User.exists({ email: newEmail })) {
    throw new ApiError(409, 'That email is already used by another account.');
  }

  const user = await User.findByIdAndUpdate(req.user._id, { email: newEmail }, { returnDocument: 'after', runValidators: true });
  await clearOtp(newEmail, 'change-email');
  // Tell the old address. Best effort: the change itself has already succeeded.
  const oldEmail = req.user.email;
  await sendEmailChangedNotice({ to: oldEmail, name: user.name, newEmail }).catch((err) =>
    console.error(`Could not send the email-change notice to ${oldEmail}:`, err.message)
  );
  res.json({ user, message: 'Your email address has been updated.' });
}

// POST /api/users/me/email/resend   { newEmail }
// Only re-sends for a change this user already started (with their password)
// in step 1; it can't be used to start a change without the password.
export async function resendEmailChange(req, res) {
  const { newEmail } = req.body;
  assertCanChangeEmail(req);
  if (!(await Otp.exists({ email: newEmail, purpose: 'change-email', user: req.user._id }))) {
    throw new ApiError(400, 'Your email change request has expired. Please start again.', undefined, { code: 'OTP_EXPIRED' });
  }
  const otp = await issueOtp({ email: newEmail, purpose: 'change-email', name: req.user.name, userId: req.user._id });
  res.json({ message: `We sent a new code to ${newEmail}.`, ...otp });
}

// ---------- Admin ----------

// Adds fields the admin UI needs but the stored document doesn't have directly.
async function withAdminFields(users) {
  const ids = users.map((u) => u._id);
  const counts = await Appointment.aggregate([{ $match: { user: { $in: ids } } }, { $group: { _id: '$user', count: { $sum: 1 } } }]);
  const countById = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  return users.map((u) => ({
    ...u.toJSON(),
    locked: Boolean(u.lockUntil && u.lockUntil > new Date()),
    appointmentCount: countById[String(u._id)] ?? 0,
  }));
}

// GET /api/users?search=&role=&verified=true|false  (admin)
export async function listUsers(req, res) {
  const pageInfo = getPagination(req.query);
  const filter = {};

  const regex = searchRegex(req.query.search);
  if (regex) filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  if (ROLES.includes(req.query.role)) filter.role = req.query.role;
  if (req.query.verified === 'true') filter.isVerified = { $ne: false };
  if (req.query.verified === 'false') filter.isVerified = false;

  const [users, total] = await Promise.all([
    User.find(filter).select('+lockUntil').sort({ createdAt: -1 }).skip(pageInfo.skip).limit(pageInfo.limit),
    User.countDocuments(filter),
  ]);
  res.json(paginated(await withAdminFields(users), total, pageInfo));
}

async function findOtherUser(req) {
  if (req.params.id === String(req.user._id)) {
    throw new ApiError(400, 'You cannot do this to your own account.');
  }
  const user = await User.findById(req.params.id).select('+tokenVersion +lockUntil');
  if (!user) throw new ApiError(404, 'User not found.');
  return user;
}

// There must always be at least one admin, or nobody could manage the system.
const lastAdmin = () => new ApiError(400, 'This is the only admin account. Make someone else an admin first.');

async function assertNotLastAdmin(user) {
  if (user.role === 'admin' && (await User.countDocuments({ role: 'admin' })) <= 1) throw lastAdmin();
}

// Takes admin rights away without ever leaving zero admins, even when two
// admins demote or delete each other at the same moment: change first, then
// count, and undo if no admin is left. Also ends the user's sessions.
async function demoteAdmin(user, role) {
  await assertNotLastAdmin(user);
  await User.updateOne({ _id: user._id, role: 'admin' }, { role, $inc: { tokenVersion: 1 } });
  if ((await User.countDocuments({ role: 'admin' })) === 0) {
    await User.updateOne({ _id: user._id }, { role: 'admin' });
    throw lastAdmin();
  }
}

// PATCH /api/users/:id/role   { role, confirmPassword }  (admin, step-up)
export async function updateUserRole(req, res) {
  const user = await findOtherUser(req);
  const { role } = req.body;
  if (user.role === 'staff') {
    throw new ApiError(400, "This is a staff-portal account. Manage it from the Staff page (invite or revoke access).");
  }
  if (user.role === role) return res.json({ user: (await withAdminFields([user]))[0] });
  const previous = user.role;
  if (previous === 'admin') {
    await demoteAdmin(user, role);
  } else {
    // End all of this user's sessions so the new role applies immediately.
    await User.updateOne({ _id: user._id }, { role, $inc: { tokenVersion: 1 } });
  }
  user.role = role;

  await audit(req, 'user.role_change', {
    targetType: 'user',
    targetId: user._id,
    summary: `${user.email}: ${previous} → ${role}`,
  });
  res.json({ user: (await withAdminFields([user]))[0] });
}

// PATCH /api/users/:id/unlock  (admin) - clears a brute-force lockout early
export async function unlockUser(req, res) {
  const user = await findOtherUser(req);
  await User.updateOne({ _id: user._id }, { failedLoginAttempts: 0, failedConfirmAttempts: 0, lockUntil: null });
  await audit(req, 'user.unlock', { targetType: 'user', targetId: user._id, summary: `Unlocked ${user.email}` });
  res.json({ message: `${user.email} can log in again.` });
}

// DELETE /api/users/:id   { confirmPassword }  (admin, step-up)
export async function deleteUser(req, res) {
  const user = await findOtherUser(req);
  // Remove admin rights first (race-safe), so deleting can never leave no admin.
  if (user.role === 'admin') await demoteAdmin(user, 'client');

  await user.deleteOne();
  // A deleted staff login is unlinked from its staff record (the record itself stays).
  await Staff.updateMany({ user: user._id }, { user: null });
  const { deletedCount } = await Appointment.deleteMany({ user: user._id });
  await audit(req, 'user.delete', {
    targetType: 'user',
    targetId: user._id,
    summary: `Deleted ${user.email} (${user.role}) and ${deletedCount} appointment(s)`,
  });
  res.json({ message: 'User and their appointments were deleted.' });
}
