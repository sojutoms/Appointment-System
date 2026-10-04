import { useContext } from 'react';
import { ToastContext } from '../context/toastContext';

export default function useToast() {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error('useToast must be used inside <ToastProvider>.');
  return showToast;
}
