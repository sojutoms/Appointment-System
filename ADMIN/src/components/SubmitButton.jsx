import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

// Full-width form submit button that shows a spinner and `busyText` while working.
export default function SubmitButton({ busy, busyText = 'Please wait...', children, disabled, ...props }) {
  return (
    <Button
      type="submit"
      variant="contained"
      size="large"
      fullWidth
      disabled={busy || disabled}
      startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
      {...props}
    >
      {busy ? busyText : children}
    </Button>
  );
}
