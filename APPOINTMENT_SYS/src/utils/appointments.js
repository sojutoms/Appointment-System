// Shared appointment constants and helpers.

export const STATUS_META = {
  pending: { label: 'Pending', color: 'warning' },
  confirmed: { label: 'Confirmed', color: 'success' },
  completed: { label: 'Completed', color: 'default' },
  cancelled: { label: 'Cancelled', color: 'error' },
};

// Pending and confirmed appointments still hold a time slot and can be changed.
export const isActive = (appt) => ['pending', 'confirmed'].includes(appt.status);
