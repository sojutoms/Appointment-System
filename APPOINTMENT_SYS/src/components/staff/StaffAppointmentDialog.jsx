import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/errors';
import { formatDate, formatDuration, formatTimeRange } from '../../utils/format';
import { hasStarted } from '../../utils/staff';
import StatusChip from '../StatusChip';

function Field({ label, children }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography component="div">{children}</Typography>
    </Box>
  );
}

// Appointment details for staff: client contact info, the client's notes,
// private staff notes, and the confirm / complete actions.
export default function StaffAppointmentDialog({ appointment, onClose, onUpdated }) {
  const appt = appointment;
  const [staffNotes, setStaffNotes] = useState(appt.staffNotes ?? '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const save = async (changes, label) => {
    setBusy(label);
    setError('');
    try {
      const { data } = await api.patch(`/staff-portal/appointments/${appt._id}`, changes);
      onUpdated(data.appointment, label);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const notesChanged = staffNotes.trim() !== (appt.staffNotes ?? '');
  const canComplete = ['pending', 'confirmed'].includes(appt.status) && hasStarted(appt);

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        Appointment
        <StatusChip status={appt.status} />
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2}>
          <Field label="When">
            {formatDate(appt.date, { weekday: 'long', month: 'long', day: 'numeric' })}
            <Typography variant="body2" color="text.secondary">
              {formatTimeRange(appt.startTime, appt.endTime)}
            </Typography>
          </Field>
          <Field label="Service">
            {appt.service?.name ?? 'Service removed'}
            {appt.service && (
              <Typography variant="body2" color="text.secondary">
                {formatDuration(appt.service.durationMinutes)}
              </Typography>
            )}
          </Field>
          <Field label="Client">
            {appt.user?.name ?? 'Deleted account'}
            {appt.user && (
              <Typography variant="body2" component="div">
                <Link href={`mailto:${appt.user.email}`}>{appt.user.email}</Link>
                {appt.user.phone && (
                  <>
                    {' · '}
                    <Link href={`tel:${appt.user.phone.replace(/[^\d+]/g, '')}`}>{appt.user.phone}</Link>
                  </>
                )}
              </Typography>
            )}
          </Field>
          <Field label="Client's notes">
            <Typography sx={{ whiteSpace: 'pre-wrap', color: appt.notes ? 'text.primary' : 'text.disabled' }}>{appt.notes || 'No notes'}</Typography>
          </Field>
          <Divider />
          <TextField
            label="Staff notes"
            helperText={`Private: only staff and admins see these. ${staffNotes.length}/1000`}
            multiline
            minRows={3}
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value.slice(0, 1000))}
          />
          {notesChanged && (
            <Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => save({ staffNotes: staffNotes.trim() }, 'notes')}
                disabled={Boolean(busy)}
                startIcon={busy === 'notes' ? <CircularProgress size={14} color="inherit" /> : undefined}
              >
                Save notes
              </Button>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        {appt.status === 'pending' && (
          <Button color="success" variant="contained" onClick={() => save({ status: 'confirmed' }, 'confirmed')} disabled={Boolean(busy)}>
            Confirm
          </Button>
        )}
        {canComplete && (
          <Button variant="contained" onClick={() => save({ status: 'completed' }, 'completed')} disabled={Boolean(busy)}>
            Mark completed
          </Button>
        )}
        <Button onClick={onClose} disabled={Boolean(busy)}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
