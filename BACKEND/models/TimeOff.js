import mongoose from 'mongoose';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// A period when a staff member can't take appointments (leave, training, ...).
// Clients can't book into it; the reason is only visible to staff and admins.
const timeOffSchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    allDay: { type: Boolean, default: true },
    // For all-day entries these cover the whole day.
    startTime: { type: String, match: TIME, default: '00:00' },
    endTime: { type: String, match: /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, default: '24:00' },
    reason: { type: String, trim: true, maxlength: 100, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

timeOffSchema.index({ staff: 1, date: 1 });

timeOffSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('TimeOff', timeOffSchema);
