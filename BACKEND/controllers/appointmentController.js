import Appointment, { ACTIVE_STATUSES, STATUSES } from '../models/Appointment.js';
import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import TimeOff from '../models/TimeOff.js';
import User from '../models/User.js';
import { isAdminRequest } from '../middleware/auth.js';
import ApiError from '../utils/ApiError.js';
import { audit } from '../utils/audit.js';
import { getPagination, paginated, searchRegex } from '../utils/query.js';
import {
  MAX_DAYS_AHEAD,
  SLOT_STEP_MINUTES,
  addDays,
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

const describe = (appt) => `${appt.date} ${appt.startTime}`;

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
  // Only the offered slots (every 30 minutes from the start of the day), not e.g. 09:07.
  if ((start - toMinutes(staff.startTime)) % SLOT_STEP_MINUTES !== 0) {
    throw new ApiError(400, 'Please choose one of the available time slots.');
  }
  if (isInPast(date, startTime)) throw new ApiError(400, 'You cannot book a time that has already passed.');
  if (date > addDays(nowInBusinessTz().date, MAX_DAYS_AHEAD)) {
    throw new ApiError(400, `Appointments can be booked up to ${MAX_DAYS_AHEAD} days ahead.`);
  }

  const endTime = toHHMM(end);
  const [staffBusy, userBusy, timeOff] = await Promise.all([
    activeAppointmentsOn(date, { staff: staff._id }, excludeId),
    activeAppointmentsOn(date, { user: userId }, excludeId),
    TimeOff.find({ staff: staff._id, date }).select('startTime endTime'),
  ]);
  const clashes = (list) => list.some((a) => overlaps(startTime, endTime, a.startTime, a.endTime));

  if (clashes(timeOff)) throw new ApiError(409, `${staff.name} is not available at that time. Please choose another.`);
  if (clashes(staffBusy)) throw new ApiError(409, 'That time slot was just taken. Please choose another.');
  if (clashes(userBusy)) throw new ApiError(409, 'You already have an appointment at that time.');

  return { endTime };
}

/**
 * checkBooking reads then writes, so two requests for the same slot at the same
 * moment could both pass it. After saving, look again: if another active
 * appointment now overlaps (same staff, or same client), this request backs off.
 * In the worst case both racing requests back off; a slot is never double-booked.
 */
async function hasRaceClash(appointment) {
  const others = await Appointment.find({
    _id: { $ne: appointment._id },
    date: appointment.date,
    status: { $in: ACTIVE_STATUSES },
    $or: [{ staff: appointment.staff }, { user: appointment.user }],
  }).select('startTime endTime');
  return others.some((a) => overlaps(appointment.startTime, appointment.endTime, a.startTime, a.endTime));
}

const slotTaken = () => new ApiError(409, 'That time slot was just taken. Please choose another.');

// Clients can hold this many upcoming (pending/confirmed) appointments at once,
// so one account can't block a staff member's whole calendar.
const MAX_ACTIVE_PER_CLIENT = 5;

// Allowed status changes (staff use their own, stricter rules in the portal).
// Completed can only go back to confirmed, to correct a mistaken "completed";
// a cancelled booking can be restored (it is re-checked like a new booking,
// so only for future times).
const TRANSITIONS = {
  pending: ['confirmed', 'cancelled', 'completed'],
  confirmed: ['pending', 'cancelled', 'completed'],
  completed: ['confirmed'],
  cancelled: ['pending', 'confirmed'],
};

