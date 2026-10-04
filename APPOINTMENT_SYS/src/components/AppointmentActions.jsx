import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import { isActive } from '../utils/appointments';

// Reschedule / cancel for active appointments; delete for finished ones.
export default function AppointmentActions({ appointment, onReschedule, onCancel, onDelete }) {
  const stop = (fn) => (e) => {
    e.stopPropagation(); // don't also open the details dialog
    fn(appointment);
  };

  return (
    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
      {isActive(appointment) ? (
        <>
          <Tooltip title="Reschedule">
            <IconButton size="small" onClick={stop(onReschedule)} aria-label="Reschedule">
              <EditCalendarRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cancel appointment">
            <IconButton size="small" color="error" onClick={stop(onCancel)} aria-label="Cancel appointment">
              <EventBusyRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ) : (
        <Tooltip title="Remove from history">
          <IconButton size="small" onClick={stop(onDelete)} aria-label="Remove from history">
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}
