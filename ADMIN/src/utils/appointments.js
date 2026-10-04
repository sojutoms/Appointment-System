// Shared appointment constants and helpers.
import { todayString } from './format';

export const STATUS_META = {
  pending: { label: 'Pending', color: 'warning' },
  confirmed: { label: 'Confirmed', color: 'success' },
  completed: { label: 'Completed', color: 'default' },
  cancelled: { label: 'Cancelled', color: 'error' },
};

// Pending and confirmed appointments still hold a time slot and can be changed.
export const isActive = (appt) => ['pending', 'confirmed'].includes(appt.status);

// Mirrors the server rule: only appointments that have started can be completed.
export function hasStarted(appt) {
  const today = todayString();
  if (appt.date !== today) return appt.date < today;
  const now = new Date();
  const [h, m] = appt.startTime.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}
