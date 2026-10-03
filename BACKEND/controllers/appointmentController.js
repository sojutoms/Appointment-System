import Appointment, { ACTIVE_STATUSES, STATUSES } from '../models/Appointment.js';
import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { getPagination, paginated, searchRegex } from '../utils/query.js';
import {
  SLOT_STEP_MINUTES,
  dayOfWeek,
  isInPast,
  isValidDateString,
  nowInBusinessTz,
  overlaps,
  toHHMM,
  toMinutes,
} from '../utils/time.js';

const POPULATE = [
  { path: 'user', select: 'name email phone' },
  { path: 'service', select: 'name durationMinutes price' },
  { path: 'staff', select: 'name specialization' },
];

const isAdmin = (user) => user.role === 'admin';

async function loadServiceAndStaff(serviceId, staffId) {
  const [service, staff] = await Promise.all([Service.findById(serviceId), Staff.findById(staffId)]);
  if (!service || !service.isActive) throw new ApiError(400, 'The selected service is not available.');
  if (!staff || !staff.isActive) throw new ApiError(400, 'The selected staff member is not available.');
  if (!staff.services.some((id) => id.equals(service._id))) {
    throw new ApiError(400, `${staff.name} does not offer ${service.name}.`);
  }
  return { service, staff };
}

// Active (pending/confirmed) appointments that could clash with a new booking.
function activeAppointmentsOn(date, match, excludeId) {
  return Appointment.find({
    ...match,
    date,
    status: { $in: ACTIVE_STATUSES },
    ...(excludeId && { _id: { $ne: excludeId } }),
  }).select('startTime endTime');
}

// Validates every business rule for a booking and returns the computed end time.
async function checkBooking({ userId, serviceId, staffId, date, startTime, excludeId }) {
  const { service, staff } = await loadServiceAndStaff(serviceId, staffId);

  if (!isValidDateString(date)) throw new ApiError(400, 'Invalid date.');
  if (!staff.workingDays.includes(dayOfWeek(date))) {
    throw new ApiError(400, `${staff.name} does not work on that day.`);
  }

  const start = toMinutes(startTime);
  const end = start + service.durationMinutes;
  if (start < toMinutes(staff.startTime) || end > toMinutes(staff.endTime)) {
    throw new ApiError(400, `Please choose a time between ${staff.startTime} and ${staff.endTime}.`);
  }
  if (isInPast(date, startTime)) throw new ApiError(400, 'You cannot book a time that has already passed.');

  const endTime = toHHMM(end);
  const [staffBusy, userBusy] = await Promise.all([
    activeAppointmentsOn(date, { staff: staff._id }, excludeId),
    activeAppointmentsOn(date, { user: userId }, excludeId),
  ]);
  const clashes = (list) => list.some((a) => overlaps(startTime, endTime, a.startTime, a.endTime));

  if (clashes(staffBusy)) throw new ApiError(409, 'That time slot was just taken. Please choose another.');
  if (clashes(userBusy)) throw new ApiError(409, 'You already have an appointment at that time.');

  return { endTime };
}

async function findAccessible(id, user) {
  const appointment = await Appointment.findById(id);
  if (!appointment) throw new ApiError(404, 'Appointment not found.');
  if (!isAdmin(user) && !appointment.user.equals(user._id)) {
    // 404 rather than 403 so clients can't probe for other people's appointment IDs.
    throw new ApiError(404, 'Appointment not found.');
  }
  return appointment;
}

// GET /api/appointments/available-slots?service=&staff=&date=
export async function getAvailableSlots(req, res) {
  const { service: serviceId, staff: staffId, date } = req.query;
  const { service, staff } = await loadServiceAndStaff(serviceId, staffId);

  if (!staff.workingDays.includes(dayOfWeek(date))) {
    return res.json({ date, slots: [], message: `${staff.name} does not work on that day.` });
  }

  const busy = await activeAppointmentsOn(date, { staff: staff._id }, req.query.exclude);
  const dayStart = toMinutes(staff.startTime);
  const dayEnd = toMinutes(staff.endTime);

  const slots = [];
  for (let start = dayStart; start + service.durationMinutes <= dayEnd; start += SLOT_STEP_MINUTES) {
    const startTime = toHHMM(start);
    const endTime = toHHMM(start + service.durationMinutes);
    const taken = busy.some((a) => overlaps(startTime, endTime, a.startTime, a.endTime));
    const past = isInPast(date, startTime);
    slots.push({ startTime, endTime, available: !taken && !past, reason: taken ? 'booked' : past ? 'past' : null });
  }

  res.json({ date, slots });
}

