import mongoose from 'mongoose';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const staffSchema = new mongoose.Schema(
  {
    // `name` is the combined display name, kept in sync with first/last below.
    firstName: { type: String, trim: true, maxlength: 30 },
    lastName: { type: String, trim: true, maxlength: 30 },
    name: { type: String, required: true, trim: true, maxlength: 61 },
    specialization: { type: String, trim: true, maxlength: 50, default: '' },
    email: { type: String, trim: true, lowercase: true, maxlength: 64, default: '' },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    // 0 = Sunday ... 6 = Saturday
    workingDays: {
      type: [{ type: Number, min: 0, max: 6 }],
      default: [1, 2, 3, 4, 5],
    },
    startTime: { type: String, match: TIME_PATTERN, default: '09:00' },
    endTime: { type: String, match: TIME_PATTERN, default: '17:00' },
    isActive: { type: Boolean, default: true },
    // Login account for the staff portal (created when an admin sends an invite).
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

staffSchema.pre('validate', function syncName() {
  if (this.isModified('firstName') || this.isModified('lastName')) {
    this.name = [this.firstName, this.lastName].filter(Boolean).join(' ');
  }
});

staffSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } });

staffSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Staff', staffSchema);
