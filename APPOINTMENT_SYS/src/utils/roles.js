// Where each kind of account lands after signing in.
export const homeFor = (user) => (user?.role === 'staff' ? '/staff' : '/dashboard');

// Roles that use the booking side of the app (admins act as clients here).
export const CLIENT_ROLES = ['client', 'admin'];
