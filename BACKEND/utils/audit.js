import AuditLog from '../models/AuditLog.js';

/**
 * Records an audit event. Never throws: a logging failure must not break the
 * action itself, so errors are only printed.
 *   audit(req, 'service.update', { targetType: 'service', targetId: id, summary: 'Renamed X to Y' })
 */
export async function audit(req, action, { targetType = '', targetId = '', summary = '', success = true, actor } = {}) {
  const who = actor ?? req.user;
  try {
    await AuditLog.create({
      actor: who?._id ?? null,
      actorEmail: who?.email ?? '',
      action,
      targetType,
      targetId: targetId ? String(targetId) : '',
      summary: String(summary).slice(0, 300),
      ip: req.ip ?? '',
      userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300),
      success,
    });
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}
