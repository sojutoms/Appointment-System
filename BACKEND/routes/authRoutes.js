import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { accountLoginLimiter } from '../middleware/loginLimiter.js';
import {
  activateStaff,
  forgotPassword,
  login,
  me,
  register,
  resendOtp,
  resendStaffInvite,
  resetPassword,
  verifyEmail,
  verifyResetOtp,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import {
  forgotPasswordRules,
  loginRules,
  registerRules,
  resendOtpRules,
  resetPasswordRules,
  staffActivateRules,
  verifyEmailRules,
  verifyResetOtpRules,
} from '../validators/rules.js';

const router = Router();

const limiter = (limit, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message },
  });

// Per-IP limits (per-email OTP limits live in utils/otp.js).
// Login: 10 failed attempts per 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});
// Anything that sends an email: 10 per 15 minutes.
const emailLimiter = limiter(10, 'Too many requests. Please try again in 15 minutes.');
// Code checks: 20 per 15 minutes (each code also allows only 5 wrong tries).
const verifyLimiter = limiter(20, 'Too many attempts. Please try again in 15 minutes.');

router.post('/register', emailLimiter, registerRules, register);
router.post('/verify-email', verifyLimiter, verifyEmailRules, verifyEmail);
router.post('/resend-otp', emailLimiter, resendOtpRules, resendOtp);
router.post('/login', loginLimiter, accountLoginLimiter, loginRules, login);

router.post('/forgot-password', emailLimiter, forgotPasswordRules, forgotPassword);
router.post('/verify-reset-otp', verifyLimiter, verifyResetOtpRules, verifyResetOtp);
router.post('/reset-password', verifyLimiter, resetPasswordRules, resetPassword);

// Staff accounts: set a password with the code from the admin's invite.
router.post('/staff/activate', verifyLimiter, staffActivateRules, activateStaff);
router.post('/staff/resend', emailLimiter, forgotPasswordRules, resendStaffInvite);

router.get('/me', protect, me);

export default router;
