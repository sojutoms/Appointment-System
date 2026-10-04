import mongoose from 'mongoose';

// Admin-panel tokens that were signed out before they expired. A signed-out
// token is refused even though its signature and expiry are still valid.
// MongoDB deletes each entry once the token would have expired anyway (TTL).
const revokedTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('RevokedToken', revokedTokenSchema);