// Admin-panel sessions can access any appointment; everyone else only their own.
async function findAccessible(id, req) {
  // Staff notes are private: only loaded for the admin panel.
  const appointment = await Appointment.findById(id).select(isAdminRequest(req) ? '+staffNotes' : '');
  if (!appointment) throw new ApiError(404, 'Appointment not found.');
  if (!isAdminRequest(req) && (!appointment.user.equals(req.user._id) || appointment.hiddenForClient)) {
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

  const [busy, timeOff] = await Promise.all([
    activeAppointmentsOn(date, { staff: staff._id }, req.query.exclude),
    TimeOff.find({ staff: staff._id, date }).select('allDay startTime endTime'),
  ]);
  if (timeOff.some((t) => t.allDay)) {
    return res.json({ date, slots: [], message: `${staff.name} is not available on that day.` });
  }
  const dayStart = toMinutes(staff.startTime);
  const dayEnd = toMinutes(staff.endTime);

  const slots = [];
  for (let start = dayStart; start + service.durationMinutes <= dayEnd; start += SLOT_STEP_MINUTES) {
    const startTime = toHHMM(start);
    const endTime = toHHMM(start + service.durationMinutes);
    const taken = busy.some((a) => overlaps(startTime, endTime, a.startTime, a.endTime));
    // Partial-day time off: shown to clients as "unavailable", reason never exposed.
    const off = timeOff.some((t) => overlaps(startTime, endTime, t.startTime, t.endTime));
    const past = isInPast(date, startTime);
    const reason = taken ? 'booked' : off ? 'unavailable' : past ? 'past' : null;
    slots.push({ startTime, endTime, available: !reason, reason });
  }

  res.json({ date, slots });
}

// GET /api/appointments?search=&status=<status|active>&date=&from=&to=&staff=&service=
//                       &scope=upcoming|past&sort=asc|desc&page=&limit=
export async function listAppointments(req, res) {
  const pageInfo = getPagination(req.query);
  const filter = {};
  const admin = isAdminRequest(req);

  if (!admin) {
    filter.user = req.user._id;
    filter.hiddenForClient = { $ne: true };
  } else if (req.query.user) filter.user = String(req.query.user);

  if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
  else if (req.query.status === 'active') filter.status = { $in: ACTIVE_STATUSES };
  if (req.query.staff) filter.staff = String(req.query.staff);
  if (req.query.service) filter.service = String(req.query.service);

  // Date conditions combine: an exact date, a from/to range and/or upcoming/past.
  const today = nowInBusinessTz().date;
  const dateCond = {};
  if (req.query.from) dateCond.$gte = req.query.from;
  if (req.query.to) dateCond.$lte = req.query.to;
  if (req.query.scope === 'upcoming') dateCond.$gte = dateCond.$gte > today ? dateCond.$gte : today;
  if (req.query.scope === 'past') dateCond.$lt = today;
  if (Object.keys(dateCond).length) filter.date = dateCond;
  if (isValidDateString(String(req.query.date ?? ''))) filter.date = req.query.date;

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
      .select(admin ? '+staffNotes' : '')
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
  const admin = isAdminRequest(req);
  const match = admin ? {} : { user: req.user._id, hiddenForClient: { $ne: true } };
  const today = nowInBusinessTz().date;
  const weekEnd = addDays(today, 6);

  const [byStatus, todayCount, upcomingCount, extra, week] = await Promise.all([
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
    // Admin dashboard chart: bookings per day for the next 7 days, by status.
    admin
      ? Appointment.aggregate([
          { $match: { date: { $gte: today, $lte: weekEnd }, status: { $in: ACTIVE_STATUSES } } },
          { $group: { _id: { date: '$date', status: '$status' }, count: { $sum: 1 } } },
        ])
      : null,
  ]);

  const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const { _id, count } of byStatus) statusCounts[_id] = count;

  let nextSevenDays;
  if (week) {
    nextSevenDays = Array.from({ length: 7 }, (_, i) => ({ date: addDays(today, i), pending: 0, confirmed: 0 }));
    for (const { _id, count } of week) {
      const day = nextSevenDays.find((d) => d.date === _id.date);
      if (day) day[_id.status] = count;
    }
  }

  res.json({
    total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    byStatus: statusCounts,
    today: todayCount,
    upcoming: upcomingCount,
    ...(extra && { clients: extra[0], activeServices: extra[1], activeStaff: extra[2], nextSevenDays }),
  });
}

// GET /api/appointments/:id
export async function getAppointment(req, res) {
  const appointment = await findAccessible(req.params.id, req);
  res.json({ appointment: await appointment.populate(POPULATE) });
}

// POST /api/appointments
export async function createAppointment(req, res) {
  const { service, staff, date, startTime, notes } = req.body;
  const userId = req.user._id;

  const activeCount = await Appointment.countDocuments({
    user: userId,
    status: { $in: ACTIVE_STATUSES },
    date: { $gte: nowInBusinessTz().date },
  });
  if (activeCount >= MAX_ACTIVE_PER_CLIENT) {
    throw new ApiError(
      409,
      `You can have up to ${MAX_ACTIVE_PER_CLIENT} upcoming appointments at a time. Please cancel or wait for one to finish before booking another.`
    );
  }

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
  if (await hasRaceClash(appointment)) {
    await appointment.deleteOne();
    throw slotTaken();
  }

  res.status(201).json({ appointment: await appointment.populate(POPULATE) });
}

