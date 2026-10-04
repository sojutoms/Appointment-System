import mongoose from 'mongoose';

// Append-only record of security-relevant events: admin logins and every
// change an admin makes. There is no API to edit or delete entries.
const auditLogSchema = new mongoose.Schema(
  {
    // Null for events without a logged-in actor (e.g. a failed login).
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorEmail: { type: String, default: '' }, // kept even if the actor is later deleted
    action: { type: String, required: true }, // e.g. 'service.update'
    targetType: { type: String, default: '' }, // 'service', 'staff', 'user', 'appointment', 'auth'
    targetId: { type: String, default: '' },
    summary: { type: String, default: '', maxlength: 300 },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '', maxlength: 300 },
    success: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

auditLogSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('AuditLog', auditLogSchema);
