import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { adminLogin, adminLogout, adminMe, adminResend, adminVerify } from '../controllers/adminAuthController.js';
import { listAuditLogs } from '../controllers/auditController.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { adminLoginRules, adminResendRules, adminVerifyRules, auditLogRules } from '../validators/rules.js';

const router = Router();

// Stricter per-IP limits than the client app: admin sign-in is a prime target.
const limiter = (limit, message, skipSuccessfulRequests = false) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: { message },
  });

const loginLimiter = limiter(5, 'Too many sign-in attempts. Please try again in 15 minutes.', true);
const codeLimiter = limiter(10, 'Too many attempts. Please try again in 15 minutes.');

router.post('/auth/login', loginLimiter, adminLoginRules, adminLogin);
router.post('/auth/verify', codeLimiter, adminVerifyRules, adminVerify);
router.post('/auth/resend', codeLimiter, adminResendRules, adminResend);

// Everything below needs an admin-panel session.
router.use(protect, requireAdmin);
router.get('/auth/me', adminMe);
router.post('/auth/logout', adminLogout);
router.get('/audit-logs', auditLogRules, listAuditLogs);

export default router;
