import { useCallback, useState } from 'react';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { ToastContext } from './toastContext';

// App-wide snackbar notifications: showToast('Saved!', 'success').
export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [open, setOpen] = useState(false);

  const showToast = useCallback((message, severity = 'success') => {
    setToast({ message, severity, key: Date.now() });
    setOpen(true);
  }, []);

  const handleClose = (_event, reason) => {
    if (reason !== 'clickaway') setOpen(false);
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Snackbar
        key={toast?.key}
        open={open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert onClose={handleClose} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  );
}
