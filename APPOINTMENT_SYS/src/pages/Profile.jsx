import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import api from '../api/axios';
import ChangeEmailDialog from '../components/ChangeEmailDialog';
import PasswordField from '../components/PasswordField';
import PhoneField from '../components/PhoneField';
import SubmitButton from '../components/SubmitButton';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { initials } from '../utils/format';
import {
  cleanNameInput,
  LIMITS,
  splitName,
  splitPhone,
  toE164,
  validatePassword,
  validatePersonName,
  validatePhone,
} from '../utils/validation';

function Section({ title, description, children }) {
  return (
    <Card>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="h6" component="h2">
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>{children}</Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

function initialPersonalInfo(user) {
  const { country, number } = splitPhone(user.phone, user.phoneCountry);
  return { ...splitName(user), phoneCountry: country, phone: number };
}

function PersonalInfoForm() {
  const { user, updateUser } = useAuth();
  const showToast = useToast();
  const [initial, setInitial] = useState(() => initialPersonalInfo(user));
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const dirty = Object.keys(initial).some((key) => form[key].trim() !== initial[key]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: cleanNameInput(e.target.value) }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    const firstNameError = validatePersonName(form.firstName, 'First name');
    if (firstNameError) nextErrors.firstName = firstNameError;
    const lastNameError = validatePersonName(form.lastName, 'Last name');
    if (lastNameError) nextErrors.lastName = lastNameError;
    const phoneError = validatePhone(form.phone, form.phoneCountry);
    if (phoneError) nextErrors.phone = phoneError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      const { data } = await api.put('/users/me', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: toE164(form.phone, form.phoneCountry),
        ...(form.phone && { phoneCountry: form.phoneCountry }),
      });
      setInitial(initialPersonalInfo(data.user));
      updateUser(data.user);
      showToast('Profile updated.');
    } catch (err) {
      setErrors(getFieldErrors(err));
      showToast(getErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box component="form" noValidate onSubmit={submit}>
      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
          <TextField
            label="First name"
            name="firstName"
            autoComplete="given-name"
            value={form.firstName}
            onChange={handleChange}
            error={Boolean(errors.firstName)}
            helperText={errors.firstName}
            slotProps={{ htmlInput: { maxLength: LIMITS.name } }}
          />
          <TextField
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            value={form.lastName}
            onChange={handleChange}
            error={Boolean(errors.lastName)}
            helperText={errors.lastName}
            slotProps={{ htmlInput: { maxLength: LIMITS.name } }}
          />
        </Stack>
        <PhoneField
          label="Phone (optional)"
          value={{ country: form.phoneCountry, number: form.phone }}
          onChange={({ country, number }) => {
            setForm((prev) => ({ ...prev, phoneCountry: country, phone: number }));
            setErrors((prev) => ({ ...prev, phone: '' }));
          }}
          error={errors.phone}
        />
        <Box>
          <SubmitButton busy={busy} busyText="Saving..." disabled={!dirty} fullWidth={false} size="medium">
            Save changes
          </SubmitButton>
        </Box>
      </Stack>
    </Box>
  );
}

const EMPTY_PASSWORDS = { currentPassword: '', newPassword: '', confirmPassword: '' };

function PasswordForm() {
  const { user, saveSession } = useAuth();
  const showToast = useToast();
  const [form, setForm] = useState(EMPTY_PASSWORDS);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.currentPassword) nextErrors.currentPassword = 'Enter your current password.';
    const passwordError = validatePassword(form.newPassword);
    if (passwordError) nextErrors.newPassword = passwordError;
    else if (form.newPassword === form.currentPassword) nextErrors.newPassword = 'Choose a password different from your current one.';
    if (form.confirmPassword !== form.newPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      const { data } = await api.put('/users/me', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      // Older tokens stop working after a password change, so store the new one.
      saveSession(data.token, data.user ?? user);
      setForm(EMPTY_PASSWORDS);
      showToast('Password changed. Other devices have been logged out.');
    } catch (err) {
      const message = getErrorMessage(err);
      const fieldErrors = getFieldErrors(err);
      if (/current password/i.test(message)) fieldErrors.currentPassword = message;
      setErrors(fieldErrors);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box component="form" noValidate onSubmit={submit}>
      <Stack spacing={2.5}>
        <PasswordField label="Current password" name="currentPassword" value={form.currentPassword} onChange={handleChange} error={errors.currentPassword} />
        <PasswordField
          label="New password"
          name="newPassword"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={handleChange}
          error={errors.newPassword}
          helperText="8 to 32 characters, with a letter and a number"
        />
        <PasswordField
          label="Confirm new password"
          name="confirmPassword"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />
        <Box>
          <SubmitButton busy={busy} busyText="Updating..." fullWidth={false} size="medium">
            Update password
          </SubmitButton>
        </Box>
      </Stack>
    </Box>
  );
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const showToast = useToast();
  const [emailDialog, setEmailDialog] = useState(false);
  const isStaff = user.role === 'staff';
  // Admin accounts are protected by 2FA, so their email and password are only
  // changed from the admin panel (the server refuses it here).
  const isAdmin = user.role === 'admin';

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ alignItems: { sm: 'center' } }}>
            <Avatar sx={{ width: 72, height: 72, fontSize: 28, bgcolor: 'primary.main' }}>{initials(user.name)}</Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="h5" component="h1">
                {user.name}
              </Typography>
              <Typography color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                {user.email}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  label={{ admin: 'Administrator', staff: 'Staff' }[user.role] ?? 'Client'}
                  color={user.role === 'admin' ? 'secondary' : user.role === 'staff' ? 'info' : 'primary'}
                  variant="outlined"
                />
                <Chip size="small" icon={<VerifiedRoundedIcon />} label="Email verified" color="success" variant="outlined" />
              </Stack>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={3}>
        <Section
          title="Personal information"
          description={isStaff ? 'Your contact details.' : 'Your name and phone number are shared with staff for your appointments.'}
        >
          <PersonalInfoForm />
        </Section>

        <Section title="Email address" description="Used to log in and to receive verification codes.">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, wordBreak: 'break-all' }}>{user.email}</Typography>
              <Typography variant="body2" color="text.secondary">
                {isStaff
                  ? 'Your work email is managed by an administrator.'
                  : isAdmin
                    ? 'Administrators change their email in the admin panel (My account).'
                    : 'Changing it requires a code sent to the new address.'}
              </Typography>
            </Box>
            {!isStaff && !isAdmin && (
              <Button variant="outlined" onClick={() => setEmailDialog(true)} sx={{ flex: 'none' }}>
                Change email
              </Button>
            )}
          </Stack>
        </Section>

        <Section title="Password" description="Changing your password logs you out on all other devices.">
          {isAdmin ? (
            <Typography color="text.secondary">For security, administrators change their password in the admin panel (My account).</Typography>
          ) : (
            <PasswordForm />
          )}
        </Section>
      </Stack>

      <ChangeEmailDialog
        open={emailDialog}
        currentEmail={user.email}
        onClose={() => setEmailDialog(false)}
        onChanged={(updated) => {
          updateUser(updated);
          showToast('Email address updated.');
        }}
      />
    </Container>
  );
}
