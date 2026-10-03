import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import Appointment, { ACTIVE_STATUSES } from '../models/Appointment.js';
import ApiError from '../utils/ApiError.js';
import { getPagination, paginated, searchRegex } from '../utils/query.js';

const EDITABLE_FIELDS = ['name', 'description', 'durationMinutes', 'price', 'isActive'];

function pick(body) {
  return Object.fromEntries(EDITABLE_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));
}

// GET /api/services  (public; admins can pass includeInactive=true)
export async function listServices(req, res) {
  const pageInfo = getPagination(req.query);
  const filter = {};

  const isAdmin = req.user?.role === 'admin';
  if (!(isAdmin && req.query.includeInactive === 'true')) filter.isActive = true;

  const regex = searchRegex(req.query.search);
  if (regex) filter.$or = [{ name: regex }, { description: regex }];

  const [items, total] = await Promise.all([
    Service.find(filter).sort({ name: 1 }).skip(pageInfo.skip).limit(pageInfo.limit),
    Service.countDocuments(filter),
  ]);
  res.json(paginated(items, total, pageInfo));
}

// GET /api/services/:id
export async function getService(req, res) {
  const service = await Service.findById(req.params.id);
  if (!service) throw new ApiError(404, 'Service not found.');
  res.json({ service });
}

// POST /api/services  (admin)
export async function createService(req, res) {
  const service = await Service.create(pick(req.body));
  res.status(201).json({ service });
}

// PUT /api/services/:id  (admin)
export async function updateService(req, res) {
  const service = await Service.findByIdAndUpdate(req.params.id, pick(req.body), {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!service) throw new ApiError(404, 'Service not found.');
  res.json({ service });
}

// DELETE /api/services/:id  (admin)
export async function deleteService(req, res) {
  const hasUpcoming = await Appointment.exists({
    service: req.params.id,
    status: { $in: ACTIVE_STATUSES },
  });
  if (hasUpcoming) {
    throw new ApiError(
      409,
      'This service has pending or confirmed appointments. Cancel them or deactivate the service instead.'
    );
  }

  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) throw new ApiError(404, 'Service not found.');

  await Staff.updateMany({ services: service._id }, { $pull: { services: service._id } });
  res.json({ message: 'Service deleted.' });
}
