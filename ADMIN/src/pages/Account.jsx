import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import api from '../api/axios';
import PageHeader from '../components/PageHeader';
import PasswordField from '../components/PasswordField';
import SubmitButton from '../components/SubmitButton';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { initials } from '../utils/format';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

// Admin password rules are stricter than for clients.
function validateAdminPassword(password) {
  if (password.length < 12) return 'Admin passwords must be at least 12 characters.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) return 'Use both upper- and lowercase letters.';
  if (!/\d/.test(password)) return 'Include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Include at least one symbol.';
  return '';
}

export default function Account() {
  const { user, completeSession, sessionEndsAt } = useAuth();
  const showToast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const next = {};
    if (!form.currentPassword) next.currentPassword = 'Enter your current password.';
    const strength = validateAdminPassword(form.newPassword);
    if (strength) next.newPassword = strength;
    else if (form.newPassword === form.currentPassword) next.newPassword = 'Choose a different password.';
    if (form.confirmPassword !== form.newPassword) next.confirmPassword = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const { data } = await api.put('/users/me', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      // The server ended every other session and gave this one a new admin token.
      completeSession(data.token, data.user);
      setForm(EMPTY);
      showToast('Password changed. All other sessions were signed out.');
    } catch (err) {
      const message = getErrorMessage(err);
      setErrors({ ...getFieldErrors(err), ...(/current password/i.test(message) && { currentPassword: message }) });
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="My account" description="Your administrator profile and security." />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: 'secondary.main' }}>{initials(user.name)}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6">{user.name}</Typography>
                  <Typography color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                    {user.email}
                  </Typography>
                </Box>
              </Stack>
              <Stack spacing={1.5}>
                <Typography variant="body2">
                  <strong>Sign-in protection:</strong> password + emailed code
                </Typography>
                <Typography variant="body2">
                  <strong>This session ends:</strong>{' '}
                  {sessionEndsAt ? new Date(sessionEndsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'} (or after
                  15 minutes idle)
                </Typography>
                <Typography variant="body2">
                  <strong>Last sign-in:</strong> {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-US') : '—'}
                </Typography>
              </Stack>
              <Alert severity="info" sx={{ mt: 3 }}>
                To change your name or email, use the client app&apos;s profile page. Email changes are verified with a code.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" component="h2">
                Change password
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Admin passwords need 12+ characters with upper- and lowercase letters, a number and a symbol.
              </Typography>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Box component="form" noValidate onSubmit={submit}>
                <Stack spacing={2.5}>
                  <PasswordField label="Current password" name="currentPassword" value={form.currentPassword} onChange={handleChange} error={errors.currentPassword} />
                  <PasswordField label="New password" name="newPassword" autoComplete="new-password" value={form.newPassword} onChange={handleChange} error={errors.newPassword} />
                  <PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" value={form.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />
                  <Box>
                    <SubmitButton busy={busy} busyText="Updating..." fullWidth={false} size="medium">
                      Update password
                    </SubmitButton>
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
