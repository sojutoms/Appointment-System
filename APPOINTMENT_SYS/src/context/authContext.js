import { createContext } from 'react';

// Holds { user, loading, login, register, verifyEmail, logout, saveSession, updateUser }.
// Provided by <AuthProvider>, read with the useAuth() hook.
export const AuthContext = createContext(null);
