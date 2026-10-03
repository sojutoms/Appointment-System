// Client-side validation. These mirror the backend rules so users get instant
// feedback; the server still validates everything.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+\-\s()]{7,20}$/;

export function validateEmail(email) {
  if (!email.trim()) return 'Email is required.';
  if (!EMAIL.test(email.trim())) return 'Please enter a valid email address.';
  return '';
}

export function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length < 8 || password.length > 72) return 'Password must be 8 to 72 characters.';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain a letter.';
  if (!/\d/.test(password)) return 'Password must contain a number.';
  return '';
}

export function validateLogin({ email, password }) {
  const errors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Password is required.';
  return errors;
}

export function validateRegister({ name, email, phone, password, confirmPassword }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Name is required.';
  else if (name.trim().length > 80) errors.name = 'Name is too long.';

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  if (phone.trim() && !PHONE.test(phone.trim())) errors.phone = 'Please enter a valid phone number.';

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
