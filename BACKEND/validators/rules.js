// Reusable express-validator rules. Each export is an array of middleware
// that ends with `validate`, so routes can spread it before the controller.
import { body, param, query } from 'express-validator';
import validate from '../middleware/validate.js';
import { STATUSES } from '../models/Appointment.js';
import { ROLES } from '../models/User.js';
import { PUBLIC_OTP_PURPOSES } from '../models/Otp.js';
import { isValidDateString } from '../utils/time.js';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE = /^[0-9+\-\s()]{7,20}$/;

const name = (field = 'name', label = 'Name') =>
  body(field).trim().notEmpty().withMessage(`${label} is required.`).isLength({ max: 80 }).withMessage(`${label} is too long.`);

const email = (field = 'email') =>
  body(field).trim().isEmail().withMessage('Please enter a valid email address.').toLowerCase();

const strongPassword = (field) =>
  body(field)
    .isString()
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be 8 to 72 characters.')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain a letter.')
    .matches(/\d/)
    .withMessage('Password must contain a number.');

const phone = () =>
  body('phone').optional({ values: 'falsy' }).trim().matches(PHONE).withMessage('Please enter a valid phone number.');

const dateField = (chain) =>
  chain.custom((v) => isValidDateString(String(v))).withMessage('Date must be a valid YYYY-MM-DD date.');

export const mongoIdParam = [param('id').isMongoId().withMessage('Invalid ID.'), validate];

// ---------- Auth & users ----------

export const registerRules = [name(), email(), strongPassword('password'), phone(), validate];

export const loginRules = [
  email(),
  body('password').isString().notEmpty().withMessage('Password is required.'),
  validate,
];

const otpCode = () =>
  body('otp').trim().matches(/^\d{6}$/).withMessage('Enter the 6-digit code from your email.');

export const verifyEmailRules = [email(), otpCode(), validate];

export const resendOtpRules = [
  email(),
  body('purpose').isIn(PUBLIC_OTP_PURPOSES).withMessage('Invalid code type.'),
  validate,
];

export const forgotPasswordRules = [email(), validate];

export const verifyResetOtpRules = [email(), otpCode(), validate];

export const resetPasswordRules = [
  email(),
  body('resetToken').isString().matches(/^[a-f0-9]{64}$/).withMessage('Your reset session is invalid. Please start again.'),
  strongPassword('password'),
  validate,
];

export const updateProfileRules = [
  name().optional(),
  phone(),
  strongPassword('newPassword').optional({ values: 'falsy' }),
  body('currentPassword').optional().isString(),
  validate,
];

export const emailChangeRules = [
  email('newEmail'),
  body('currentPassword').isString().notEmpty().withMessage('Enter your current password.'),
  validate,
];

export const emailChangeVerifyRules = [email('newEmail'), otpCode(), validate];

export const emailChangeResendRules = [email('newEmail'), validate];

export const roleRules = [
  param('id').isMongoId().withMessage('Invalid ID.'),
  // Staff accounts are managed from the Staff page (invite / revoke), not by role changes.
  body('role').isIn(['client', 'admin']).withMessage('Role must be client or admin.'),
  validate,
];

