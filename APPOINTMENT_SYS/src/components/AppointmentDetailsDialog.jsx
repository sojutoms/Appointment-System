import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { formatDate, formatDuration, formatPrice, formatTimeRange } from '../utils/format';
import { isActive } from '../utils/appointments';
import StatusChip from './StatusChip';

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

export default function AppointmentDetailsDialog({ appointment, showClient, onClose, onReschedule, onCancel }) {
  const appt = appointment;
  return (
    <Dialog open={Boolean(appt)} onClose={onClose} maxWidth="xs" fullWidth>
      {appt && (
        <>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            Appointment details
            <StatusChip status={appt.status} />
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <Field label="Service">
                {appt.service ? (
                  <>
                    {appt.service.name}
                    <Typography variant="body2" color="text.secondary">
                      {formatDuration(appt.service.durationMinutes)} · {formatPrice(appt.service.price)}
                    </Typography>
                  </>
                ) : (
                  'Service removed'
                )}
              </Field>
              <Field label="Specialist">
                {appt.staff ? `${appt.staff.name}${appt.staff.specialization ? ` · ${appt.staff.specialization}` : ''}` : 'Staff removed'}
              </Field>
              <Field label="When">
                {formatDate(appt.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                <Typography variant="body2" color="text.secondary">
                  {formatTimeRange(appt.startTime, appt.endTime)}
                </Typography>
              </Field>
              {showClient && appt.user && (
                <Field label="Client">
                  {appt.user.name}
                  <Typography variant="body2" color="text.secondary">
                    {appt.user.email}
                    {appt.user.phone ? ` · ${appt.user.phone}` : ''}
                  </Typography>
                </Field>
              )}
              <Divider />
              <Field label="Notes">
                <Typography sx={{ whiteSpace: 'pre-wrap', color: appt.notes ? 'text.primary' : 'text.disabled' }}>
                  {appt.notes || 'No notes'}
                </Typography>
              </Field>
              <Typography variant="caption" color="text.secondary">
                Booked on {new Date(appt.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            {isActive(appt) && (
              <>
                <Button color="error" onClick={() => onCancel(appt)} sx={{ mr: 'auto' }}>
                  Cancel appointment
                </Button>
                <Button onClick={() => onReschedule(appt)}>Reschedule</Button>
              </>
            )}
            <Button onClick={onClose} variant="contained">
              Close
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
