import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

function readToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

async function userFromToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new ApiError(401, 'Session expired or invalid. Please log in again.');
  }
  // Re-load the user so deleted accounts and role changes take effect immediately.
  const user = await User.findById(payload.id).select('+tokenVersion');
  if (!user) throw new ApiError(401, 'Account no longer exists.');
  if ((payload.v ?? 0) !== user.tokenVersion) {
    throw new ApiError(401, 'Your password was changed. Please log in again.');
  }
  if (!user.isVerified) throw new ApiError(403, 'Please verify your email first.', undefined, { code: 'EMAIL_NOT_VERIFIED' });
  return user;
}

// Requires a valid JWT; attaches the user to req.user.
export async function protect(req, _res, next) {
  const token = readToken(req);
  if (!token) throw new ApiError(401, 'Not authorized. Please log in.');
  req.user = await userFromToken(token);
  next();
}

// Attaches req.user when a valid token is present, but never rejects.
// Used on public endpoints that show extra data to admins.
export async function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      req.user = await userFromToken(token);
    } catch {
      req.user = undefined;
    }
  }
  next();
}

// Restricts a route to the given roles. Must run after `protect`.
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to perform this action.');
    }
    next();
  };
}