// Shared by list endpoints: page/limit must be sensible numbers, search bounded.
const listQuery = () => [
  query('page').optional().isInt({ min: 1, max: 10000 }).withMessage('Invalid page.'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1 to 50.'),
  query('search').optional().isString().isLength({ max: 100 }).withMessage('Search is too long.'),
];

export const staffActivateRules = [email(), otpCode(), strongPassword('password'), validate];

// ---------- Staff portal & time off ----------

const STATUS_FILTERS = [...STATUSES, 'active'];

export const staffDayRules = [dateField(query('date').optional({ values: 'falsy' })), validate];

export const staffListRules = [
  ...listQuery(),
  query('status').optional({ values: 'falsy' }).isIn(STATUS_FILTERS).withMessage('Invalid status.'),
  dateField(query('from').optional({ values: 'falsy' })),
  dateField(query('to').optional({ values: 'falsy' })),
  query('scope').optional({ values: 'falsy' }).isIn(['upcoming', 'past']).withMessage('Invalid scope.'),
  validate,
];

export const staffAppointmentUpdateRules = [
  param('id').isMongoId().withMessage('Invalid ID.'),
  body('status').optional().isIn(['confirmed', 'completed']).withMessage('Staff can confirm or complete appointments.'),
  body('staffNotes').optional().isString().trim().isLength({ max: 1000 }).withMessage('Staff notes must be 1000 characters or less.'),
  validate,
];

export const listTimeOffRules = [
  ...listQuery(),
  query('staff').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid staff ID.'),
  dateField(query('from').optional({ values: 'falsy' })),
  dateField(query('to').optional({ values: 'falsy' })),
  validate,
];

export const createTimeOffRules = [
  body('staff').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid staff member.'),
  dateField(body('date')),
  body('allDay').optional().isBoolean().withMessage('allDay must be true or false.').toBoolean(),
  body('startTime').optional({ values: 'falsy' }).matches(TIME).withMessage('Start time must be HH:MM.'),
  body('endTime').optional({ values: 'falsy' }).matches(TIME).withMessage('End time must be HH:MM.'),
  body('reason').optional().isString().trim().isLength({ max: 200 }).withMessage('Reason must be 200 characters or less.'),
  validate,
];

export const unavailableRules = [
  param('id').isMongoId().withMessage('Invalid ID.'),
  dateField(query('from').optional({ values: 'falsy' })),
  dateField(query('to').optional({ values: 'falsy' })),
  validate,
];

export const listUsersRules = [
  ...listQuery(),
  query('role').optional({ values: 'falsy' }).isIn(ROLES).withMessage('Invalid role.'),
  query('verified').optional({ values: 'falsy' }).isIn(['true', 'false']).withMessage('Invalid filter.'),
  validate,
];

// ---------- Admin auth ----------

export const adminLoginRules = [email(), body('password').isString().notEmpty().withMessage('Password is required.'), validate];

const challengeToken = () =>
  body('challengeToken').isString().isLength({ min: 20, max: 1000 }).withMessage('Your login session expired. Please start again.');

export const adminVerifyRules = [challengeToken(), otpCode(), validate];
export const adminResendRules = [challengeToken(), validate];

export const auditLogRules = [
  ...listQuery(),
  query('action').optional({ values: 'falsy' }).isString().matches(/^[a-z_.]{1,50}$/).withMessage('Invalid action filter.'),
  query('success').optional({ values: 'falsy' }).isIn(['true', 'false']).withMessage('Invalid filter.'),
  validate,
];

// ---------- Services ----------

const serviceFields = (optional) => {
  const req = (chain) => (optional ? chain.optional() : chain);
  return [
    req(body('name').trim().notEmpty().withMessage('Service name is required.').isLength({ max: 100 })),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description is too long.'),
    req(body('durationMinutes'))
      .isInt({ min: 15, max: 480 })
      .withMessage('Duration must be between 15 and 480 minutes.')
      .toInt(),
    req(body('price')).isFloat({ min: 0 }).withMessage('Price must be 0 or more.').toFloat(),
    body('isActive').optional().isBoolean().withMessage('isActive must be true or false.').toBoolean(),
  ];
};

export const createServiceRules = [...serviceFields(false), validate];
export const updateServiceRules = [param('id').isMongoId().withMessage('Invalid ID.'), ...serviceFields(true), validate];

// ---------- Staff ----------

const staffFields = (optional) => [
  optional ? name().optional() : name(),
  body('specialization').optional().trim().isLength({ max: 100 }),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Please enter a valid email address.'),
  body('services').optional().isArray().withMessage('Services must be a list.'),
  body('services.*').isMongoId().withMessage('Invalid service ID.'),
  body('workingDays').optional().isArray({ min: 1 }).withMessage('Select at least one working day.'),
  body('workingDays.*').isInt({ min: 0, max: 6 }).withMessage('Working days must be 0 (Sun) to 6 (Sat).').toInt(),
  body('startTime').optional().matches(TIME).withMessage('Start time must be HH:MM (24-hour).'),
  body('endTime').optional().matches(TIME).withMessage('End time must be HH:MM (24-hour).'),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const createStaffRules = [...staffFields(false), validate];
export const updateStaffRules = [param('id').isMongoId().withMessage('Invalid ID.'), ...staffFields(true), validate];

// ---------- Appointments ----------

export const createAppointmentRules = [
  body('service').isMongoId().withMessage('Please choose a service.'),
  body('staff').isMongoId().withMessage('Please choose a staff member.'),
  dateField(body('date')),
  body('startTime').matches(TIME).withMessage('Please choose a time slot.'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be 500 characters or less.'),
  validate,
];

export const updateAppointmentRules = [
  param('id').isMongoId().withMessage('Invalid ID.'),
  body('service').optional().isMongoId().withMessage('Invalid service.'),
  body('staff').optional().isMongoId().withMessage('Invalid staff member.'),
  dateField(body('date').optional()),
  body('startTime').optional().matches(TIME).withMessage('Invalid time slot.'),
  body('status').optional().isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}.`),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be 500 characters or less.'),
  validate,
];

export const availableSlotsRules = [
  query('service').isMongoId().withMessage('Please choose a service.'),
  query('staff').isMongoId().withMessage('Please choose a staff member.'),
  dateField(query('date')),
  query('exclude').optional().isMongoId().withMessage('Invalid appointment ID.'),
  validate,
];

export const listAppointmentsRules = [
  ...listQuery(),
  query('user').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid user ID.'),
  query('staff').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid staff ID.'),
  query('service').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid service ID.'),
  dateField(query('from').optional({ values: 'falsy' })),
  dateField(query('to').optional({ values: 'falsy' })),
  query('scope').optional({ values: 'falsy' }).isIn(['upcoming', 'past']).withMessage('Invalid scope.'),
  query('sort').optional({ values: 'falsy' }).isIn(['asc', 'desc']).withMessage('Invalid sort.'),
  validate,
];
