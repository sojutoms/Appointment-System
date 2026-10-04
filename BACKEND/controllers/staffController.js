import crypto from 'node:crypto';
import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import TimeOff from '../models/TimeOff.js';
import User from '../models/User.js';
import Appointment, { ACTIVE_STATUSES } from '../models/Appointment.js';
import { isAdminRequest } from '../middleware/auth.js';
import ApiError from '../utils/ApiError.js';
import { audit } from '../utils/audit.js';
import { clearOtp, issueOtp } from '../utils/otp.js';
import { getPagination, paginated, searchRegex } from '../utils/query.js';
import { addDays, nowInBusinessTz, toMinutes } from '../utils/time.js';

const EDITABLE_FIELDS = ['name', 'specialization', 'email', 'services', 'workingDays', 'startTime', 'endTime', 'isActive'];
const SERVICE_FIELDS = 'name durationMinutes price isActive';

// Whitelist: only these fields can ever be written from a request (no mass assignment).
function pick(body) {
  const data = Object.fromEntries(EDITABLE_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));
  // De-duplicate list fields.
  if (data.services) data.services = [...new Set(data.services.map(String))];
  if (data.workingDays) data.workingDays = [...new Set(data.workingDays)].sort();
  return data;
}

async function assertServicesExist(serviceIds) {
  if (!serviceIds?.length) return;
  if ((await Service.countDocuments({ _id: { $in: serviceIds } })) !== serviceIds.length) {
    throw new ApiError(400, 'One or more selected services no longer exist.');
  }
}

function assertHours(startTime, endTime) {
  if (startTime && endTime && toMinutes(startTime) >= toMinutes(endTime)) {
    throw new ApiError(400, 'End time must be later than start time.');
  }
}

// Portal access state for the admin panel: none | invited | active.
function portalStatus(staff) {
  if (!staff.user) return 'none';
  return staff.user.isVerified ? 'active' : 'invited';
}

// Admin view: full record plus portal status. Public view: no email, no account link.
function present(staff, admin) {
  const json = staff.toJSON();
  if (admin) {
    return {
      ...json,
      user: undefined,
      portal: { status: portalStatus(staff), lastLoginAt: staff.user?.lastLoginAt ?? null },
    };
  }
  return { ...json, email: undefined, user: undefined };
}

// GET /api/staff  (public; ?service=<id> filters to staff offering that service)
export async function listStaff(req, res) {
  const pageInfo = getPagination(req.query);
  const filter = {};
  const admin = isAdminRequest(req);

  if (!(admin && req.query.includeInactive === 'true')) filter.isActive = true;
  if (req.query.service) filter.services = String(req.query.service);

  const regex = searchRegex(req.query.search);
  if (regex) filter.$or = [{ name: regex }, { specialization: regex }];

  let query = Staff.find(filter).populate('services', SERVICE_FIELDS).sort({ name: 1 }).skip(pageInfo.skip).limit(pageInfo.limit);
  if (admin) query = query.populate('user', 'isVerified lastLoginAt');
  const [items, total] = await Promise.all([query, Staff.countDocuments(filter)]);

  res.json(paginated(items.map((s) => present(s, admin)), total, pageInfo));
}

// GET /api/staff/:id
export async function getStaff(req, res) {
  const admin = isAdminRequest(req);
  let query = Staff.findById(req.params.id).populate('services', SERVICE_FIELDS);
  if (admin) query = query.populate('user', 'isVerified lastLoginAt');
  const staff = await query;
  if (!staff) throw new ApiError(404, 'Staff member not found.');
  res.json({ staff: present(staff, admin) });
}

// GET /api/staff/:id/unavailable?from=&to=   (public)
// Days the person is fully off, so the booking calendar can grey them out.
// Only dates are returned, never the reason.
export async function getUnavailableDates(req, res) {
  const from = req.query.from || nowInBusinessTz().date;
  const to = req.query.to || addDays(from, 60);
  const entries = await TimeOff.find({ staff: req.params.id, allDay: true, date: { $gte: from, $lte: to } }).select('date');
  res.json({ dates: [...new Set(entries.map((e) => e.date))].sort() });
}

// POST /api/staff  (admin)
export async function createStaff(req, res) {
  const data = pick(req.body);
  assertHours(data.startTime ?? '09:00', data.endTime ?? '17:00');
  await assertServicesExist(data.services);
  const staff = await Staff.create(data);
  await audit(req, 'staff.create', { targetType: 'staff', targetId: staff._id, summary: `Added "${staff.name}"` });
  res.status(201).json({ staff: present(await staff.populate('services', SERVICE_FIELDS), true) });
}

