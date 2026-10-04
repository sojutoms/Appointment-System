import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Failed logins per IP address AND account: 5 per 15 minutes. Someone guessing
// another person's password is stopped here long before the account-wide lock
// (utils/credentials.js) triggers, so they can't lock the real owner out.
// Successful logins don't count.
export const accountLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${String(req.body?.email ?? '').trim().toLowerCase()}`,
  message: { message: 'Too many failed attempts for this account. Please try again in 15 minutes or reset your password.' },
});
