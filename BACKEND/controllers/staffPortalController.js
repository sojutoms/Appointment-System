import Appointment, { ACTIVE_STATUSES, STATUSES } from '../models/Appointment.js';
import TimeOff from '../models/TimeOff.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { audit } from '../utils/audit.js';
import { getPagination, paginated, searchRegex } from '../utils/query.js';
import { addDays, isInPast, nowInBusinessTz } from '../utils/time.js';

// Everything here runs after `requireStaff`, so req.staff is the signed-in
// staff member's own record, and EVERY query is filtered by it: staff can only
// ever see their own appointments and clients.

const POPULATE = [
  { path: 'user', select: 'name email phone' },
  { path: 'service', select: 'name durationMinutes price' },
];

const own = (req) => ({ staff: req.staff._id });

// GET /api/staff-portal/me
export async function getMyStaffProfile(req, res) {
  await req.staff.populate('services', 'name durationMinutes price isActive');
  const json = req.staff.toJSON();
  delete json.user;
  res.json({ staff: json });
}

// GET /api/staff-portal/summary - numbers for the top of the schedule page
export async function getSummary(req, res) {
  const today = nowInBusinessTz().date;
  const weekEnd = addDays(today, 6);
  const [todayCount, weekCount, pendingCount, completedCount] = await Promise.all([
    Appointment.countDocuments({ ...own(req), date: today, status: { $in: ACTIVE_STATUSES } }),
    Appointment.countDocuments({ ...own(req), date: { $gte: today, $lte: weekEnd }, status: { $in: ACTIVE_STATUSES } }),
    Appointment.countDocuments({ ...own(req), date: { $gte: today }, status: 'pending' }),
    Appointment.countDocuments({ ...own(req), status: 'completed' }),
  ]);
  res.json({ today: todayCount, next7Days: weekCount, pending: pendingCount, completed: completedCount });
}

// GET /api/staff-portal/day?date=YYYY-MM-DD - one day's appointments + time off
export async function getDay(req, res) {
  const date = req.query.date || nowInBusinessTz().date;
  const [appointments, timeOff] = await Promise.all([
    Appointment.find({ ...own(req), date }).select('+staffNotes').populate(POPULATE).sort({ startTime: 1 }),
    TimeOff.find({ ...own(req), date }).sort({ startTime: 1 }),
  ]);
  res.json({ date, appointments, timeOff });
}

// GET /api/staff-portal/appointments?search=&status=&from=&to=&scope=&page=&limit=
export async function listMyAppointments(req, res) {
  const pageInfo = getPagination(req.query);
  const filter = own(req);

  if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
  else if (req.query.status === 'active') filter.status = { $in: ACTIVE_STATUSES };

  const today = nowInBusinessTz().date;
  const dateCond = {};
  if (req.query.from) dateCond.$gte = req.query.from;
  if (req.query.to) dateCond.$lte = req.query.to;
  if (req.query.scope === 'upcoming') dateCond.$gte = dateCond.$gte > today ? dateCond.$gte : today;
  if (req.query.scope === 'past') dateCond.$lt = today;
  if (Object.keys(dateCond).length) filter.date = dateCond;

  // Search by client name/email or notes, within this staff member's appointments only.
  const regex = searchRegex(req.query.search);
  if (regex) {
    const clientIds = await Appointment.distinct('user', own(req));
    const matches = await User.find({ _id: { $in: clientIds }, $or: [{ name: regex }, { email: regex }] }).distinct('_id');
    filter.$or = [{ notes: regex }, { user: { $in: matches } }];
  }

  const direction = req.query.scope === 'past' ? -1 : 1;
  const [items, total] = await Promise.all([
    Appointment.find(filter).select('+staffNotes').populate(POPULATE).sort({ date: direction, startTime: direction }).skip(pageInfo.skip).limit(pageInfo.limit),
    Appointment.countDocuments(filter),
  ]);
  res.json(paginated(items, total, pageInfo));
}

async function findMine(req) {
  const appointment = await Appointment.findOne({ _id: req.params.id, ...own(req) }).select('+staffNotes');
  // 404 (not 403) for other staff members' appointments, so IDs can't be probed.
  if (!appointment) throw new ApiError(404, 'Appointment not found.');
  return appointment;
}

// GET /api/staff-portal/appointments/:id
export async function getMyAppointment(req, res) {
  const appointment = await findMine(req);
  res.json({ appointment: await appointment.populate(POPULATE) });
}

// PATCH /api/staff-portal/appointments/:id   { status?: 'confirmed' | 'completed', staffNotes? }
// Staff can confirm bookings, mark visits completed and keep private notes.
// Cancelling and rescheduling stay with the client and the admins.
export async function updateMyAppointment(req, res) {
  const appointment = await findMine(req);
  const { status, staffNotes } = req.body;
  const before = appointment.status;

  if (status !== undefined && status !== appointment.status) {
    if (status === 'confirmed') {
      if (appointment.status !== 'pending') throw new ApiError(400, `A ${appointment.status} appointment can't be confirmed.`);
    } else if (status === 'completed') {
      if (!ACTIVE_STATUSES.includes(appointment.status)) throw new ApiError(400, `A ${appointment.status} appointment can't be completed.`);
      if (!isInPast(appointment.date, appointment.startTime)) {
        throw new ApiError(400, 'An appointment can only be marked completed after it has started.');
      }
    } else {
      throw new ApiError(403, 'Staff can confirm or complete appointments. Ask an administrator to cancel or reschedule.');
    }
    appointment.status = status;
  }
  if (staffNotes !== undefined) appointment.staffNotes = staffNotes;
  await appointment.save();

  if (before !== appointment.status) {
    await audit(req, `staff.appointment_${appointment.status}`, {
      targetType: 'appointment',
      targetId: appointment._id,
      summary: `${req.staff.name}: ${before} → ${appointment.status} (${appointment.date} ${appointment.startTime})`,
    });
  }
  res.json({ appointment: await appointment.populate(POPULATE) });
}