// GET /api/appointments?search=&status=&date=&scope=upcoming|past&page=&limit=
export async function listAppointments(req, res) {
  const pageInfo = getPagination(req.query);
  const filter = {};
  const admin = isAdmin(req.user);

  if (!admin) filter.user = req.user._id;
  else if (req.query.user) filter.user = String(req.query.user);

  if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (isValidDateString(String(req.query.date ?? ''))) filter.date = req.query.date;

  const today = nowInBusinessTz().date;
  if (req.query.scope === 'upcoming') filter.date = { $gte: today };
  if (req.query.scope === 'past') filter.date = { $lt: today };

  // Search across service name, staff name, notes and (for admins) client name/email.
  const regex = searchRegex(req.query.search);
  if (regex) {
    const [services, staff, users] = await Promise.all([
      Service.find({ name: regex }).distinct('_id'),
      Staff.find({ name: regex }).distinct('_id'),
      admin ? User.find({ $or: [{ name: regex }, { email: regex }] }).distinct('_id') : [],
    ]);
    filter.$or = [
      { notes: regex },
      { service: { $in: services } },
      { staff: { $in: staff } },
      ...(admin ? [{ user: { $in: users } }] : []),
    ];
  }

  const direction = req.query.sort === 'asc' || req.query.scope === 'upcoming' ? 1 : -1;
  const [items, total] = await Promise.all([
    Appointment.find(filter)
      .populate(POPULATE)
      .sort({ date: direction, startTime: direction })
      .skip(pageInfo.skip)
      .limit(pageInfo.limit),
    Appointment.countDocuments(filter),
  ]);
  res.json(paginated(items, total, pageInfo));
}

// GET /api/appointments/stats
export async function getStats(req, res) {
  const admin = isAdmin(req.user);
  const match = admin ? {} : { user: req.user._id };
  const today = nowInBusinessTz().date;

  const [byStatus, todayCount, upcomingCount, extra] = await Promise.all([
    Appointment.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Appointment.countDocuments({ ...match, date: today, status: { $in: ACTIVE_STATUSES } }),
    Appointment.countDocuments({ ...match, date: { $gte: today }, status: { $in: ACTIVE_STATUSES } }),
    admin
      ? Promise.all([
          User.countDocuments({ role: 'client' }),
          Service.countDocuments({ isActive: true }),
          Staff.countDocuments({ isActive: true }),
        ])
      : null,
  ]);

  const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const { _id, count } of byStatus) statusCounts[_id] = count;

  res.json({
    total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    byStatus: statusCounts,
    today: todayCount,
    upcoming: upcomingCount,
    ...(extra && { clients: extra[0], activeServices: extra[1], activeStaff: extra[2] }),
  });
}

// GET /api/appointments/:id
export async function getAppointment(req, res) {
  const appointment = await findAccessible(req.params.id, req.user);
  res.json({ appointment: await appointment.populate(POPULATE) });
}

// POST /api/appointments
export async function createAppointment(req, res) {
  const { service, staff, date, startTime, notes } = req.body;
  const userId = req.user._id;

  const { endTime } = await checkBooking({ userId, serviceId: service, staffId: staff, date, startTime });
  const appointment = await Appointment.create({
    user: userId,
    service,
    staff,
    date,
    startTime,
    endTime,
    notes,
    status: 'pending',
  });

  res.status(201).json({ appointment: await appointment.populate(POPULATE) });
}

// PUT /api/appointments/:id
// Clients can reschedule, edit notes, or cancel their own active appointments.
// Admins can additionally set any status (confirm, complete, cancel).
export async function updateAppointment(req, res) {
  const appointment = await findAccessible(req.params.id, req.user);
  const admin = isAdmin(req.user);
  const { service, staff, date, startTime, notes, status } = req.body;

  if (!admin) {
    if (!ACTIVE_STATUSES.includes(appointment.status)) {
      throw new ApiError(400, `A ${appointment.status} appointment can no longer be changed.`);
    }
    if (status !== undefined && status !== 'cancelled' && status !== appointment.status) {
      throw new ApiError(403, 'You can only cancel your appointment. Only an admin can confirm or complete it.');
    }
  }

  const next = {
    service: service ?? String(appointment.service),
    staff: staff ?? String(appointment.staff),
    date: date ?? appointment.date,
    startTime: startTime ?? appointment.startTime,
    status: status ?? appointment.status,
  };

  const rescheduled =
    next.service !== String(appointment.service) ||
    next.staff !== String(appointment.staff) ||
    next.date !== appointment.date ||
    next.startTime !== appointment.startTime;
  const willBeActive = ACTIVE_STATUSES.includes(next.status);
  const reactivated = willBeActive && !ACTIVE_STATUSES.includes(appointment.status);

  if (rescheduled && !willBeActive) {
    throw new ApiError(400, `A ${next.status} appointment cannot be rescheduled.`);
  }

  if (willBeActive && (rescheduled || reactivated)) {
    const { endTime } = await checkBooking({
      userId: appointment.user,
      serviceId: next.service,
      staffId: next.staff,
      date: next.date,
      startTime: next.startTime,
      excludeId: appointment._id,
    });
    appointment.set({ service: next.service, staff: next.staff, date: next.date, startTime: next.startTime, endTime });
    // A client reschedule needs to be re-approved.
    if (rescheduled && !admin) next.status = 'pending';
  }

  appointment.status = next.status;
  if (notes !== undefined) appointment.notes = notes;
  await appointment.save();

  res.json({ appointment: await appointment.populate(POPULATE) });
}

// DELETE /api/appointments/:id
export async function deleteAppointment(req, res) {
  const appointment = await findAccessible(req.params.id, req.user);
  await appointment.deleteOne();
  res.json({ message: 'Appointment deleted.' });
}
