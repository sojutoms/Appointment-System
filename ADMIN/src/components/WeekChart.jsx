import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { parseDate } from '../utils/format';

const SERIES = [
  { key: 'confirmed', label: 'Confirmed', color: 'success.main' },
  { key: 'pending', label: 'Pending', color: 'warning.main' },
];

// Stacked bar chart of active bookings for the next 7 days (built with plain boxes).
export default function WeekChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.pending + d.confirmed));

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        {SERIES.map((s) => (
          <Stack key={s.key} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: s.color }} />
            <Typography variant="caption" color="text.secondary">
              {s.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
      <Box
        role="img"
        aria-label={`Bookings per day: ${days.map((d) => `${d.date} ${d.pending + d.confirmed}`).join(', ')}`}
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 1, sm: 2 }, alignItems: 'end', height: 180 }}
      >
        {days.map((d, i) => {
          const total = d.pending + d.confirmed;
          const date = parseDate(d.date);
          return (
            <Tooltip key={d.date} title={`${date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}: ${d.confirmed} confirmed, ${d.pending} pending`}>
              <Stack sx={{ height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 0.75 }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {total || ''}
                </Typography>
                <Box sx={{ width: '100%', maxWidth: 44, display: 'flex', flexDirection: 'column', borderRadius: 1.5, overflow: 'hidden', minHeight: 4, bgcolor: total ? 'transparent' : 'action.hover' }}>
                  {SERIES.slice()
                    .reverse()
                    .map((s) =>
                      d[s.key] ? <Box key={s.key} sx={{ height: `${(d[s.key] / max) * 130}px`, bgcolor: s.color }} /> : null
                    )}
                </Box>
                <Typography variant="caption" color={i === 0 ? 'primary' : 'text.secondary'} sx={{ fontWeight: i === 0 ? 700 : 400 }}>
                  {i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Typography>
              </Stack>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}
