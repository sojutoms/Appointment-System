import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { formatDuration, formatPrice } from '../utils/format';

// Shows a service. Pass `onSelect` to make it selectable (booking page).
export default function ServiceCard({ service, selected = false, onSelect }) {
  const content = (
    <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
          {service.name}
        </Typography>
        {selected && <CheckCircleRoundedIcon color="primary" />}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
        {service.description}
      </Typography>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
          <ScheduleRoundedIcon sx={{ fontSize: 18 }} />
          <Typography variant="body2">{formatDuration(service.durationMinutes)}</Typography>
        </Box>
        <Typography sx={{ fontWeight: 700 }}>{formatPrice(service.price)}</Typography>
      </Stack>
    </CardContent>
  );

  return (
    <Card
      sx={{
        height: '100%',
        borderColor: selected ? 'primary.main' : 'divider',
        borderWidth: selected ? 2 : 1,
        transition: 'border-color 120ms, box-shadow 120ms, transform 120ms',
        '&:hover': onSelect ? { borderColor: 'primary.main', transform: 'translateY(-2px)' } : undefined,
      }}
    >
      {onSelect ? (
        <CardActionArea onClick={() => onSelect(service)} sx={{ height: '100%' }} aria-pressed={selected}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  );
}
