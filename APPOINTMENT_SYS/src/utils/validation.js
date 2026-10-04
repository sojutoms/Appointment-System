// Client-side validation. These mirror the backend rules so users get instant
// feedback; the server still validates everything.
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Close to the server's isEmail(): no leading/trailing or double dots before
// the @, letters/digits/hyphens in the domain, and a top-level domain of 2+ letters.
const EMAIL = /^(?!\.)(?!.*\.\.)[^\s@]*[^\s@.]@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
// Letters separated by single spaces, hyphens, apostrophes or periods
// ("Ma. Clara", "O'Neil", "Jean-Luc", "Dela Cruz"). No digits or symbols.
const PERSON_NAME = /^[\p{L}\p{M}]+(?:(?:[ '-]|\. ?)[\p{L}\p{M}]+)*\.?$/u;
// Characters that can never appear in a name, stripped while typing.
const NOT_NAME_CHAR = /[^\p{L}\p{M} '.-]/gu;

// Input length limits, shared by forms (maxLength) and the checks below.
export const LIMITS = {
  name: 30,
  email: 64,
  password: 32,
  phoneDigits: 15,
  notes: 250,
  staffNotes: 500,
  reason: 100,
  search: 50,
};

export const DEFAULT_PHONE_COUNTRY = 'PH';

const LETTER = /[\p{L}\p{M}]/u;

// For onChange handlers: keeps the name in a valid shape while typing. It must
// start with a letter, and - ' . may only follow a letter, so "----...." or
// "Juan--" can't be typed. A space may follow a letter or a period ("Ma. Clara").
export function cleanNameInput(value) {
  let out = '';
  for (const ch of value.replace(NOT_NAME_CHAR, '')) {
    const prev = out.at(-1);
    if (LETTER.test(ch)) out += ch;
    else if (ch === ' ') {
      if (prev && (LETTER.test(prev) || prev === '.')) out += ch;
    } else if (prev && LETTER.test(prev)) out += ch;
  }
  return out.slice(0, LIMITS.name);
}

export function validatePersonName(value, label) {
  const name = value.replace(/\s+/g, ' ').trim();
  if (!name) return `${label} is required.`;
  if (name.length < 2 || name.length > LIMITS.name) return `${label} must be 2 to ${LIMITS.name} characters.`;
  if (!PERSON_NAME.test(name)) return `${label} can only contain letters, spaces, hyphens, apostrophes and periods.`;
  return '';
}

export function validateEmail(email) {
  if (!email.trim()) return 'Email is required.';
  if (email.trim().length > LIMITS.email) return `Email must be ${LIMITS.email} characters or less.`;
  if (!EMAIL.test(email.trim())) return 'Please enter a valid email address.';
  return '';
}

export function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length < 8 || password.length > LIMITS.password) return `Password must be 8 to ${LIMITS.password} characters.`;
  if (!/[A-Za-z]/.test(password)) return 'Password must contain a letter.';
  if (!/\d/.test(password)) return 'Password must contain a number.';
  return '';
}

// `number` is the national number typed by the user (digits only); the country
// code comes from the selected country. Empty is allowed (phone is optional).
export function validatePhone(number, country) {
  if (!number) return '';
  if (!country) return 'Please choose a country.';
  const parsed = parsePhoneNumberFromString(number, country);
  if (!parsed?.isValid()) return 'Please enter a valid phone number for the selected country.';
  return '';
}

// "+639171234567" for the API, or '' when no number was entered.
export function toE164(number, country) {
  if (!number) return '';
  return parsePhoneNumberFromString(number, country)?.number ?? '';
}

// Splits a stored phone back into { country, number } for editing.
export function splitPhone(phone, country) {
  if (!phone) return { country: country || DEFAULT_PHONE_COUNTRY, number: '' };
  const parsed = parsePhoneNumberFromString(phone, country || DEFAULT_PHONE_COUNTRY);
  if (!parsed) return { country: country || DEFAULT_PHONE_COUNTRY, number: phone.replace(/\D/g, '') };
  return { country: country || parsed.country || DEFAULT_PHONE_COUNTRY, number: parsed.nationalNumber };
}

// Accounts created before first/last names were split only have `name`.
export function splitName(user) {
  if (user.firstName || user.lastName) return { firstName: user.firstName ?? '', lastName: user.lastName ?? '' };
  const parts = (user.name ?? '').trim().split(/\s+/);
  if (parts.length < 2) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) };
}

export function validateLogin({ email, password }) {
  const errors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Password is required.';
  else if (password.length > LIMITS.password) errors.password = `Password must be ${LIMITS.password} characters or less.`;
  return errors;
}

export function validateRegister({ firstName, lastName, email, phone, phoneCountry, password, confirmPassword }) {
  const errors = {};
  const firstNameError = validatePersonName(firstName, 'First name');
  if (firstNameError) errors.firstName = firstNameError;
  const lastNameError = validatePersonName(lastName, 'Last name');
  if (lastNameError) errors.lastName = lastNameError;

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  const phoneError = validatePhone(phone, phoneCountry);
  if (phoneError) errors.phone = phoneError;

  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;

  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.';

  return errors;
}

// 0-4 score used by the password strength meter on the sign-up form.
export function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}
