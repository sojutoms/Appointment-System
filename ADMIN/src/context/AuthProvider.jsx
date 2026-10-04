import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { tokenStore } from '../api/axios';
import { tokenExpiresAt } from '../utils/jwt';
import { AuthContext } from './authContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));
  const [sessionEndsAt, setSessionEndsAt] = useState(() => tokenExpiresAt(tokenStore.get() ?? '') ?? null);
  // Shown on the login screen after an automatic sign-out.
  const [signOutReason, setSignOutReason] = useState('');

  const endSession = useCallback((reason = '') => {
    tokenStore.clear();
    setUser(null);
    setSessionEndsAt(null);
    setSignOutReason(reason);
  }, []);

  const completeSession = useCallback((token, sessionUser) => {
    tokenStore.set(token);
    setUser(sessionUser);
    setSessionEndsAt(tokenExpiresAt(token));
    setSignOutReason('');
  }, []);

  // Restore the session after a page refresh (same tab only).
  useEffect(() => {
    if (!tokenStore.get()) return;
    api
      .get('/admin/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch((err) => {
        // Only a rejected token ends the session (a 401 is already handled by the
        // axios interceptor). A server or network error keeps the token, so a
        // blip doesn't sign the admin out; the login screen explains what happened.
        const status = err.response?.status;
        if (status === 401) return;
        if (status === 403) endSession('Your session has ended. Please sign in again.');
        else setSignOutReason("We couldn't reach the server to restore your session. Check your connection and sign in again.");
      })
      .finally(() => setLoading(false));
  }, [endSession]);

  // The API rejected our token (expired, revoked, rights removed).
  useEffect(() => {
    const onEnded = (e) => endSession(e.detail || 'Your session has ended. Please sign in again.');
    window.addEventListener('admin:session-ended', onEnded);
    return () => window.removeEventListener('admin:session-ended', onEnded);
  }, [endSession]);

  // Sign out exactly when the token expires, even if the admin is idle on a page.
  useEffect(() => {
    if (!sessionEndsAt) return undefined;
    const ms = sessionEndsAt - Date.now();
    const id = setTimeout(
      () => endSession('Your admin session expired after 2 hours. Please sign in again.'),
      Math.max(0, Math.min(ms, 2 ** 31 - 1))
    );
    return () => clearTimeout(id);
  }, [sessionEndsAt, endSession]);

  // Step 1: password. Returns the 2FA challenge, or signs in directly if 2FA is off.
  const startLogin = useCallback(
    async (email, password) => {
      const { data } = await api.post('/admin/auth/login', { email, password });
      if (data.token) completeSession(data.token, data.user);
      return data;
    },
    [completeSession]
  );

  // Step 2: the emailed code.
  const verifyCode = useCallback(
    async (challengeToken, otp) => {
      const { data } = await api.post('/admin/auth/verify', { challengeToken, otp });
      completeSession(data.token, data.user);
      return data.user;
    },
    [completeSession]
  );

  const resendCode = useCallback(async (challengeToken) => {
    const { data } = await api.post('/admin/auth/resend', { challengeToken });
    return data;
  }, []);

  const logout = useCallback(
    async (reason = '') => {
      // Best effort: record the sign-out in the audit log, then drop the token.
      try {
        await api.post('/admin/auth/logout');
      } catch {
        // ignore: the token is discarded either way
      }
      endSession(reason);
    },
    [endSession]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      sessionEndsAt,
      signOutReason,
      startLogin,
      verifyCode,
      resendCode,
      logout,
      completeSession,
      updateUser: setUser,
    }),
    [user, loading, sessionEndsAt, signOutReason, startLogin, verifyCode, resendCode, logout, completeSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
