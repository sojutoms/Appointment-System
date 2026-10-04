import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import api from '../api/axios';
import { getErrorMessage } from '../utils/errors';
import { addDays, formatDate, formatTime, formatTimeRange, todayString } from '../utils/format';

// Admin reschedule: same service and specialist, new date and time.
export default function RescheduleDialog({ appointment, onClose, onSaved }) {
  const [date, setDate] = useState(() => (appointment.date >= todayString() ? appointment.date : todayString()));
  const [slot, setSlot] = useState(null);
  const [slotsData, setSlotsData] = useState({ key: null, slots: [], message: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  // Bookings are allowed from today up to 60 days ahead (the picker's min/max
  // only guide the calendar; a typed date can be anything).
  const today = todayString();
  const lastDay = addDays(today, 60);
  const dateError = date && (date < today || date > lastDay) ? `Choose a date between today and ${formatDate(lastDay)}.` : '';

  const serviceId = appointment.service?._id;
  const staffId = appointment.staff?._id;
  const key = serviceId && staffId && date && !dateError ? `${date}|${refresh}` : null;
  const loading = Boolean(key) && slotsData.key !== key;

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    api
      .get('/appointments/available-slots', { params: { service: serviceId, staff: staffId, date, exclude: appointment._id } })
      .then(({ data }) => active && setSlotsData({ key, slots: data.slots, message: data.message || '' }))
      .catch((err) => active && setSlotsData({ key, slots: [], message: getErrorMessage(err) }));
    return () => {
      active = false;
    };
  }, [key, date, serviceId, staffId, appointment._id]);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api.put(`/appointments/${appointment._id}`, { date, startTime: slot.startTime });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
      // The chosen time may have just been taken: reload the free times.
      setSlot(null);
      setRefresh((n) => n + 1);
      setBusy(false);
    }
  };

  const available = slotsData.slots.filter((s) => s.available);

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reschedule appointment</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {appointment.user?.name} · {appointment.service?.name} with {appointment.staff?.name}
          <br />
          Currently {formatDate(appointment.date)}, {formatTimeRange(appointment.startTime, appointment.endTime)}
        </Typography>
        {(!serviceId || !staffId) && <Alert severity="warning">The service or specialist was removed, so this appointment can't be rescheduled.</Alert>}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          type="date"
          label="New date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSlot(null);
          }}
          error={Boolean(dateError)}
          helperText={dateError}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today, max: lastDay } }}
          sx={{ mb: 2, maxWidth: 240 }}
        />
        {loading && <Skeleton variant="rounded" height={88} />}
        {!loading && key && available.length === 0 && <Alert severity="info">{slotsData.message || 'No free times on this day.'}</Alert>}
        {!loading && available.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 1 }}>
            {available.map((s) => (
              <Button key={s.startTime} variant={slot?.startTime === s.startTime ? 'contained' : 'outlined'} onClick={() => setSlot(s)}>
                {formatTime(s.startTime)}
              </Button>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={!slot || busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Save new time
        </Button>
      </DialogActions>
    </Dialog>
  );
}
