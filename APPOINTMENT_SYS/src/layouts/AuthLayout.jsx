import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import Brand from '../components/Brand';
import ColorModeToggle from '../components/ColorModeToggle';
import PageLoader from '../components/PageLoader';

const HIGHLIGHTS = [
  { icon: ScheduleRoundedIcon, text: 'See open time slots in real time' },
  { icon: EventAvailableRoundedIcon, text: 'Book, reschedule or cancel in seconds' },
  { icon: LockOutlinedIcon, text: 'Your account and data stay secure' },
];

// Split-screen layout for the login, sign-up and password pages.
export default function AuthLayout() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(380px, 5fr) 7fr' } }}>
      <Box
        component="aside"
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 4,
          p: 6,
          color: '#fff',
          background:
            'radial-gradient(circle at 20% 15%, rgba(255,255,255,0.14), transparent 45%), linear-gradient(150deg, #4f46e5 0%, #4338ca 55%, #312e81 100%)',
        }}
      >
        <Brand light />
        <div>
          <Typography variant="h3" component="h2" sx={{ fontSize: '2.2rem', mb: 2 }}>
            Appointments without the phone calls.
          </Typography>
          <Typography sx={{ opacity: 0.8, mb: 4 }}>
            Choose a service, pick a time that works for you, and get on with your day.
          </Typography>
          <Stack component="ul" spacing={2} sx={{ listStyle: 'none', p: 0, m: 0 }}>
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <Stack component="li" key={text} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Box sx={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)' }}>
                  <Icon fontSize="small" />
                </Box>
                <Typography>{text}</Typography>
              </Stack>
            ))}
          </Stack>
        </div>
        <Typography variant="body2" sx={{ opacity: 0.5 }}>
          © {new Date().getFullYear()} CliniQuick
        </Typography>
      </Box>

      <Box
        component="main"
        sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 2, py: 4 }}
      >
        <ColorModeToggle sx={{ position: 'absolute', top: 12, right: 12 }} />
        <Box sx={{ display: { lg: 'none' }, mb: 3 }}>
          <Brand />
        </Box>
        <Paper variant="outlined" sx={{ width: '100%', maxWidth: 460, p: { xs: 3, sm: 5 }, borderRadius: 4 }}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </Paper>
      </Box>
    </Box>
  );
}
