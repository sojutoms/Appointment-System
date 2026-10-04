import { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import api from '../api/axios';
import PasswordField from '../components/PasswordField';
import SubmitButton from '../components/SubmitButton';
import useAuth from '../hooks/useAuth';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { setPendingEmail, startCooldown } from '../utils/otpSession';
import { homeFor } from '../utils/roles';
import { validateLogin } from '../utils/validation';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Where the user was trying to go before being sent to login (if anywhere).
  const from = location.state?.from;
  const redirectTo = from?.pathname ? `${from.pathname}${from.search ?? ''}` : '';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Correct password but the email was never verified: send a fresh code
  // (unless one was sent very recently) and go to the verification screen.
  const continueVerification = async (email) => {
    setPendingEmail(email);
    let notice = 'Your email is not verified yet. We sent you a new code.';
    try {
      const { data } = await api.post('/auth/resend-otp', { email, purpose: 'verify-email' });
      startCooldown('verify-email', email, data.resendAvailableIn);
    } catch (err) {
      const retryAfter = err.response?.data?.retryAfter;
      if (retryAfter) startCooldown('verify-email', email, retryAfter);
      notice = 'Your email is not verified yet. Enter the code we sent earlier, or request a new one.';
    }
    navigate('/verify-email', { state: { notice } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validateLogin(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSubmitting(true);
    try {
      const user = await login(form.email.trim(), form.password);
      // Staff go to their schedule, everyone else to their dashboard.
      navigate(redirectTo || homeFor(user), { replace: true });
    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        await continueVerification(err.response.data.email);
        return;
      }
      setErrors(getFieldErrors(err));
      setServerError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
        Welcome back
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Log in to manage your appointments.
      </Typography>

      {location.state?.message && !serverError && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {location.state.message}
        </Alert>
      )}
      {serverError && (
        <Alert severity="error" onClose={() => setServerError('')} sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      )}

      <Box component="form" noValidate onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          <TextField
            label="Email"
            type="email"
            slotProps={{ htmlInput: { maxLength: 64 } }}
            name="email"
            placeholder="user@example.com"
            autoComplete="email"
            autoFocus
            value={form.email}
            onChange={handleChange}
            error={Boolean(errors.email)}
            helperText={errors.email}
          />
          <Box>
            <PasswordField label="Password" name="password" value={form.password} onChange={handleChange} error={errors.password} />
            <Box sx={{ textAlign: 'right', mt: 1 }}>
              <Link component={RouterLink} to="/forgot-password" state={{ email: form.email.trim() }} variant="body2">
                Forgot password?
              </Link>
            </Box>
          </Box>
          <SubmitButton busy={submitting} busyText="Logging in...">
            Log in
          </SubmitButton>
        </Stack>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 3 }}>
        Don&apos;t have an account?{' '}
        <Link component={RouterLink} to="/register">
          Sign up
        </Link>
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
        Staff member with an invite code?{' '}
        <Link component={RouterLink} to="/staff/activate">
          Set up your account
        </Link>
      </Typography>
    </>
  );
}
