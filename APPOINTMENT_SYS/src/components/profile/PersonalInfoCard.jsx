import { useState } from 'react';
import Box from '@mui/material/Box';
import Portal from '@mui/material/Portal';
import TextField from '@mui/material/TextField';
import api from '../../api/axios';
import { TAB_BAR_SPACE } from '../mobile/BottomTabBar';
import PhoneField from '../PhoneField';
import SubmitButton from '../SubmitButton';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import {
  cleanNameInput,
  LIMITS,
  splitName,
  splitPhone,
  toE164,
  validatePersonName,
  validatePhone,
} from '../../utils/validation';
import ProfileSection from './ProfileSection';

function initialPersonalInfo(user) {
  const { country, number } = splitPhone(user.phone, user.phoneCountry);
  return { ...splitName(user), phoneCountry: country, phone: number };
}

const fullRow = { gridColumn: '1 / -1' };

// Mobile save bar: fixed just above the bottom tab bar (TAB_BAR_SPACE ends 24px above it).
// Portalled out of the card because the card's backdrop-filter would trap `position: fixed`;
// the button still submits this form through its `form` attribute.
function StickySaveBar({ formId, busy, dirty }) {
  return (
    <Portal>
      <Box
        sx={(theme) => ({
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: `calc(${TAB_BAR_SPACE} - 14px)`,
          zIndex: theme.zIndex.appBar,
          px: 2,
          pointerEvents: 'none',
        })}
      >
        {/* Opaque backing so the (translucent) disabled button stays legible over scrolled content. */}
        <Box sx={{ maxWidth: 608, mx: 'auto', pointerEvents: 'auto', borderRadius: 999, bgcolor: 'background.default' }}>
          <SubmitButton form={formId} busy={busy} busyText="Saving..." disabled={!dirty}>
            Save changes
          </SubmitButton>
        </Box>
      </Box>
    </Portal>
  );
}

// Name + phone form (PUT /users/me). Save stays disabled until something changes.
// `stickySave` (mobile) moves the Save button into a bar fixed above the tab bar.
export default function PersonalInfoCard({ subtitle, stickySave = false }) {
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
    <ProfileSection
      id="personal-info"
      component="form"
      onSubmit={submit}
      title="Personal information"
      subtitle={subtitle}
      action={
        stickySave ? undefined : (
          <SubmitButton busy={busy} busyText="Saving..." disabled={!dirty} fullWidth={false} size="medium">
            Save changes
          </SubmitButton>
        )
      }
    >
      {stickySave && <StickySaveBar formId="personal-info" busy={busy} dirty={dirty} />}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
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
        <Box sx={fullRow}>
          <PhoneField
            label="Phone (optional)"
            value={{ country: form.phoneCountry, number: form.phone }}
            onChange={({ country, number }) => {
              setForm((prev) => ({ ...prev, phoneCountry: country, phone: number }));
              setErrors((prev) => ({ ...prev, phone: '' }));
            }}
            error={errors.phone}
          />
        </Box>
      </Box>
    </ProfileSection>
  );
}
