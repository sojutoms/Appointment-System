// Display helpers. Dates from the API are "YYYY-MM-DD" strings and times are
// "HH:MM" (24-hour), both in the business's local time.
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// The clinic's time zone (keep in sync with the server's APP_TIMEZONE).
// "Today" and "has it started" follow the clinic's clock, not the viewer's,
// so someone browsing from another time zone sees the same rules the server applies.
export const BUSINESS_TIMEZONE = import.meta.env.VITE_BUSINESS_TIMEZONE || 'Asia/Manila';
const businessClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// { date: 'YYYY-MM-DD', minutes: minutes since midnight } in the clinic's time zone.
export function nowInBusinessTz() {
  const parts = Object.fromEntries(businessClock.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export const todayString = () => nowInBusinessTz().date;

export function addDays(dateStr, days) {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

export function formatDate(dateStr, options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!dateStr) return '';
  return parseDate(dateStr).toLocaleDateString('en-US', options);
}

export function formatTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export const formatTimeRange = (start, end) => `${formatTime(start)} – ${formatTime(end)}`;

// "Today", "Tomorrow" or a short date.
export function relativeDay(dateStr) {
  const today = todayString();
  if (dateStr === today) return 'Today';
  if (dateStr === addDays(today, 1)) return 'Tomorrow';
  return formatDate(dateStr, { weekday: 'short', month: 'short', day: 'numeric' });
}

// Whole prices without decimals (₱500); others with exactly two (₱99.90).
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
const pesoCents = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function formatPrice(amount) {
  const value = amount ?? 0;
  return (Number.isInteger(value) ? peso : pesoCents).format(value);
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

// [1,2,3,4,5] -> "Mon – Fri"; [1,3,5] -> "Mon, Wed, Fri"
export function formatWorkingDays(days = []) {
  const sorted = [...days].sort((a, b) => a - b);
  const consecutive = sorted.length > 2 && sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (consecutive) return `${DAY_NAMES[sorted[0]]} – ${DAY_NAMES[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => DAY_NAMES[d]).join(', ');
}

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

// "+639171234567" -> "+63 917 123 4567". Older free-form numbers are shown as typed.
export function formatPhone(phone) {
  if (!phone) return '';
  return parsePhoneNumberFromString(phone)?.formatInternational() ?? phone;
}
