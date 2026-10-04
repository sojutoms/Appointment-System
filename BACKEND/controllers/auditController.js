import AuditLog from '../models/AuditLog.js';
import { getPagination, paginated, searchRegex } from '../utils/query.js';

// GET /api/admin/audit-logs?search=&action=&success=&page=&limit=  (admin, read-only)
export async function listAuditLogs(req, res) {
  const pageInfo = getPagination(req.query);
  const filter = {};

  if (req.query.action) filter.action = new RegExp(`^${req.query.action.replace(/\./g, '\\.')}`);
  if (req.query.success === 'true') filter.success = true;
  if (req.query.success === 'false') filter.success = false;
  const regex = searchRegex(req.query.search);
  if (regex) filter.$or = [{ actorEmail: regex }, { summary: regex }, { ip: regex }];

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(pageInfo.skip).limit(pageInfo.limit),
    AuditLog.countDocuments(filter),
  ]);
  res.json(paginated(items, total, pageInfo));
}
