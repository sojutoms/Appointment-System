// Reads the expiry from a JWT for scheduling the automatic sign-out.
// This only DECODES the token (no verification); the server always verifies.
export function tokenExpiresAt(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}
