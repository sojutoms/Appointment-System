import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY } from '../api/axios';
import { AuthContext } from './authContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // True until we've checked whether a saved token is still valid.
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const saveSession = useCallback((token, sessionUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(sessionUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  // On first load, restore the session from the saved token.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api
      .get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  // The Axios interceptor fires this when the server rejects our token.
  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, [logout]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password });
      saveSession(data.token, data.user);
      return data.user;
    },
    [saveSession]
  );

  // Creates an unverified account; the server emails a code. No session yet.
  const register = useCallback(async (details) => {
    const { data } = await api.post('/auth/register', details);
    return data;
  }, []);

  // Confirms the emailed code; on success the user is logged in.
  const verifyEmail = useCallback(
    async (email, otp) => {
      const { data } = await api.post('/auth/verify-email', { email, otp });
      saveSession(data.token, data.user);
      return data.user;
    },
    [saveSession]
  );

  const value = useMemo(
    () => ({ user, loading, login, register, verifyEmail, logout, saveSession, updateUser: setUser }),
    [user, loading, login, register, verifyEmail, logout, saveSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
