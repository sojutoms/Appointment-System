import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined';
import WbTwilightOutlinedIcon from '@mui/icons-material/WbTwilightOutlined';
import NightsStayOutlinedIcon from '@mui/icons-material/NightsStayOutlined';
import { formatTime } from '../../utils/format';

const PERIODS = [
  { label: 'Morning', icon: WbSunnyOutlinedIcon, test: (h) => h < 12 },
  { label: 'Afternoon', icon: WbTwilightOutlinedIcon, test: (h) => h >= 12 && h < 17 },
  { label: 'Evening', icon: NightsStayOutlinedIcon, test: (h) => h >= 17 },
];

const gridSx = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 1 };

// Time slots grouped into morning / afternoon / evening. Taken or past slots are disabled.
export default function TimeSlotGrid({ slots, loading, value, onChange }) {
  if (loading) {
    return (
      <Box sx={gridSx}>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} variant="rounded" height={40} />
        ))}
      </Box>
    );
  }

  return (
    <Stack spacing={2.5}>
      {PERIODS.map(({ label, icon: Icon, test }) => {
        const group = slots.filter((s) => test(Number(s.startTime.slice(0, 2))));
        if (!group.length) return null;
        return (
          <Box key={label}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1, color: 'text.secondary' }}>
              <Icon sx={{ fontSize: 18 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {label}
              </Typography>
            </Stack>
            <Box sx={gridSx}>
              {group.map((slot) => {
                const selected = value === slot.startTime;
                return (
                  <Button
                    key={slot.startTime}
                    variant={selected ? 'contained' : 'outlined'}
                    disabled={!slot.available}
                    onClick={() => onChange(slot)}
                    aria-pressed={selected}
                    title={slot.available ? undefined : { booked: 'Already booked', unavailable: 'Not available', past: 'This time has passed' }[slot.reason]}
                    sx={{
                      fontVariantNumeric: 'tabular-nums',
                      ...(!slot.available && { textDecoration: 'line-through' }),
                    }}
                  >
                    {formatTime(slot.startTime)}
                  </Button>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
