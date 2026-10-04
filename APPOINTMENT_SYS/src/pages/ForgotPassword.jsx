import { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import api from '../api/axios';
import OtpInput from '../components/OtpInput';
import PasswordField from '../components/PasswordField';
import ResendCode from '../components/ResendCode';
import SubmitButton from '../components/SubmitButton';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { getCooldownUntil, startCooldown } from '../utils/otpSession';
import { validateEmail, validatePassword } from '../utils/validation';

const PURPOSE = 'reset-password';
const STEPS = ['Email', 'Code', 'New password'];

// Three steps on one page: request a code -> enter the code -> set a new password.
export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' });

  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const fail = (err) => {
    setError(getErrorMessage(err));
    setFieldErrors(getFieldErrors(err));
    const retryAfter = err.response?.data?.retryAfter;
    if (retryAfter) setCooldownUntil(startCooldown(PURPOSE, normalizedEmail, retryAfter));
  };

  const clearMessages = () => {
    setError('');
    setNotice('');
    setFieldErrors({});
  };

  // Step 1: request the code.
  const requestCode = async (e) => {
    e.preventDefault();
    clearMessages();
    const emailError = validateEmail(email);
    if (emailError) {
      setFieldErrors({ email: emailError });
      return;
    }

    // Still cooling down from an earlier request (e.g. went back a step): reuse that code.
    const existing = getCooldownUntil(PURPOSE, normalizedEmail);
    if (existing) {
      setCooldownUntil(existing);
      setNotice(`We already sent a code to ${normalizedEmail}. Enter it below.`);
      setStep(1);
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: normalizedEmail });
      setCooldownUntil(startCooldown(PURPOSE, normalizedEmail, data.resendAvailableIn));
      setNotice(data.message);
      setStep(1);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    clearMessages();
    try {
      const { data } = await api.post('/auth/resend-otp', { email: normalizedEmail, purpose: PURPOSE });
      setCooldownUntil(startCooldown(PURPOSE, normalizedEmail, data.resendAvailableIn));
      setCode('');
      setNotice('A new code is on its way. Earlier codes no longer work.');
    } catch (err) {
      fail(err);
    }
  };

  // Step 2: check the code; the server returns a one-time reset token.
  const verifyCode = async (otp) => {
    if (busy) return;
    clearMessages();
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter all 6 digits of the code.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/verify-reset-otp', { email: normalizedEmail, otp });
      setResetToken(data.resetToken);
      setStep(2);
    } catch (err) {
      fail(err);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  // Step 3: set the new password.
  const savePassword = async (e) => {
    e.preventDefault();
    clearMessages();
    const errors = {};
    const passwordError = validatePassword(passwords.password);
    if (passwordError) errors.password = passwordError;
    if (passwords.confirmPassword !== passwords.password) errors.confirmPassword = 'Passwords do not match.';
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setBusy(true);
    try {
      await api.post('/auth/reset-password', { email: normalizedEmail, resetToken, password: passwords.password });
      navigate('/login', { replace: true, state: { message: 'Password updated. Log in with your new password.' } });
    } catch (err) {
      fail(err);
      // The reset session expired: start over from the code step.
      if (err.response?.data?.code === 'RESET_EXPIRED') {
        setResetToken('');
        setCode('');
        setStep(1);
      }
      setBusy(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  return (
    <>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
        Reset your password
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {step === 0 && "Enter your account's email and we'll send you a 6-digit code."}
        {step === 1 && (
          <>
            Enter the code sent to{' '}
            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary', wordBreak: 'break-all' }}>
              {normalizedEmail}
            </Box>
            . It expires in 10 minutes.
          </>
        )}
        {step === 2 && 'Choose a new password for your account.'}
      </Typography>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

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

      {step === 0 && (
        <Box component="form" noValidate onSubmit={requestCode}>
          <Stack spacing={3}>
            <TextField
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors({});
              }}
              error={Boolean(fieldErrors.email)}
              helperText={fieldErrors.email}
            />
            <SubmitButton busy={busy} busyText="Sending code...">
              Send code
            </SubmitButton>
          </Stack>
        </Box>
      )}

      {step === 1 && (
        <>
          <Box
            component="form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              verifyCode(code.trim());
            }}
          >
            <OtpInput value={code} onChange={setCode} onComplete={verifyCode} disabled={busy} invalid={Boolean(error)} />
            <SubmitButton busy={busy} busyText="Checking..." disabled={code.trim().length !== 6} sx={{ mt: 3 }}>
              Continue
            </SubmitButton>
          </Box>
          <Box sx={{ mt: 3 }}>
            <ResendCode cooldownUntil={cooldownUntil} onResend={resend} disabled={busy} />
          </Box>
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Button
              size="small"
              onClick={() => {
                clearMessages();
                setCode('');
                setStep(0);
              }}
            >
              Use a different email
            </Button>
          </Box>
        </>
      )}

      {step === 2 && (
        <Box component="form" noValidate onSubmit={savePassword}>
          <Stack spacing={2.5}>
            <PasswordField
              label="New password"
              name="password"
              autoComplete="new-password"
              autoFocus
              value={passwords.password}
              onChange={handlePasswordChange}
              error={fieldErrors.password}
              helperText="At least 8 characters, with a letter and a number"
            />
            <PasswordField
              label="Confirm new password"
              name="confirmPassword"
              autoComplete="new-password"
              value={passwords.confirmPassword}
              onChange={handlePasswordChange}
              error={fieldErrors.confirmPassword}
            />
            <SubmitButton busy={busy} busyText="Saving...">
              Update password
            </SubmitButton>
          </Stack>
        </Box>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 3 }}>
        Remembered it?{' '}
        <Link component={RouterLink} to="/login">
          Back to log in
        </Link>
      </Typography>
    </>
  );
}
