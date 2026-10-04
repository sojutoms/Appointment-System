import axios from 'axios';

// sessionStorage (not localStorage): the admin session ends when the tab is
// closed and is never shared with other tabs or the client app.
export const TOKEN_KEY = 'oas_admin_token';

export const tokenStore = {
  get: () => {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Storage blocked: the session simply won't survive a refresh.
    }
  },
  clear: () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Any 401 on an authenticated request means the session is over (expired,
// revoked, password changed, admin rights removed): sign out everywhere.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadToken = Boolean(error.config?.headers?.Authorization);
    if (error.response?.status === 401 && hadToken) {
      window.dispatchEvent(new CustomEvent('admin:session-ended', { detail: error.response.data?.message }));
    }
    return Promise.reject(error);
  }
);

export default api;