// PUT /api/staff/:id  (admin)
export async function updateStaff(req, res) {
  const staff = await Staff.findById(req.params.id);
  if (!staff) throw new ApiError(404, 'Staff member not found.');

  const data = pick(req.body);
  // The email is their login once they have portal access.
  if (staff.user && data.email !== undefined && data.email !== staff.email) {
    throw new ApiError(400, "This person has staff-portal access, so their email is their login. Revoke access first to change it.");
  }
  assertHours(data.startTime ?? staff.startTime, data.endTime ?? staff.endTime);
  await assertServicesExist(data.services);
  staff.set(data);
  await staff.save();

  await audit(req, 'staff.update', { targetType: 'staff', targetId: staff._id, summary: `Updated "${staff.name}"` });
  await staff.populate([{ path: 'services', select: SERVICE_FIELDS }, { path: 'user', select: 'isVerified lastLoginAt' }]);
  res.json({ staff: present(staff, true) });
}

// Deletes the staff member's login (if any) and unlinks it.
async function removePortalAccount(staff) {
  if (!staff.user) return;
  const userId = staff.user._id ?? staff.user;
  await User.deleteOne({ _id: userId, role: 'staff' });
  if (staff.email) await clearOtp(staff.email, 'staff-invite');
  staff.user = null;
}

// DELETE /api/staff/:id  (admin)
export async function deleteStaff(req, res) {
  const hasUpcoming = await Appointment.exists({
    staff: req.params.id,
    status: { $in: ACTIVE_STATUSES },
  });
  if (hasUpcoming) {
    throw new ApiError(
      409,
      'This staff member has pending or confirmed appointments. Reassign or cancel them first, or deactivate the staff member.'
    );
  }

  const staff = await Staff.findById(req.params.id);
  if (!staff) throw new ApiError(404, 'Staff member not found.');
  await removePortalAccount(staff);
  await TimeOff.deleteMany({ staff: staff._id });
  await staff.deleteOne();
  await audit(req, 'staff.delete', { targetType: 'staff', targetId: staff._id, summary: `Deleted "${staff.name}"` });
  res.json({ message: 'Staff member deleted.' });
}

// POST /api/staff/:id/invite  (admin)
// Creates (or re-sends) a staff-portal invite to the staff member's email.
export async function inviteStaff(req, res) {
  const staff = await Staff.findById(req.params.id).populate('user', 'isVerified');
  if (!staff) throw new ApiError(404, 'Staff member not found.');
  if (!staff.email) throw new ApiError(400, 'Add a work email for this person first; the invite is sent there.');
  if (staff.user?.isVerified) throw new ApiError(409, 'This person already has an active staff account.');

  if (!staff.user) {
    if (await User.exists({ email: staff.email })) {
      throw new ApiError(409, 'That email already belongs to another account. Use a different work email for this staff member.');
    }
    // The random password is never shown to anyone; the staff member sets
    // their own when they activate the account with the emailed code.
    const user = await User.create({
      name: staff.name,
      email: staff.email,
      password: crypto.randomBytes(32).toString('base64url'),
      role: 'staff',
      isVerified: false,
    });
    staff.user = user._id;
    await staff.save();
  }

  const otp = await issueOtp({ email: staff.email, purpose: 'staff-invite', name: staff.name });
  await audit(req, 'staff.invite', { targetType: 'staff', targetId: staff._id, summary: `Sent staff-portal invite to ${staff.email}` });
  res.json({ message: `Invite sent to ${staff.email}.`, ...otp });
}

// DELETE /api/staff/:id/access  (admin)
// Removes portal access immediately: the login is deleted, so every session ends.
export async function revokeStaffAccess(req, res) {
  const staff = await Staff.findById(req.params.id);
  if (!staff) throw new ApiError(404, 'Staff member not found.');
  if (!staff.user) throw new ApiError(400, 'This person does not have staff-portal access.');

  await removePortalAccount(staff);
  await staff.save();
  await audit(req, 'staff.revoke_access', { targetType: 'staff', targetId: staff._id, summary: `Revoked staff-portal access for ${staff.name}` });
  res.json({ message: `${staff.name} can no longer sign in to the staff portal.` });
}
