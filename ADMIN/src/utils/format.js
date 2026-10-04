// Display helpers. Dates from the API are "YYYY-MM-DD" strings and times are
// "HH:MM" (24-hour), both in the business's local time.

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

export const todayString = () => toDateString(new Date());

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

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
export const formatPrice = (amount) => peso.format(amount ?? 0);

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
