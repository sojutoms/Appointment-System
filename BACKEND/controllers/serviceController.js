import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import Appointment, { ACTIVE_STATUSES } from '../models/Appointment.js';
import { isAdminRequest } from '../middleware/auth.js';
import ApiError from '../utils/ApiError.js';
import { audit } from '../utils/audit.js';
import { getPagination, paginated, searchRegex } from '../utils/query.js';

const EDITABLE_FIELDS = ['name', 'description', 'durationMinutes', 'price', 'isActive'];

// Whitelist: only these fields can ever be written from a request (no mass assignment).
function pick(body) {
  return Object.fromEntries(EDITABLE_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));
}

// GET /api/services  (public; admin panel may pass includeInactive=true)
export async function listServices(req, res) {
  const pageInfo = getPagination(req.query);
  const filter = {};

  if (!(isAdminRequest(req) && req.query.includeInactive === 'true')) filter.isActive = true;

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
  await audit(req, 'service.create', { targetType: 'service', targetId: service._id, summary: `Created "${service.name}"` });
  res.status(201).json({ service });
}

// PUT /api/services/:id  (admin)
export async function updateService(req, res) {
  const service = await Service.findById(req.params.id);
  if (!service) throw new ApiError(404, 'Service not found.');

  const changes = pick(req.body);
  const changed = Object.keys(changes).filter((key) => String(service[key]) !== String(changes[key]));
  service.set(changes);
  await service.save();

  await audit(req, 'service.update', {
    targetType: 'service',
    targetId: service._id,
    summary: `Updated "${service.name}"${changed.length ? ` (${changed.join(', ')})` : ''}`,
  });
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
  await audit(req, 'service.delete', { targetType: 'service', targetId: service._id, summary: `Deleted "${service.name}"` });
  res.json({ message: 'Service deleted.' });
}
