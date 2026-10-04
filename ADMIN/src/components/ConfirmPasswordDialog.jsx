import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { getErrorMessage } from '../utils/errors';
import PasswordField from './PasswordField';

/**
 * Step-up confirmation for dangerous actions: the admin re-enters their password.
 * `onConfirm(password)` must return a promise; if it rejects, the error is shown here.
 */
export default function ConfirmPasswordDialog({ open, title, message, confirmText = 'Confirm', color = 'error', onConfirm, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setPassword('');
    setError('');
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Enter your password to continue.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm(password);
      setPassword('');
      setBusy(false);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setPassword('');
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <Box component="form" noValidate onSubmit={submit}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockOutlinedIcon color={color} />
          {title}
        </DialogTitle>
        <DialogContent>
          <Typography component="div" color="text.secondary" sx={{ mb: 2 }}>
            {message}
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <PasswordField
            label="Your password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="For security, confirm it's really you."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={close} color="inherit" disabled={busy}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color={color}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {confirmText}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
