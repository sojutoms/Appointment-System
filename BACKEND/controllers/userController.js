import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import ApiError from '../utils/ApiError.js';
import { signToken } from './authController.js';
import { getPagination, paginated, searchRegex } from '../utils/query.js';

// GET /api/users/me
export function getProfile(req, res) {
  res.json({ user: req.user });
}

// PUT /api/users/me
export async function updateProfile(req, res) {
  const { name, email, phone, currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password +tokenVersion');

  if (email && email !== user.email) {
    if (await User.exists({ email, _id: { $ne: user._id } })) {
      throw new ApiError(409, 'That email is already used by another account.');
    }
    user.email = email;
  }
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;

  if (newPassword) {
    if (!currentPassword || !(await user.matchPassword(currentPassword))) {
      throw new ApiError(400, 'Current password is incorrect.');
    }
    user.password = newPassword;
  }

  await user.save();
  // A password change invalidates older tokens (other devices get logged out),
  // so give this session a fresh one.
  res.json({ user, ...(newPassword && { token: signToken(user) }) });
}

// GET /api/users  (admin)
export async function listUsers(req, res) {
  const pageInfo = getPagination(req.query);
  const filter = {};

  const regex = searchRegex(req.query.search);
  if (regex) filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  if (['client', 'admin'].includes(req.query.role)) filter.role = req.query.role;

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(pageInfo.skip).limit(pageInfo.limit),
    User.countDocuments(filter),
  ]);
  res.json(paginated(items, total, pageInfo));
}

// PATCH /api/users/:id/role  (admin)
export async function updateUserRole(req, res) {
  if (req.params.id === String(req.user._id)) {
    throw new ApiError(400, 'You cannot change your own role.');
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: req.body.role },
    { returnDocument: 'after', runValidators: true }
  );
  if (!user) throw new ApiError(404, 'User not found.');
  res.json({ user });
}

// DELETE /api/users/:id  (admin)
export async function deleteUser(req, res) {
  if (req.params.id === String(req.user._id)) {
    throw new ApiError(400, 'You cannot delete your own account.');
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  await Appointment.deleteMany({ user: user._id });
  res.json({ message: 'User and their appointments were deleted.' });
}
