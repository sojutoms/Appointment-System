// Reusable express-validator rules. Each export is an array of middleware
// that ends with `validate`, so routes can spread it before the controller.
import { body, param, query } from 'express-validator';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';
import validate from '../middleware/validate.js';
import { STATUSES } from '../models/Appointment.js';
import { ROLES } from '../models/User.js';
import { PUBLIC_OTP_PURPOSES } from '../models/Otp.js';
import { isValidDateString } from '../utils/time.js';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
// Letters (any language) separated by single spaces, hyphens, apostrophes or
// periods, e.g. "Ma. Clara", "O'Neil", "Jean-Luc", "Dela Cruz". No digits or symbols.
const PERSON_NAME = /^[\p{L}\p{M}]+(?:(?:[ '-]|\. ?)[\p{L}\p{M}]+)*\.?$/u;
const NAME_MAX = 30;
// Job titles: words of letters joined by short runs of punctuation, no digits
// ("Dentist", "OB-GYN", "Ear, Nose & Throat", "Dentist (Pediatric)").
const SPECIALIZATION = /^[\p{L}\p{M}]+(?:[ &(),./'-]{1,3}[\p{L}\p{M}]+)*[).]?$/u;
// Service names may include numbers ("60-min Massage") but must contain a letter.
const SERVICE_NAME = /^(?=.*\p{L})[\p{L}\p{M}\d &(),./'+-]+$/u;
const PRICE_MAX = 1_000_000;
const EMAIL_MAX = 64;
const COUNTRIES = new Set(getCountries());

// Collapses repeated spaces so "Juan   Dela  Cruz" is stored as "Juan Dela Cruz".
const squashSpaces = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

const personName = (field, label) =>
  body(field)
    .isString()
    .withMessage(`${label} is required.`)
    .customSanitizer(squashSpaces)
    .notEmpty()
    .withMessage(`${label} is required.`)
    .bail()
    .isLength({ min: 2, max: NAME_MAX })
    .withMessage(`${label} must be 2 to ${NAME_MAX} characters.`)
    .bail()
    .matches(PERSON_NAME)
    .withMessage(`${label} can only contain letters, spaces, hyphens, apostrophes and periods.`);

const firstName = () => personName('firstName', 'First name');
const lastName = () => personName('lastName', 'Last name');

const email = (field = 'email') =>
  body(field)
    .trim()
    .isLength({ max: EMAIL_MAX })
    .withMessage(`Email must be ${EMAIL_MAX} characters or less.`)
    .bail()
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .toLowerCase();

const strongPassword = (field) =>
  body(field)
    .isString()
    .isLength({ min: 8, max: 32 })
    .withMessage('Password must be 8 to 32 characters.')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain a letter.')
    .matches(/\d/)
    .withMessage('Password must contain a number.');

// Phone is optional. When given it must come with the ISO country it was
// entered for (e.g. PH), must be a valid number for that country's calling
// code, and is normalised to E.164 (+639171234567) before it is stored.
const phoneCountry = () =>
  body('phoneCountry')
    .optional({ values: 'falsy' })
    .trim()
    .toUpperCase()
    .custom((v) => COUNTRIES.has(v))
    .withMessage('Please choose a valid country.');

const parsePhone = (value, country) => {
  const parsed = parsePhoneNumberFromString(String(value), country);
  if (!parsed?.isValid()) return null;
  if (parsed.countryCallingCode !== getCountryCallingCode(country)) return null;
  return parsed;
};

const phone = () =>
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Please enter a valid phone number.')
    .bail()
    .custom((value, { req }) => {
      const country = String(req.body.phoneCountry ?? '').toUpperCase();
      if (!COUNTRIES.has(country)) throw new Error('Please choose the country for this phone number.');
      if (!parsePhone(value, country)) throw new Error('Please enter a valid phone number for the selected country.');
      return true;
    })
    .bail()
    .customSanitizer((value, { req }) => parsePhone(value, String(req.body.phoneCountry).toUpperCase()).number);

const dateField = (chain) =>
  chain.custom((v) => isValidDateString(String(v))).withMessage('Date must be a valid YYYY-MM-DD date.');

export const mongoIdParam = [param('id').isMongoId().withMessage('Invalid ID.'), validate];

// ---------- Auth & users ----------

export const registerRules = [firstName(), lastName(), email(), strongPassword('password'), phoneCountry(), phone(), validate];

export const loginRules = [
  email(),
  body('password').isString().notEmpty().withMessage('Password is required.').isLength({ max: 32 }).withMessage('Password must be 32 characters or less.'),
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
  firstName().optional(),
  lastName().optional(),
  phoneCountry(),
  phone(),
  strongPassword('newPassword').optional({ values: 'falsy' }),
  body('currentPassword').optional().isString().isLength({ max: 32 }).withMessage('Password must be 32 characters or less.'),
  validate,
];

export const emailChangeRules = [
  email('newEmail'),
  body('currentPassword').isString().notEmpty().withMessage('Enter your current password.').isLength({ max: 32 }).withMessage('Password must be 32 characters or less.'),
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
  query('search').optional().isString().isLength({ max: 50 }).withMessage('Search is too long.'),
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
  body('staffNotes').optional().isString().trim().isLength({ max: 500 }).withMessage('Staff notes must be 500 characters or less.'),
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
  body('reason').optional().isString().trim().isLength({ max: 100 }).withMessage('Reason must be 100 characters or less.'),
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

export const adminLoginRules = [email(), body('password').isString().notEmpty().withMessage('Password is required.').isLength({ max: 32 }).withMessage('Password must be 32 characters or less.'), validate];

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
    req(
      body('name')
        .customSanitizer(squashSpaces)
        .notEmpty()
        .withMessage('Service name is required.')
        .bail()
        .isLength({ min: 2, max: 50 })
        .withMessage('Service name must be 2 to 50 characters.')
        .bail()
        .matches(SERVICE_NAME)
        .withMessage('Service name must include letters and can only use letters, numbers, spaces and - & ( ) , . / \' +')
    ),
    body('description').optional().trim().isLength({ max: 250 }).withMessage('Description must be 250 characters or less.'),
    req(body('durationMinutes'))
      .isInt({ min: 15, max: 480 })
      .withMessage('Duration must be between 15 and 480 minutes.')
      .toInt(),
    req(body('price'))
      .isFloat({ min: 0, max: PRICE_MAX })
      .withMessage(`Price must be between 0 and ${PRICE_MAX.toLocaleString('en-US')}.`)
      .bail()
      .matches(/^\d+(\.\d{1,2})?$/)
      .withMessage('Price can have at most 2 decimal places.')
      .toFloat(),
    body('isActive').optional().isBoolean().withMessage('isActive must be true or false.').toBoolean(),
  ];
};

export const createServiceRules = [...serviceFields(false), validate];
export const updateServiceRules = [param('id').isMongoId().withMessage('Invalid ID.'), ...serviceFields(true), validate];

// ---------- Staff ----------

const staffFields = (optional) => [
  optional ? firstName().optional() : firstName(),
  optional ? lastName().optional() : lastName(),
  body('specialization')
    .optional({ values: 'falsy' })
    .customSanitizer(squashSpaces)
    .isLength({ max: 50 })
    .withMessage('Specialization must be 50 characters or less.')
    .bail()
    .matches(SPECIALIZATION)
    .withMessage('Specialization can only contain letters, spaces and - & ( ) , . / \''),
  email().optional({ values: 'falsy' }),
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
  body('notes').optional().trim().isLength({ max: 250 }).withMessage('Notes must be 250 characters or less.'),
  validate,
];

export const updateAppointmentRules = [
  param('id').isMongoId().withMessage('Invalid ID.'),
  body('service').optional().isMongoId().withMessage('Invalid service.'),
  body('staff').optional().isMongoId().withMessage('Invalid staff member.'),
  dateField(body('date').optional()),
  body('startTime').optional().matches(TIME).withMessage('Invalid time slot.'),
  body('status').optional().isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}.`),
  body('staffNotes').optional().isString().trim().isLength({ max: 500 }).withMessage('Staff notes must be 500 characters or less.'),
  body('notes').optional().trim().isLength({ max: 250 }).withMessage('Notes must be 250 characters or less.'),
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

// Public list endpoints (services, staff): same paging/search bounds as the rest.
export const publicListRules = [
  ...listQuery(),
  query('service').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid service ID.'),
  query('includeInactive').optional({ values: 'falsy' }).isIn(['true', 'false']).withMessage('Invalid filter.'),
  validate,
];
