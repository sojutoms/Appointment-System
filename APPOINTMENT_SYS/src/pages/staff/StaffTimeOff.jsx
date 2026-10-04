import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import api from '../../api/axios';
import { fetchAll } from '../../api/fetchAll';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import useToast from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/errors';
import { addDays, formatDate, formatTime, todayString } from '../../utils/format';

const EMPTY = { allDay: true, startTime: '09:00', endTime: '12:00', reason: '' };

// Staff add and remove their own time off. Clients can't book during it.
export default function StaffTimeOff() {
  const showToast = useToast();
  const [entries, setEntries] = useState(null);
  const [form, setForm] = useState({ ...EMPTY, date: addDays(todayString(), 1) });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  // The list has its own error, so a failed form submit doesn't affect it (and vice versa).
  const [listError, setListError] = useState('');

  useEffect(() => {
    let active = true;
    fetchAll('/time-off')
      .then((items) => {
        if (!active) return;
        setEntries(items);
        setListError('');
      })
      .catch((err) => active && setListError(getErrorMessage(err)));
    return () => {
      active = false;
    };
  }, [refresh]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const today = todayString();
    if (!form.date) {
      setError('Choose a date.');
      return;
    }
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
        date: form.date,
        allDay: form.allDay,
        ...(!form.allDay && { startTime: form.startTime, endTime: form.endTime }),
        reason: form.reason.trim(),
      });
      showToast('Time off added. Clients can no longer book during it.');
      setForm((prev) => ({ ...EMPTY, date: prev.date }));
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setRemoveBusy(true);
    try {
      await api.delete(`/time-off/${removing._id}`);
      showToast('Time off removed. Those times are bookable again.');
      setRemoving(null);
      setRefresh((n) => n + 1);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <Container sx={{ py: { xs: 4, md: 6 } }}>
      <Typography variant="h4" component="h1">
        Time off
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Block days or hours when you can&apos;t see clients. The reason is only visible to you and the admins.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
                Add time off
              </Typography>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Box component="form" noValidate onSubmit={submit}>
                <Stack spacing={2.5}>
                  <TextField
                    type="date"
                    label="Date"
                    value={form.date}
                    onChange={(e) => set('date', e.target.value)}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayString(), max: addDays(todayString(), 180) } }}
                  />
                  <FormControlLabel control={<Switch checked={form.allDay} onChange={(e) => set('allDay', e.target.checked)} />} label="All day" />
                  {!form.allDay && (
                    <Stack direction="row" spacing={2}>
                      <TextField type="time" label="From" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                      <TextField type="time" label="Until" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                    </Stack>
                  )}
                  <TextField
                    label="Reason (optional)"
                    placeholder="e.g. Vacation, training"
                    value={form.reason}
                    onChange={(e) => set('reason', e.target.value)}
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                  />
                  <Alert severity="info">If clients are already booked in this period, ask an administrator to move those appointments first.</Alert>
                  <Box>
                    <Button type="submit" variant="contained" disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>
                      Add time off
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <Box sx={{ px: 2.5, py: 2 }}>
              <Typography variant="h6" component="h2">
                Upcoming time off
              </Typography>
            </Box>
            <Divider />
            {listError && (
              <Alert severity="error" sx={{ m: 2 }}>
                {listError}
              </Alert>
            )}
            {entries === null && !listError && <Skeleton variant="rounded" height={120} sx={{ m: 2 }} />}
            {entries?.length === 0 && <EmptyState icon={BeachAccessOutlinedIcon} title="No time off scheduled" description="Anything you add appears here." />}
            {entries?.map((t, i) => (
              <Box key={t._id}>
                {i > 0 && <Divider />}
                <Stack direction="row" spacing={2} sx={{ px: 2.5, py: 1.75, alignItems: 'center' }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }}>{formatDate(t.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t.allDay ? 'All day' : `${formatTime(t.startTime)} – ${formatTime(t.endTime)}`}
                      {t.reason ? ` · ${t.reason}` : ''}
                    </Typography>
                  </Box>
                  <Tooltip title="Remove">
                    <IconButton onClick={() => setRemoving(t)} aria-label="Remove time off">
                      <DeleteOutlineRoundedIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            ))}
          </Card>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={Boolean(removing)}
        busy={removeBusy}
        title="Remove this time off?"
        message={removing && `${formatDate(removing.date)} will become bookable again${removing.allDay ? '' : ` from ${formatTime(removing.startTime)} to ${formatTime(removing.endTime)}`}.`}
        confirmText="Remove"
        cancelText="Keep"
        color="primary"
        onConfirm={remove}
        onClose={() => setRemoving(null)}
      />
    </Container>
  );
}
