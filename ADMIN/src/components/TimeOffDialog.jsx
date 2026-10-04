import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import api from '../api/axios';
import { fetchAll } from '../api/fetchAll';
import ConfirmDialog from './ConfirmDialog';
import { getErrorMessage } from '../utils/errors';
import { addDays, formatDate, formatTime, todayString } from '../utils/format';

const EMPTY = { date: '', allDay: true, startTime: '09:00', endTime: '12:00', reason: '' };

// View, add and remove a staff member's upcoming time off.
export default function TimeOffDialog({ staff, onClose, onChanged }) {
  const [entries, setEntries] = useState(null);
  const [form, setForm] = useState({ ...EMPTY, date: todayString() });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    fetchAll('/time-off', { staff: staff._id })
      .then((items) => active && setEntries(items))
      .catch((err) => active && setError(getErrorMessage(err)));
    return () => {
      active = false;
    };
  }, [staff._id, refresh]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const add = async (e) => {
    e.preventDefault();
    setError('');
    const today = todayString();
    if (form.date < today || form.date > addDays(today, 180)) {
      setError('Choose a date between today and 180 days from now.');
      return;
    }
    if (!form.allDay && form.startTime >= form.endTime) {
      setError('End time must be later than start time.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/time-off', {
        staff: staff._id,
        date: form.date,
        allDay: form.allDay,
        ...(!form.allDay && { startTime: form.startTime, endTime: form.endTime }),
        reason: form.reason.trim(),
      });
      setForm({ ...EMPTY, date: form.date });
      setRefresh((n) => n + 1);
      onChanged?.('Time off added.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // Removing reopens those times for booking, so it is confirmed first, and the
  // entry is locked while the request runs (no double DELETE on a double-click).
  const [removing, setRemoving] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const remove = async () => {
    setError('');
    setRemoveBusy(true);
    try {
      await api.delete(`/time-off/${removing._id}`);
      setRefresh((n) => n + 1);
      onChanged?.('Time off removed.');
      setRemoving(null);
    } catch (err) {
      setError(getErrorMessage(err));
      setRemoving(null);
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <Dialog open onClose={busy || removeBusy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Time off · {staff.name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Clients can&apos;t book during time off. Periods that already have bookings must be cleared first.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" noValidate onSubmit={add}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
              <TextField
                type="date"
                label="Date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayString(), max: addDays(todayString(), 180) } }}
                sx={{ maxWidth: { sm: 200 } }}
              />
              <FormControlLabel control={<Switch checked={form.allDay} onChange={(e) => set('allDay', e.target.checked)} />} label="All day" />
            </Stack>
            {!form.allDay && (
              <Stack direction="row" spacing={2}>
                <TextField type="time" label="From" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField type="time" label="Until" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              </Stack>
            )}
            <TextField label="Reason (optional, staff and admins only)" value={form.reason} onChange={(e) => set('reason', e.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
            <Box>
              <Button type="submit" variant="contained" disabled={busy || !form.date} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>
                Add time off
              </Button>
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Upcoming
        </Typography>
        {entries === null && !error && <Skeleton variant="rounded" height={80} />}
        {entries?.length === 0 && <Typography color="text.secondary">No time off scheduled.</Typography>}
        {entries?.length > 0 && (
          <List dense disablePadding>
            {entries.map((t) => (
              <ListItem
                key={t._id}
                disableGutters
                secondaryAction={
                  <IconButton edge="end" aria-label="Remove time off" onClick={() => setRemoving(t)} disabled={removeBusy}>
                    <DeleteOutlineRoundedIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={`${formatDate(t.date)} · ${t.allDay ? 'All day' : `${formatTime(t.startTime)} – ${formatTime(t.endTime)}`}`}
                  secondary={t.reason || null}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={busy || removeBusy}>
          Done
        </Button>
      </DialogActions>
      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this time off?"
        message={
          removing
            ? `${formatDate(removing.date)} · ${removing.allDay ? 'All day' : `${formatTime(removing.startTime)} – ${formatTime(removing.endTime)}`} will become bookable again.`
            : ''
        }
        confirmText="Remove"
        busy={removeBusy}
        onConfirm={remove}
        onClose={() => setRemoving(null)}
      />
    </Dialog>
  );
}
