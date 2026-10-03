// Small sessionStorage helpers for the OTP screens. The data survives a page
// refresh but disappears when the tab is closed, and the email is never put
// in the URL.

const PENDING_KEY = 'oas_pending_verification';
const cooldownKey = (purpose, email) => `oas_otp_cooldown:${purpose}:${email.toLowerCase()}`;

function read(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode etc.): the flow still works, it just
    // won't survive a refresh.
  }
}

export const getPendingEmail = () => read(PENDING_KEY) || '';
export const setPendingEmail = (email) => write(PENDING_KEY, email);
export const clearPendingEmail = () => write(PENDING_KEY, null);

// Remembers when the "Resend code" button unlocks (epoch ms).
export function getCooldownUntil(purpose, email) {
  const value = Number(read(cooldownKey(purpose, email)));
  return value > Date.now() ? value : 0;
}

export function startCooldown(purpose, email, seconds) {
  const until = Date.now() + seconds * 1000;
  write(cooldownKey(purpose, email), String(until));
  return until;
}
