import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export default function NotFound() {
  return (
    <Box sx={{ py: 10, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 96, fontWeight: 800, color: 'primary.main', opacity: 0.25, lineHeight: 1 }}>404</Typography>
      <Typography variant="h5" component="h1" gutterBottom>
        Page not found
      </Typography>
      <Button component={RouterLink} to="/" variant="contained" sx={{ mt: 2 }}>
        Back to dashboard
      </Button>
    </Box>
  );
}