// PUT /api/appointments/:id
// Clients can reschedule, edit notes, or cancel their own active appointments.
// Admins can additionally set any status (confirm, complete, cancel).
export async function updateAppointment(req, res) {
  const appointment = await findAccessible(req.params.id, req);
  const admin = isAdminRequest(req);
  const { service, staff, date, startTime, notes, status } = req.body;
  const before = { status: appointment.status, when: describe(appointment) };

  // An appointment can only be marked completed once it has started.
  if (status === 'completed' && appointment.status !== 'completed' && !isInPast(date ?? appointment.date, startTime ?? appointment.startTime)) {
    throw new ApiError(400, 'An appointment can only be marked completed after it has started.');
  }

  if (!admin) {
    if (!ACTIVE_STATUSES.includes(appointment.status)) {
      throw new ApiError(400, `A ${appointment.status} appointment can no longer be changed.`);
    }
    if (status !== undefined && status !== 'cancelled' && status !== appointment.status) {
      throw new ApiError(403, 'You can only cancel your appointment. Only an admin can confirm or complete it.');
    }
    if (isInPast(appointment.date, appointment.startTime)) {
      throw new ApiError(400, 'This appointment has already started, so it can no longer be changed or cancelled.');
    }
  }

  if (status !== undefined && status !== appointment.status && !TRANSITIONS[appointment.status].includes(status)) {
    throw new ApiError(400, `A ${appointment.status} appointment can't be changed to ${status}.`);
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
  // Re-opening a cancelled booking re-checks its slot. A completed one has
  // already started, so nobody else can have booked that time since.
  const reactivated = willBeActive && appointment.status === 'cancelled';

  if (rescheduled && !willBeActive) {
    throw new ApiError(400, `A ${next.status} appointment cannot be rescheduled.`);
  }

  const previous = {
    service: appointment.service,
    staff: appointment.staff,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
  };
  const takesNewSlot = willBeActive && (rescheduled || reactivated);

  if (takesNewSlot) {
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
  // Private staff notes can be edited from the admin panel (never by clients).
  if (admin && req.body.staffNotes !== undefined) appointment.staffNotes = req.body.staffNotes;
  await appointment.save();

  // Someone else took the slot at the same moment: put the appointment back.
  if (takesNewSlot && (await hasRaceClash(appointment))) {
    appointment.set(previous);
    await appointment.save();
    throw slotTaken();
  }

  if (admin) {
    const changes = [];
    if (before.status !== appointment.status) changes.push(`${before.status} → ${appointment.status}`);
    if (rescheduled) changes.push(`moved ${before.when} → ${describe(appointment)}`);
    if (changes.length) {
      await audit(req, appointment.status !== before.status ? `appointment.${appointment.status}` : 'appointment.reschedule', {
        targetType: 'appointment',
        targetId: appointment._id,
        summary: changes.join('; '),
      });
    }
  }

  res.json({ appointment: await appointment.populate(POPULATE) });
}

// DELETE /api/appointments/:id
// Admins delete the record. A client only removes a finished (completed or
// cancelled) appointment from their own history; the record stays for staff
// and admins, and active bookings must be cancelled instead.
export async function deleteAppointment(req, res) {
  const appointment = await findAccessible(req.params.id, req);
  if (!isAdminRequest(req)) {
    if (ACTIVE_STATUSES.includes(appointment.status)) {
      throw new ApiError(400, 'Cancel this appointment first; only finished appointments can be removed from your history.');
    }
    appointment.hiddenForClient = true;
    await appointment.save();
    return res.json({ message: 'Appointment removed from your history.' });
  }

  await appointment.deleteOne();
  await audit(req, 'appointment.delete', {
    targetType: 'appointment',
    targetId: appointment._id,
    summary: `Deleted ${appointment.status} appointment on ${describe(appointment)}`,
  });
  res.json({ message: 'Appointment deleted.' });
}
