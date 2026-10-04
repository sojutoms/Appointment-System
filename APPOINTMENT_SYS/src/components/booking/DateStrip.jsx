import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { parseDate } from '../../utils/format';

// Horizontally scrolling list of days. Days the staff member doesn't work are disabled.
export default function DateStrip({ dates, value, onChange, isDisabled }) {
  const scroller = useRef(null);

  // Keep the selected day in view (e.g. when it was picked automatically).
  useEffect(() => {
    scroller.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [value]);

  const scrollBy = (direction) => scroller.current?.scrollBy({ left: direction * 320, behavior: 'smooth' });

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <IconButton onClick={() => scrollBy(-1)} aria-label="Earlier dates" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
        <ChevronLeftRoundedIcon />
      </IconButton>
      <Box
        ref={scroller}
        role="listbox"
        aria-label="Choose a date"
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          py: 0.5,
          flexGrow: 1,
          scrollbarWidth: 'thin',
        }}
      >
        {dates.map((dateStr) => {
          const date = parseDate(dateStr);
          const disabled = isDisabled(dateStr);
          const selected = value === dateStr;
          return (
            <ButtonBase
              key={dateStr}
              disabled={disabled}
              aria-pressed={selected}
              aria-label={date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              onClick={() => onChange(dateStr)}
              sx={{
                flex: '0 0 auto',
                scrollSnapAlign: 'start',
                width: 64,
                py: 1.25,
                borderRadius: 2.5,
                flexDirection: 'column',
                border: 1,
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: selected ? 'primary.main' : 'background.paper',
                color: selected ? 'primary.contrastText' : 'text.primary',
                opacity: disabled ? 0.4 : 1,
                transition: 'background-color 120ms, border-color 120ms',
                '&:hover': selected ? undefined : { borderColor: 'primary.main' },
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.8 }}>
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </Typography>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3 }}>{date.getDate()}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {date.toLocaleDateString('en-US', { month: 'short' })}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>
      <IconButton onClick={() => scrollBy(1)} aria-label="Later dates" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
        <ChevronRightRoundedIcon />
      </IconButton>
    </Stack>
  );
}
