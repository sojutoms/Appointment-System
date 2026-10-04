import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import useCountdown, { formatSeconds } from '../hooks/useCountdown';

// "Resend code" link that stays locked while the cooldown runs.
// `onResend` must return a promise; the parent handles success and errors.
export default function ResendCode({ cooldownUntil, onResend, disabled }) {
  const secondsLeft = useCountdown(cooldownUntil);
  const [sending, setSending] = useState(false);

  const handleClick = async () => {
    setSending(true);
    try {
      await onResend();
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary" component="div">
        Didn&apos;t get the code?{' '}
        {secondsLeft > 0 ? (
          <span aria-live="polite">
            Resend in{' '}
            <Box component="span" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'text.primary' }}>
              {formatSeconds(secondsLeft)}
            </Box>
          </span>
        ) : (
          <Button
            size="small"
            onClick={handleClick}
            disabled={sending || disabled}
            startIcon={sending ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ verticalAlign: 'baseline', py: 0 }}
          >
            {sending ? 'Sending...' : 'Resend code'}
          </Button>
        )}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Check your spam folder too.
      </Typography>
    </Box>
  );
}
