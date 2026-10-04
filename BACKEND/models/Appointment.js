import mongoose from 'mongoose';

export const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
// Appointments in these states occupy a staff member's time slot.
export const ACTIVE_STATUSES = ['pending', 'confirmed'];

const appointmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    // Stored as zero-padded strings ("2026-10-05", "09:30") so they compare
    // correctly as text and are free of server timezone issues.
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    endTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    status: { type: String, enum: STATUSES, default: 'pending' },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    // Private notes written by staff/admins. select: false keeps them out of
    // every query unless explicitly requested, so clients never receive them.
    staffNotes: { type: String, trim: true, maxlength: 1000, default: '', select: false },
  },
  { timestamps: true }
);

appointmentSchema.index({ staff: 1, date: 1, status: 1 });
appointmentSchema.index({ user: 1, date: -1 });

appointmentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Appointment', appointmentSchema);
