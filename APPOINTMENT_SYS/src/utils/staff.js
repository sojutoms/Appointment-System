import { nowInBusinessTz, todayString } from './format';

// True once an appointment's start time has passed (it can then be completed).
export function hasStarted(appt) {
  const today = todayString();
  if (appt.date !== today) return appt.date < today;
  const [h, m] = appt.startTime.split(':').map(Number);
  return nowInBusinessTz().minutes >= h * 60 + m;
}
