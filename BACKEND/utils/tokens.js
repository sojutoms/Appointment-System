import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// Token scopes. A token only grants what its scope allows:
//   'user'      - the client app (book, manage own appointments, profile)
//   'staff'     - the staff portal (own schedule, own clients, time off)
//   'admin'     - the admin panel (admin role required, short-lived)
//   'admin-2fa' - the step between an admin's password and their emailed code;
//                 it can only be exchanged for an 'admin' token, nothing else.
export const SCOPES = { USER: 'user', STAFF: 'staff', ADMIN: 'admin', ADMIN_2FA: 'admin-2fa' };

const EXPIRY = {
  [SCOPES.USER]: () => config.jwtExpiresIn,
  [SCOPES.STAFF]: () => config.staffJwtExpiresIn,
  [SCOPES.ADMIN]: () => config.adminJwtExpiresIn,
  [SCOPES.ADMIN_2FA]: () => '10m',
};

// The session type a normal (non-admin-panel) login gets for each role.
export const scopeForRole = (role) => (role === 'staff' ? SCOPES.STAFF : SCOPES.USER);

// `v` (tokenVersion) lets the server revoke every token for a user at once.
export function signToken(user, scope = SCOPES.USER) {
  // jti: a unique id per token, so a single admin session can be revoked on sign-out.
  return jwt.sign({ id: user._id, role: user.role, v: user.tokenVersion ?? 0, scope }, config.jwtSecret, {
    expiresIn: EXPIRY[scope](),
    jwtid: crypto.randomUUID(),
  });
}

// Returns the payload, or null if the token is invalid/expired.
export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}
