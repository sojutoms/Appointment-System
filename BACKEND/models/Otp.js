import mongoose from 'mongoose';

export const OTP_PURPOSES = ['verify-email', 'reset-password', 'change-email', 'admin-login', 'staff-invite'];
// Purposes a logged-out user may request via /auth/resend-otp.
export const PUBLIC_OTP_PURPOSES = ['verify-email', 'reset-password'];

// One document per (email, purpose). It holds the current code (hashed) and
// the counters used for resend cooldowns, hourly send limits and wrong-attempt limits.
const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, enum: OTP_PURPOSES, required: true },
    // For 'change-email': the account that asked to move to this address.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    codeHash: { type: String, default: null },
    codeExpiresAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },

    sendCount: { type: Number, default: 0 },
    windowStartedAt: { type: Date, default: null },
    lastSentAt: { type: Date, default: null },

    // Issued after a correct password-reset code; lets the user set a new password once.
    resetTokenHash: { type: String, default: null },
    resetTokenExpiresAt: { type: Date, default: null },

    // MongoDB deletes the document automatically after this time (TTL index).
    purgeAt: { type: Date, required: true },
  },
  { timestamps: true }
);

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });
otpSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Otp', otpSchema);
