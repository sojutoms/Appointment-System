import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// 'staff' accounts are created only through a staff invite from the admin panel.
export const ROLES = ['client', 'admin', 'staff'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
    },
    // select: false keeps the hash out of every query unless explicitly requested.
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    role: { type: String, enum: ROLES, default: 'client' },
    // Self-registered accounts start unverified (set explicitly in register) and
    // must confirm an emailed OTP. Defaults to true so accounts created by the
    // seed script or before this field existed keep working.
    isVerified: { type: Boolean, default: true },
    // Copied into every JWT and bumped on each password change; tokens carrying
    // an older value are rejected (see middleware/auth.js), so changing or
    // resetting a password logs out every other session.
    tokenVersion: { type: Number, default: 0, select: false },
    // Brute-force protection: too many wrong passwords locks the account briefly.
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, default: null, select: false },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (this.isNew) return;
  // Guard against silently resetting the counter when the field wasn't loaded.
  if (!this.isSelected('tokenVersion')) {
    throw new Error("Load the user with .select('+tokenVersion') before changing the password.");
  }
  this.tokenVersion = (this.tokenVersion ?? 0) + 1;
});

userSchema.methods.matchPassword = function matchPassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Never leak the password hash, even if it was selected.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.tokenVersion;
    delete ret.failedLoginAttempts;
    delete ret.lockUntil;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
