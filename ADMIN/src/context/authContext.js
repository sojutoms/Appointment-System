import { createContext } from 'react';

// Holds { user, loading, sessionEndsAt, signOutReason, startLogin, verifyCode,
// resendCode, logout, completeSession, updateUser }. Provided by <AuthProvider>.
export const AuthContext = createContext(null);
