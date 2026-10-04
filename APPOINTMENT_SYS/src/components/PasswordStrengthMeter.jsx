import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { passwordStrength } from '../utils/validation';

const STRENGTH = [
  { label: 'Too weak', color: 'error' },
  { label: 'Weak', color: 'error' },
  { label: 'Fair', color: 'warning' },
  { label: 'Good', color: 'info' },
  { label: 'Strong', color: 'success' },
];

// Bar + label shown under a new-password field once the user starts typing.
export default function PasswordStrengthMeter({ password }) {
  if (!password) return null;
  const score = passwordStrength(password);
  const strength = STRENGTH[score];

  return (
    <Box sx={{ mt: 1 }} aria-live="polite">
      <LinearProgress
        variant="determinate"
        value={Math.max(5, (score / 4) * 100)}
        color={strength.color}
        sx={{ height: 6, borderRadius: 3 }}
      />
      <Typography variant="caption" color="text.secondary">
        Strength: {strength.label}
      </Typography>
    </Box>
  );
}
