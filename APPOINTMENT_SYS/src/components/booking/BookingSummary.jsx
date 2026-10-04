import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { formatDate, formatDuration, formatPrice, formatTimeRange } from '../../utils/format';

function Row({ icon: Icon, label, value, placeholder }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      <Icon sx={{ color: 'text.secondary', mt: 0.25 }} fontSize="small" />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography sx={{ fontWeight: value ? 600 : 400, color: value ? 'text.primary' : 'text.disabled' }}>
          {value || placeholder}
        </Typography>
      </Box>
    </Stack>
  );
}

// The user's choices so far; shown beside the booking steps and on the confirm step.
export default function BookingSummary({ service, staff, date, slot }) {
  return (
    <Stack spacing={2}>
      <Row icon={MedicalServicesOutlinedIcon} label="Service" value={service?.name} placeholder="Not selected" />
      <Row
        icon={PersonOutlineRoundedIcon}
        label="Specialist"
        value={staff && `${staff.name}${staff.specialization ? ` · ${staff.specialization}` : ''}`}
        placeholder="Not selected"
      />
      <Row icon={CalendarMonthOutlinedIcon} label="Date" value={date && formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} placeholder="Not selected" />
      <Row icon={ScheduleRoundedIcon} label="Time" value={slot && formatTimeRange(slot.startTime, slot.endTime)} placeholder="Not selected" />
      {service && (
        <>
          <Divider />
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography color="text.secondary">{formatDuration(service.durationMinutes)}</Typography>
            <Typography sx={{ fontWeight: 700 }}>{formatPrice(service.price)}</Typography>
          </Stack>
        </>
      )}
    </Stack>
  );
}
