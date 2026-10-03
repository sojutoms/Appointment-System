import Staff from '../models/Staff.js';
import Appointment, { ACTIVE_STATUSES } from '../models/Appointment.js';
import ApiError from '../utils/ApiError.js';
import { getPagination, paginated, searchRegex } from '../utils/query.js';
import { toMinutes } from '../utils/time.js';

const EDITABLE_FIELDS = [
  'name',
  'specialization',
  'email',
  'services',
  'workingDays',
  'startTime',
  'endTime',
  'isActive',
];

function pick(body) {
  return Object.fromEntries(EDITABLE_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));
}

function assertHours(startTime, endTime) {
  if (startTime && endTime && toMinutes(startTime) >= toMinutes(endTime)) {
    throw new ApiError(400, 'End time must be later than start time.');
  }
}

// GET /api/staff  (public; ?service=<id> filters to staff offering that service)
export async function listStaff(req, res) {
  const pageInfo = getPagination(req.query);
  const filter = {};

  const isAdmin = req.user?.role === 'admin';
  if (!(isAdmin && req.query.includeInactive === 'true')) filter.isActive = true;
  if (req.query.service) filter.services = String(req.query.service);

  const regex = searchRegex(req.query.search);
  if (regex) filter.$or = [{ name: regex }, { specialization: regex }];

  const [items, total] = await Promise.all([
    Staff.find(filter)
      .populate('services', 'name durationMinutes price isActive')
      .sort({ name: 1 })
      .skip(pageInfo.skip)
      .limit(pageInfo.limit),
    Staff.countDocuments(filter),
  ]);
  res.json(paginated(items, total, pageInfo));
}

// GET /api/staff/:id
export async function getStaff(req, res) {
  const staff = await Staff.findById(req.params.id).populate('services', 'name durationMinutes price isActive');
  if (!staff) throw new ApiError(404, 'Staff member not found.');
  res.json({ staff });
}

// POST /api/staff  (admin)
export async function createStaff(req, res) {
  const data = pick(req.body);
  assertHours(data.startTime ?? '09:00', data.endTime ?? '17:00');
  const staff = await Staff.create(data);
  res.status(201).json({ staff: await staff.populate('services', 'name durationMinutes price isActive') });
}

// PUT /api/staff/:id  (admin)
export async function updateStaff(req, res) {
  const staff = await Staff.findById(req.params.id);
  if (!staff) throw new ApiError(404, 'Staff member not found.');

  const data = pick(req.body);
  assertHours(data.startTime ?? staff.startTime, data.endTime ?? staff.endTime);
  staff.set(data);
  await staff.save();

  res.json({ staff: await staff.populate('services', 'name durationMinutes price isActive') });
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

  const staff = await Staff.findByIdAndDelete(req.params.id);
  if (!staff) throw new ApiError(404, 'Staff member not found.');
  res.json({ message: 'Staff member deleted.' });
}
