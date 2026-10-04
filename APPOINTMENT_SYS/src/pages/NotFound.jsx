import { Link as RouterLink } from 'react-router-dom';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

export default function NotFound() {
  return (
    <Container sx={{ py: 10, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 96, fontWeight: 800, color: 'primary.main', opacity: 0.25, lineHeight: 1 }}>404</Typography>
      <Typography variant="h5" component="h1" gutterBottom>
        Page not found
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        The page you are looking for does not exist or was moved.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Go home
      </Button>
    </Container>
  );
}
