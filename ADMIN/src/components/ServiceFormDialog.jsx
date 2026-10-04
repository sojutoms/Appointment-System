import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import api from '../api/axios';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { formatDuration } from '../utils/format';
import { LIMITS, validatePrice, validateServiceName } from '../utils/validation';

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];

// Add (no `service`) or edit (with `service`) a service.
export default function ServiceFormDialog({ service, onClose, onSaved }) {
  const editing = Boolean(service);
  const [form, setForm] = useState({
    name: service?.name ?? '',
    description: service?.description ?? '',
    durationMinutes: service?.durationMinutes ?? 30,
    price: service ? String(service.price) : '',
    isActive: service?.isActive ?? true,
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    const nameError = validateServiceName(form.name);
    if (nameError) nextErrors.name = nameError;
    if (form.description.length > LIMITS.description) nextErrors.description = `Description must be ${LIMITS.description} characters or less.`;
    const priceError = validatePrice(form.price.trim());
    if (priceError) nextErrors.price = priceError;
    const price = Number(form.price);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    setError('');
    const payload = {
      name: form.name.replace(/\s+/g, ' ').trim(),
      description: form.description.trim(),
      durationMinutes: Number(form.durationMinutes),
      price,
      isActive: form.isActive,
    };
    try {
      const { data } = editing ? await api.put(`/services/${service._id}`, payload) : await api.post('/services', payload);
      onSaved(data.service);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <Box component="form" noValidate onSubmit={submit}>
        <DialogTitle>{editing ? 'Edit service' : 'Add service'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField label="Name" autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} error={Boolean(errors.name)} helperText={errors.name} slotProps={{ htmlInput: { maxLength: LIMITS.serviceName } }} />
            <TextField
              label="Description"
              multiline
              minRows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              error={Boolean(errors.description)}
              helperText={errors.description || `${form.description.length}/${LIMITS.description}`}
              slotProps={{ htmlInput: { maxLength: LIMITS.description } }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select label="Duration" value={form.durationMinutes} onChange={(e) => set('durationMinutes', e.target.value)}>
                {[...new Set([...DURATIONS, Number(form.durationMinutes)])]
                  .sort((a, b) => a - b)
                  .map((m) => (
                    <MenuItem key={m} value={m}>
                      {formatDuration(m)}
                    </MenuItem>
                  ))}
              </TextField>
              <TextField
                label="Price"
                type="number"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                error={Boolean(errors.price)}
                helperText={errors.price}
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start">₱</InputAdornment> },
                  htmlInput: { min: 0, max: LIMITS.priceMax, step: 50, inputMode: 'decimal' },
                }}
              />
            </Stack>
            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />}
              label={form.isActive ? 'Active: clients can book this service' : 'Inactive: hidden from clients'}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {editing ? 'Save changes' : 'Add service'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
