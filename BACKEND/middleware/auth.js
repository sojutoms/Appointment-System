import RevokedToken from '../models/RevokedToken.js';
import Staff from '../models/Staff.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { audit } from '../utils/audit.js';
import { confirmCurrentPassword } from '../utils/credentials.js';
import { SCOPES, verifyToken } from '../utils/tokens.js';

function readToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

// Resolves a session token to { user, scope }. `allowedScopes` limits which kinds
// of token are accepted (the 2FA step token is never accepted here).
async function sessionFromToken(token, allowedScopes = [SCOPES.USER, SCOPES.STAFF, SCOPES.ADMIN]) {
  const payload = verifyToken(token);
  const scope = payload?.scope ?? SCOPES.USER; // tokens issued before scopes existed
  if (!payload || !allowedScopes.includes(scope)) {
    throw new ApiError(401, 'Session expired or invalid. Please log in again.');
  }

  // Admin sessions that were signed out stay dead even though the token hasn't expired.
  if (scope === SCOPES.ADMIN && (!payload.jti || (await RevokedToken.exists({ jti: payload.jti })))) {
    throw new ApiError(401, 'You have signed out. Please sign in again.');
  }

  // Re-load the user so deleted accounts and role changes take effect immediately.
  const user = await User.findById(payload.id).select('+tokenVersion');
  if (!user) throw new ApiError(401, 'Account no longer exists.');
  if ((payload.v ?? 0) !== user.tokenVersion) {
    throw new ApiError(401, 'Your session has ended. Please log in again.');
  }
  if (!user.isVerified) throw new ApiError(403, 'Please verify your email first.', undefined, { code: 'EMAIL_NOT_VERIFIED' });
  // An admin token is only valid while the account is still an admin.
  if (scope === SCOPES.ADMIN && user.role !== 'admin') {
    throw new ApiError(401, 'Your admin access was removed. Please log in again.');
  }
  // Staff accounts only ever hold staff tokens, and staff tokens only staff accounts.
  if ((scope === SCOPES.STAFF) !== (user.role === 'staff')) {
    throw new ApiError(401, 'Session expired or invalid. Please log in again.');
  }
  return { user, scope, payload };
}

// Requires a valid session token; sets req.user and req.scope.
export async function protect(req, _res, next) {
  const token = readToken(req);
  if (!token) throw new ApiError(401, 'Not authorized. Please log in.');
  const { user, scope, payload } = await sessionFromToken(token);
  req.user = user;
  req.scope = scope;
  req.tokenPayload = payload;
  next();
}

// Attaches req.user when a valid token is present, but never rejects.
// Used on public endpoints that show extra data to admins.
export async function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      const { user, scope } = await sessionFromToken(token);
      req.user = user;
      req.scope = scope;
    } catch {
      req.user = undefined;
    }
  }
  next();
}

// Limits a route to certain kinds of session, e.g. requireScope('user') for
// booking (staff and admin-panel sessions can't book as a client).
export function requireScope(...scopes) {
  return (req, _res, next) => {
    if (!scopes.includes(req.scope)) {
      throw new ApiError(403, 'This action is not available for your account type.');
    }
    next();
  };
}

// Staff portal routes: requires a staff session linked to a staff record,
// which is attached as req.staff. Every staff query is filtered by it.
export async function requireStaff(req, _res, next) {
  if (req.scope !== SCOPES.STAFF) {
    throw new ApiError(403, 'This area is only for staff members.');
  }
  const staff = await Staff.findOne({ user: req.user._id });
  if (!staff) throw new ApiError(401, 'Your staff access was removed. Please contact an administrator.');
  // A deactivated staff member also loses the portal (it shows client contact details).
  if (!staff.isActive) throw new ApiError(401, 'Your staff profile is inactive. Please contact an administrator.');
  req.staff = staff;
  next();
}

// True only for requests from the admin panel by a current admin.
// An admin who is logged into the client app is treated as a normal client.
export const isAdminRequest = (req) => req.user?.role === 'admin' && req.scope === SCOPES.ADMIN;

// Restricts a route to admin-panel sessions. Must run after `protect`.
export function requireAdmin(req, _res, next) {
  if (!isAdminRequest(req)) {
    throw new ApiError(403, 'You do not have permission to perform this action.');
  }
  next();
}

// Step-up authentication for dangerous actions: the admin must re-enter their
// password (sent as `confirmPassword`) even though they are logged in.
export async function requirePasswordConfirmation(req, _res, next) {
  const password = req.body?.confirmPassword;
  if (typeof password !== 'string' || !password) {
    throw new ApiError(400, 'Please confirm your password to continue.', undefined, { code: 'PASSWORD_CONFIRMATION_REQUIRED' });
  }
  // Wrong passwords count toward the account lockout (see confirmCurrentPassword).
  if (!(await confirmCurrentPassword(req.user._id, password))) {
    await audit(req, 'auth.step_up_failed', {
      targetType: 'auth',
      targetId: req.params.id ?? '',
      summary: `Wrong password when confirming ${req.method} ${req.originalUrl}`,
      success: false,
    });
    throw new ApiError(403, 'Password is incorrect.', undefined, { code: 'PASSWORD_CONFIRMATION_FAILED' });
  }
  next();
}
