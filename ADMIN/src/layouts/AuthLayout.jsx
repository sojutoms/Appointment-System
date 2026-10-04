import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Brand from '../components/Brand';
import ColorModeToggle from '../components/ColorModeToggle';
import PageLoader from '../components/PageLoader';

export default function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
        position: 'relative',
        background: (theme) => `radial-gradient(circle at 50% 0%, rgba(${theme.vars.palette.primary.mainChannel} / 0.12), transparent 55%)`,
      }}
    >
      <ColorModeToggle sx={{ position: 'absolute', top: 12, right: 12 }} />
      <Box sx={{ mb: 3 }}>
        <Brand to="/login" />
      </Box>
      <Paper variant="outlined" sx={{ width: '100%', maxWidth: 440, p: { xs: 3, sm: 5 }, borderRadius: 4 }}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </Paper>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 3, textAlign: 'center', maxWidth: 400 }}>
        Restricted area. Access is limited to authorized administrators and all activity is logged.
      </Typography>
    </Box>
  );
}
