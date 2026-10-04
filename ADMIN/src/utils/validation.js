// Client-side validation that mirrors the backend rules (BACKEND/validators/rules.js)
// so admins get instant feedback; the server still validates everything.

// Close to the server's isEmail(): no leading/trailing or double dots before
// the @, letters/digits/hyphens in the domain, and a top-level domain of 2+ letters.
const EMAIL = /^(?!\.)(?!.*\.\.)[^\s@]*[^\s@.]@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
// Letters separated by single spaces, hyphens, apostrophes or periods
// ("Ma. Clara", "O'Neil", "Jean-Luc", "Dela Cruz"). No digits or symbols.
const PERSON_NAME = /^[\p{L}\p{M}]+(?:(?:[ '-]|\. ?)[\p{L}\p{M}]+)*\.?$/u;
const NOT_NAME_CHAR = /[^\p{L}\p{M} '.-]/gu;
const SPECIALIZATION = /^[\p{L}\p{M}]+(?:[ &(),./'-]{1,3}[\p{L}\p{M}]+)*[).]?$/u;
const NOT_SPECIALIZATION_CHAR = /[^\p{L}\p{M} &(),./'-]/gu;
const SERVICE_NAME = /^(?=.*\p{L})[\p{L}\p{M}\d &(),./'+-]+$/u;

export const LIMITS = {
  name: 30,
  email: 64,
  specialization: 50,
  serviceName: 50,
  description: 250,
  reason: 100,
  priceMax: 1_000_000,
};

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

// Specializations must start with a letter, and no symbol may be typed twice
// in a row ("OB-GYN", "Ear, Nose & Throat" are fine; "A----" is not).
export function cleanSpecializationInput(value) {
  let out = '';
  for (const ch of value.replace(NOT_SPECIALIZATION_CHAR, '')) {
    const prev = out.at(-1);
    if (LETTER.test(ch)) out += ch;
    else if (prev && ch !== prev) out += ch;
  }
  return out.slice(0, LIMITS.specialization);
}

export function validatePersonName(value, label) {
  const name = value.replace(/\s+/g, ' ').trim();
  if (!name) return `${label} is required.`;
  if (name.length < 2 || name.length > LIMITS.name) return `${label} must be 2 to ${LIMITS.name} characters.`;
  if (!PERSON_NAME.test(name)) return `${label} can only contain letters, spaces, hyphens, apostrophes and periods.`;
  return '';
}

export function validateSpecialization(value) {
  const text = value.trim();
  if (!text) return '';
  if (text.length > LIMITS.specialization) return `Specialization must be ${LIMITS.specialization} characters or less.`;
  if (!SPECIALIZATION.test(text)) return "Specialization can only contain letters, spaces and - & ( ) , . / '";
  return '';
}

export function validateEmail(value, { required = true } = {}) {
  const email = value.trim();
  if (!email) return required ? 'Email is required.' : '';
  if (email.length > LIMITS.email) return `Email must be ${LIMITS.email} characters or less.`;
  if (!EMAIL.test(email)) return 'Enter a valid email address.';
  return '';
}

export function validateServiceName(value) {
  const name = value.replace(/\s+/g, ' ').trim();
  if (!name) return 'Name is required.';
  if (name.length < 2 || name.length > LIMITS.serviceName) return `Name must be 2 to ${LIMITS.serviceName} characters.`;
  if (!SERVICE_NAME.test(name)) return "Name must include letters and can only use letters, numbers, spaces and - & ( ) , . / ' +";
  return '';
}

export function validatePrice(value) {
  if (value === '' || value === null || value === undefined) return 'Enter a price.';
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) return 'Enter a price of 0 or more, with at most 2 decimal places.';
  if (Number(value) > LIMITS.priceMax) return `Price can't be more than ${LIMITS.priceMax.toLocaleString('en-US')}.`;
  return '';
}

// Staff records created before first/last names were split only have `name`.
export function splitName(record) {
  if (!record) return { firstName: '', lastName: '' };
  if (record.firstName || record.lastName) return { firstName: record.firstName ?? '', lastName: record.lastName ?? '' };
  const parts = (record.name ?? '').trim().split(/\s+/);
  if (parts.length < 2) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) };
}
