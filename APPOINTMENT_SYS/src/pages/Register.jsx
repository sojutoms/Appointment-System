import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PasswordField from '../components/PasswordField';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import PhoneField from '../components/PhoneField';
import SubmitButton from '../components/SubmitButton';
import useAuth from '../hooks/useAuth';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { setPendingEmail, startCooldown } from '../utils/otpSession';
import { cleanNameInput, DEFAULT_PHONE_COUNTRY, LIMITS, toE164, validateRegister } from '../utils/validation';

const INITIAL = { firstName: '', lastName: '', email: '', phone: '', phoneCountry: DEFAULT_PHONE_COUNTRY, password: '', confirmPassword: '' };
const NAME_FIELDS = new Set(['firstName', 'lastName']);

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: NAME_FIELDS.has(name) ? cleanNameInput(value) : value }));
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
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email,
        phone: toE164(form.phone, form.phoneCountry),
        ...(form.phone && { phoneCountry: form.phoneCountry }),
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
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="First name"
                name="firstName"
                placeholder="Juan"
                autoComplete="given-name"
                autoFocus
                value={form.firstName}
                onChange={handleChange}
                error={Boolean(errors.firstName)}
                helperText={errors.firstName}
                slotProps={{ htmlInput: { maxLength: LIMITS.name } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Last name"
                name="lastName"
                placeholder="Dela Cruz"
                autoComplete="family-name"
                value={form.lastName}
                onChange={handleChange}
                error={Boolean(errors.lastName)}
                helperText={errors.lastName}
                slotProps={{ htmlInput: { maxLength: LIMITS.name } }}
              />
            </Grid>
          </Grid>
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
            slotProps={{ htmlInput: { maxLength: LIMITS.email } }}
          />
          <PhoneField
            label="Phone (optional)"
            value={{ country: form.phoneCountry, number: form.phone }}
            onChange={({ country, number }) => {
              setForm((prev) => ({ ...prev, phoneCountry: country, phone: number }));
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
            }}
            error={errors.phone}
          />
          <Box>
            <PasswordField
              label="Password"
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              helperText="8 to 32 characters, with a letter and a number"
            />
            <PasswordStrengthMeter password={form.password} />
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
