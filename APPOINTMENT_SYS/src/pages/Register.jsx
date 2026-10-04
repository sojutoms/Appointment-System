import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PasswordField from '../components/PasswordField';
import SubmitButton from '../components/SubmitButton';
import useAuth from '../hooks/useAuth';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { setPendingEmail, startCooldown } from '../utils/otpSession';
import { passwordStrength, validateRegister } from '../utils/validation';

const STRENGTH = [
  { label: 'Too weak', color: 'error' },
  { label: 'Weak', color: 'error' },
  { label: 'Fair', color: 'warning' },
  { label: 'Good', color: 'info' },
  { label: 'Strong', color: 'success' },
];

const INITIAL = { name: '', email: '', phone: '', password: '', confirmPassword: '' };

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const score = passwordStrength(form.password);
  const strength = STRENGTH[score];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validateRegister(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSubmitting(true);
    const email = form.email.trim().toLowerCase();
    try {
      const data = await register({
        name: form.name.trim(),
        email,
        phone: form.phone.trim(),
        password: form.password,
      });
      setPendingEmail(email);
      startCooldown('verify-email', email, data.resendAvailableIn);
      navigate('/verify-email');
    } catch (err) {
      // Signed up again within the resend cooldown: the account details were
      // updated and the code already sent still works, so continue to verify.
      if (err.response?.data?.code === 'OTP_COOLDOWN') {
        setPendingEmail(email);
        startCooldown('verify-email', email, err.response.data.retryAfter);
        navigate('/verify-email', { state: { notice: 'Use the code we already sent to your email.' } });
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
        Create your account
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        It only takes a minute to start booking.
      </Typography>

      {serverError && (
        <Alert severity="error" onClose={() => setServerError('')} sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      )}

      <Box component="form" noValidate onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          <TextField
            label="Full name"
            name="name"
            placeholder="Juan Dela Cruz"
            autoComplete="name"
            autoFocus
            value={form.name}
            onChange={handleChange}
            error={Boolean(errors.name)}
            helperText={errors.name}
          />
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 7 }}>
              <TextField
                label="Email"
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                error={Boolean(errors.email)}
                helperText={errors.email}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                label="Phone (optional)"
                type="tel"
                name="phone"
                placeholder="0917 123 4567"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange}
                error={Boolean(errors.phone)}
                helperText={errors.phone}
              />
            </Grid>
          </Grid>
          <Box>
            <PasswordField
              label="Password"
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              helperText="At least 8 characters, with a letter and a number"
            />
            {form.password && (
              <Box sx={{ mt: 1 }} aria-live="polite">
                <LinearProgress
                  variant="determinate"
                  value={Math.max(5, (score / 4) * 100)}
                  color={strength.color}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Typography variant="caption" color="text.secondary">
                  Strength: {strength.label}
                </Typography>
              </Box>
            )}
          </Box>
          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
          />
          <SubmitButton busy={submitting} busyText="Sending verification code...">
            Create account
          </SubmitButton>
        </Stack>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 3 }}>
        Already have an account?{' '}
        <Link component={RouterLink} to="/login">
          Log in
        </Link>
      </Typography>
    </>
  );
}
