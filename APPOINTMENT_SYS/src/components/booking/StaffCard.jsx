import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { formatTime, formatWorkingDays, initials } from '../../utils/format';

export default function StaffCard({ staff, selected, onSelect }) {
  return (
    <Card
      sx={{
        height: '100%',
        borderColor: selected ? 'primary.main' : 'divider',
        borderWidth: selected ? 2 : 1,
        transition: 'border-color 120ms, transform 120ms',
        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
      }}
    >
      <CardActionArea onClick={() => onSelect(staff)} sx={{ height: '100%', p: 2 }} aria-pressed={selected}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ width: 52, height: 52, bgcolor: selected ? 'primary.main' : 'action.selected', color: selected ? 'primary.contrastText' : 'text.primary', fontWeight: 600 }}>
            {initials(staff.name)}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600 }} noWrap>
              {staff.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {staff.specialization || 'Staff'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatWorkingDays(staff.workingDays)} · {formatTime(staff.startTime)} – {formatTime(staff.endTime)}
            </Typography>
          </Box>
          {selected && <CheckCircleRoundedIcon color="primary" />}
        </Stack>
      </CardActionArea>
    </Card>
  );
}
