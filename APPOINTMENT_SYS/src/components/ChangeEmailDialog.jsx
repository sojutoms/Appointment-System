import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import api from '../api/axios';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { getCooldownUntil, startCooldown } from '../utils/otpSession';
import { validateEmail } from '../utils/validation';
import OtpInput from './OtpInput';
import PasswordField from './PasswordField';
import ResendCode from './ResendCode';
import SubmitButton from './SubmitButton';

const PURPOSE = 'change-email';

// Two steps: new email + current password -> code sent to the new email.
export default function ChangeEmailDialog({ open, currentEmail, onClose, onChanged }) {
  const [step, setStep] = useState(0);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const email = newEmail.trim().toLowerCase();

  const reset = () => {
    setStep(0);
    setNewEmail('');
    setPassword('');
    setCode('');
    setErrors({});
    setError('');
    setNotice('');
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const fail = (err) => {
    setError(getErrorMessage(err));
    setErrors(getFieldErrors(err));
    const retryAfter = err.response?.data?.retryAfter;
    if (retryAfter) setCooldownUntil(startCooldown(PURPOSE, email, retryAfter));
  };

  const requestCode = async (e) => {
    e.preventDefault();
    setError('');
    const nextErrors = {};
    const emailError = validateEmail(newEmail);
    if (emailError) nextErrors.newEmail = emailError;
    else if (email === currentEmail) nextErrors.newEmail = 'That is already your email address.';
    if (!password) nextErrors.currentPassword = 'Enter your current password.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    // A code for this address was sent moments ago: reuse it.
    const existing = getCooldownUntil(PURPOSE, email);
    if (existing) {
      setCooldownUntil(existing);
      setNotice(`We already sent a code to ${email}.`);
      setStep(1);
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post('/users/me/email', { newEmail: email, currentPassword: password });
      setCooldownUntil(startCooldown(PURPOSE, email, data.resendAvailableIn));
      setNotice(data.message);
      setStep(1);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (otp) => {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/users/me/email/verify', { newEmail: email, otp });
      setBusy(false);
      onChanged(data.user);
      reset();
      onClose();
    } catch (err) {
      fail(err);
      setCode('');
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      const { data } = await api.post('/users/me/email/resend', { newEmail: email });
      setCooldownUntil(startCooldown(PURPOSE, email, data.resendAvailableIn));
      setCode('');
      setNotice('A new code is on its way. Earlier codes no longer work.');
    } catch (err) {
      fail(err);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>Change email</DialogTitle>
      <DialogContent>
        {notice && !error && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {notice}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === 0 ? (
          <Box component="form" id="change-email-form" noValidate onSubmit={requestCode}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              We&apos;ll send a code to your new address to make sure it&apos;s yours.
            </Typography>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <TextField
                label="New email"
                type="email"
                autoComplete="email"
                autoFocus
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                error={Boolean(errors.newEmail)}
                helperText={errors.newEmail}
              />
              <PasswordField
                label="Current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.currentPassword}
              />
            </Stack>
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter the 6-digit code sent to{' '}
              <Box component="span" sx={{ fontWeight: 600, color: 'text.primary', wordBreak: 'break-all' }}>
                {email}
              </Box>
              .
            </Typography>
            <OtpInput value={code} onChange={setCode} onComplete={verify} disabled={busy} invalid={Boolean(error)} />
            <Box sx={{ mt: 3 }}>
              <ResendCode cooldownUntil={cooldownUntil} onResend={resend} disabled={busy} />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={step === 0 ? close : () => setStep(0)} color="inherit" disabled={busy}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step === 0 ? (
          <SubmitButton form="change-email-form" busy={busy} busyText="Sending..." fullWidth={false} size="medium">
            Send code
          </SubmitButton>
        ) : (
          <SubmitButton
            type="button"
            onClick={() => verify(code.trim())}
            busy={busy}
            busyText="Verifying..."
            disabled={code.trim().length !== 6}
            fullWidth={false}
            size="medium"
          >
            Confirm
          </SubmitButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
