import { createContext } from 'react';

// Holds showToast(message, severity). Provided by <ToastProvider>, read with useToast().
export const ToastContext = createContext(null);
