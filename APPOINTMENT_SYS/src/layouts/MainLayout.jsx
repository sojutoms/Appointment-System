import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import AppNavbar from '../components/AppNavbar';
import PageLoader from '../components/PageLoader';

export default function MainLayout() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {/* Pages are lazy-loaded; keep the navbar visible while one downloads. */}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </Box>
      <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container sx={{ py: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} CliniQuick · Online Appointment System
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
