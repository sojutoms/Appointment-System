import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import api from '../api/axios';
import { getErrorMessage, getFieldErrors } from '../utils/errors';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Add (no `staff`) or edit (with `staff`) a staff member.
export default function StaffFormDialog({ staff, onClose, onSaved }) {
  const editing = Boolean(staff);
  // Once invited, the email is their login and can't be edited here.
  const hasLogin = Boolean(staff?.portal && staff.portal.status !== 'none');
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    name: staff?.name ?? '',
    specialization: staff?.specialization ?? '',
    email: staff?.email ?? '',
    services: staff?.services ?? [],
    workingDays: staff?.workingDays ?? [1, 2, 3, 4, 5],
    startTime: staff?.startTime ?? '09:00',
    endTime: staff?.endTime ?? '17:00',
    isActive: staff?.isActive ?? true,
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get('/services', { params: { includeInactive: true, limit: 50 } })
      .then(({ data }) => setServices(data.items))
      .catch(() => setServices([]));
  }, []);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Name is required.';
    if (form.email.trim() && !EMAIL.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!form.workingDays.length) nextErrors.workingDays = 'Select at least one working day.';
    if (!form.startTime || !form.endTime || form.startTime >= form.endTime) nextErrors.endTime = 'End time must be later than start time.';
    if (!form.services.length) nextErrors.services = 'Select at least one service so clients can book this person.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      specialization: form.specialization.trim(),
      ...(!hasLogin && { email: form.email.trim().toLowerCase() }),
      services: form.services.map((s) => s._id),
      workingDays: form.workingDays,
      startTime: form.startTime,
      endTime: form.endTime,
      isActive: form.isActive,
    };
    try {
      const { data } = editing ? await api.put(`/staff/${staff._id}`, payload) : await api.post('/staff', payload);
      onSaved(data.staff);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <Box component="form" noValidate onSubmit={submit}>
        <DialogTitle>{editing ? 'Edit staff member' : 'Add staff member'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField label="Full name" autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} error={Boolean(errors.name)} helperText={errors.name} slotProps={{ htmlInput: { maxLength: 80 } }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Specialization" placeholder="e.g. General Practitioner" value={form.specialization} onChange={(e) => set('specialization', e.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
              <TextField
                label="Work email (optional)"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                disabled={hasLogin}
                error={Boolean(errors.email)}
                helperText={errors.email || (hasLogin ? 'Used as their staff-portal login. Revoke access to change it.' : 'Needed for a staff-portal invite. Only visible to admins.')}
              />
            </Stack>

            <Autocomplete
              multiple
              options={services}
              value={form.services}
              onChange={(_e, value) => set('services', value)}
              getOptionLabel={(s) => s.name}
              isOptionEqualToValue={(a, b) => a._id === b._id}
              renderValue={(value, getItemProps) =>
                value.map((s, index) => {
                  const { key, ...itemProps } = getItemProps({ index });
                  return <Chip key={key} label={s.name} size="small" {...itemProps} />;
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="Services offered" error={Boolean(errors.services)} helperText={errors.services} />
              )}
            />

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Working days
              </Typography>
              <ToggleButtonGroup
                value={form.workingDays}
                onChange={(_e, value) => set('workingDays', [...value].sort())}
                aria-label="Working days"
                size="small"
                sx={{ flexWrap: 'wrap' }}
              >
                {DAYS.map((d, i) => (
                  <ToggleButton key={d} value={i} aria-label={d} sx={{ px: 1.75 }}>
                    {d}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              {errors.workingDays && <FormHelperText error>{errors.workingDays}</FormHelperText>}
            </Box>

            <Stack direction="row" spacing={2}>
              <TextField label="Starts" type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 1800 } }} />
              <TextField
                label="Ends"
                type="time"
                value={form.endTime}
                onChange={(e) => set('endTime', e.target.value)}
                error={Boolean(errors.endTime)}
                helperText={errors.endTime}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 1800 } }}
              />
            </Stack>

            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />}
              label={form.isActive ? 'Active: clients can book with this person' : 'Inactive: hidden from clients'}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {editing ? 'Save changes' : 'Add staff member'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
