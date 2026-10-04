import Appointment, { ACTIVE_STATUSES } from '../models/Appointment.js';
import Staff from '../models/Staff.js';
import TimeOff from '../models/TimeOff.js';
import { isAdminRequest } from '../middleware/auth.js';
import ApiError from '../utils/ApiError.js';
import { audit } from '../utils/audit.js';
import { getPagination, paginated } from '../utils/query.js';
import { addDays, isInPast, nowInBusinessTz, overlaps, toMinutes } from '../utils/time.js';

export const TIME_OFF_MAX_DAYS_AHEAD = 180;

// Staff can only touch their own time off; the admin panel can manage anyone's.
async function resolveStaffId(req, requestedStaffId) {
  if (req.staff) return req.staff._id;
  if (isAdminRequest(req)) {
    if (!requestedStaffId) throw new ApiError(400, 'Choose a staff member.');
    if (!(await Staff.exists({ _id: requestedStaffId }))) throw new ApiError(404, 'Staff member not found.');
    return requestedStaffId;
  }
  throw new ApiError(403, 'You do not have permission to perform this action.');
}

// GET /api/time-off?staff=&from=&to=&page=&limit=
export async function listTimeOff(req, res) {
  const pageInfo = getPagination(req.query);
  const filter = {};
  if (req.staff) filter.staff = req.staff._id;
  else if (req.query.staff) filter.staff = String(req.query.staff);

  const from = req.query.from || nowInBusinessTz().date; // upcoming by default
  filter.date = { $gte: from, ...(req.query.to && { $lte: req.query.to }) };

  const [items, total] = await Promise.all([
    TimeOff.find(filter).populate('staff', 'name').sort({ date: 1, startTime: 1 }).skip(pageInfo.skip).limit(pageInfo.limit),
    TimeOff.countDocuments(filter),
  ]);
  res.json(paginated(items, total, pageInfo));
}

// POST /api/time-off   { staff? (admin only), date, allDay, startTime?, endTime?, reason? }
export async function createTimeOff(req, res) {
  const { date, reason = '' } = req.body;
  const allDay = req.body.allDay !== false;
  const staffId = await resolveStaffId(req, req.body.staff);

  const startTime = allDay ? '00:00' : req.body.startTime;
  const endTime = allDay ? '24:00' : req.body.endTime;
  if (!allDay && (!startTime || !endTime || toMinutes(startTime) >= toMinutes(endTime))) {
    throw new ApiError(400, 'End time must be later than start time.');
  }

  const today = nowInBusinessTz().date;
  if (date < today) throw new ApiError(400, 'Time off cannot be in the past.');
  if (!allDay && isInPast(date, endTime)) throw new ApiError(400, 'That time has already passed today. Choose a later time.');
  if (date > addDays(today, TIME_OFF_MAX_DAYS_AHEAD)) {
    throw new ApiError(400, `Time off can be added up to ${TIME_OFF_MAX_DAYS_AHEAD} days ahead.`);
  }

  // No double entries for the same period.
  const existing = await TimeOff.find({ staff: staffId, date });
  if (existing.some((t) => overlaps(startTime, endTime, t.startTime, t.endTime))) {
    throw new ApiError(409, 'This overlaps time off that is already scheduled.');
  }

  // Booked clients must be handled first: time off can't silently cover appointments.
  const clashes = (await Appointment.find({ staff: staffId, date, status: { $in: ACTIVE_STATUSES } }).select('startTime endTime')).filter((a) =>
    overlaps(startTime, endTime, a.startTime, a.endTime)
  );
  if (clashes.length) {
    const times = clashes.map((a) => a.startTime).sort().join(', ');
    throw new ApiError(
      409,
      `There ${clashes.length === 1 ? 'is 1 booked appointment' : `are ${clashes.length} booked appointments`} in this period (${times}). ` +
        (req.staff ? 'Ask an administrator to reschedule or cancel them first.' : 'Reschedule or cancel them first.'),
      undefined,
      { code: 'TIME_OFF_CONFLICT', conflicts: clashes.length }
    );
  }

  const entry = await TimeOff.create({ staff: staffId, date, allDay, startTime, endTime, reason: String(reason).trim(), createdBy: req.user._id });
  await audit(req, 'timeoff.create', {
    targetType: 'staff',
    targetId: staffId,
    summary: `Time off on ${date}${allDay ? ' (all day)' : ` ${startTime}–${endTime}`}`,
  });
  res.status(201).json({ timeOff: await entry.populate('staff', 'name') });
}

// DELETE /api/time-off/:id
export async function deleteTimeOff(req, res) {
  const entry = await TimeOff.findById(req.params.id);
  // Staff get 404 for other people's entries, so they can't probe IDs.
  if (!entry || (req.staff && !entry.staff.equals(req.staff._id))) throw new ApiError(404, 'Time off not found.');
  if (!req.staff && !isAdminRequest(req)) throw new ApiError(403, 'You do not have permission to perform this action.');

  await entry.deleteOne();
  await audit(req, 'timeoff.delete', { targetType: 'staff', targetId: entry.staff, summary: `Removed time off on ${entry.date}` });
  res.json({ message: 'Time off removed.' });
}
