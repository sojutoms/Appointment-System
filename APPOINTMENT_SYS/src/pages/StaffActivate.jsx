import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import api from '../api/axios';
import IconBadge from '../components/IconBadge';
import OtpInput from '../components/OtpInput';
import PasswordField from '../components/PasswordField';
import ResendCode from '../components/ResendCode';
import SubmitButton from '../components/SubmitButton';
import useAuth from '../hooks/useAuth';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { getCooldownUntil, startCooldown } from '../utils/otpSession';
import { validateEmail, validatePassword } from '../utils/validation';

const PURPOSE = 'staff-invite';

// Staff set up their account with the code from the admin's invite email.
export default function StaffActivate() {
  const { saveSession } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const email = form.email.trim().toLowerCase();
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    if (field === 'email') setCooldownUntil(getCooldownUntil(PURPOSE, value.trim().toLowerCase()));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const next = {};
    const emailError = validateEmail(form.email);
    if (emailError) next.email = emailError;
    if (!/^\d{6}$/.test(code.trim())) next.code = 'Enter the 6-digit code from your invite email.';
    const passwordError = validatePassword(form.password);
    if (passwordError) next.password = passwordError;
    if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const { data } = await api.post('/auth/staff/activate', { email, otp: code.trim(), password: form.password });
      saveSession(data.token, data.user);
      navigate('/staff', { replace: true });
    } catch (err) {
      if (err.response?.data?.code === 'ALREADY_ACTIVE') {
        navigate('/login', { replace: true, state: { message: 'Your staff account is already set up. Please log in.' } });
        return;
      }
      setErrors(getFieldErrors(err));
      setError(getErrorMessage(err));
      setCode('');
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    setNotice('');
    const emailError = validateEmail(form.email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }
    try {
      const { data } = await api.post('/auth/staff/resend', { email });
      setCooldownUntil(startCooldown(PURPOSE, email, data.resendAvailableIn));
      setNotice(data.message);
    } catch (err) {
      const retryAfter = err.response?.data?.retryAfter;
      if (retryAfter) setCooldownUntil(startCooldown(PURPOSE, email, retryAfter));
      setError(getErrorMessage(err));
    }
  };

  return (
    <>
      <IconBadge icon={BadgeOutlinedIcon} size={52} sx={{ mb: 2 }} />
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
        Set up your staff account
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Enter the 6-digit code from your invite email and choose a password.
      </Typography>

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

      <Box component="form" noValidate onSubmit={submit}>
        <Stack spacing={2.5}>
          <TextField
            label="Work email"
            type="email"
            autoComplete="username"
            autoFocus
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            error={Boolean(errors.email)}
            helperText={errors.email || 'The address your invite was sent to'}
          />
          <Box>
            <Typography variant="body2" color={errors.code ? 'error' : 'text.secondary'} sx={{ mb: 1 }}>
              {errors.code || 'Invite code'}
            </Typography>
            <OtpInput value={code} onChange={setCode} disabled={busy} invalid={Boolean(errors.code)} autoFocus={false} />
          </Box>
          <PasswordField
            label="New password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            error={errors.password}
            helperText="At least 8 characters, with a letter and a number"
          />
          <PasswordField
            label="Confirm password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => set('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
          />
          <SubmitButton busy={busy} busyText="Setting up...">
            Activate account
          </SubmitButton>
        </Stack>
      </Box>

      <Box sx={{ mt: 3 }}>
        <ResendCode cooldownUntil={cooldownUntil} onResend={resend} disabled={busy} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
        Already set up?{' '}
        <Link component={RouterLink} to="/login">
          Log in
        </Link>
      </Typography>
    </>
  );
}
