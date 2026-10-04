import { Suspense, useCallback, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import Brand from '../components/Brand';
import ColorModeToggle from '../components/ColorModeToggle';
import PageLoader from '../components/PageLoader';
import useAuth from '../hooks/useAuth';
import useCountdown from '../hooks/useCountdown';
import useIdleTimeout from '../hooks/useIdleTimeout';
import { initials } from '../utils/format';

const DRAWER_WIDTH = 248;
const IDLE_MINUTES = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES) || 15;

const NAV = [
  { to: '/', label: 'Dashboard', icon: DashboardOutlinedIcon, end: true },
  { to: '/appointments', label: 'Appointments', icon: EventNoteOutlinedIcon },
  { to: '/services', label: 'Services', icon: MedicalServicesOutlinedIcon },
  { to: '/staff', label: 'Staff', icon: BadgeOutlinedIcon },
  { to: '/users', label: 'Users', icon: GroupOutlinedIcon },
  { to: '/audit-log', label: 'Audit log', icon: HistoryRoundedIcon },
];

const navItemSx = {
  borderRadius: 2,
  mx: 1.5,
  mb: 0.5,
  color: 'text.secondary',
  '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 40 },
  '&.active': {
    color: 'primary.main',
    bgcolor: (theme) => `rgba(${theme.vars.palette.primary.mainChannel} / 0.1)`,
    fontWeight: 600,
  },
};

function SessionTimer() {
  const { sessionEndsAt } = useAuth();
  const secondsLeft = useCountdown(sessionEndsAt);
  if (!sessionEndsAt) return null;
  const minutes = Math.ceil(secondsLeft / 60);
  const label = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
  return (
    <Tooltip title="Admin sessions last 2 hours, then you sign in again with a new code.">
      <Chip
        icon={<TimerOutlinedIcon />}
        label={`Session: ${label}`}
        size="small"
        variant="outlined"
        color={minutes <= 10 ? 'warning' : 'default'}
        sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
      />
    </Tooltip>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleIdle = useCallback(async () => {
    // Wait for the sign-out so the login page doesn't still see a user and bounce back.
    await logout(`You were signed out after ${IDLE_MINUTES} minutes of inactivity.`);
    navigate('/login', { replace: true });
  }, [logout, navigate]);
  const { warning, secondsLeft, stayActive } = useIdleTimeout({ timeoutMs: IDLE_MINUTES * 60_000, onTimeout: handleIdle });

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2.5 }}>
        <Brand />
      </Toolbar>
      <Divider />
      <List sx={{ pt: 2, flexGrow: 1 }} onClick={() => setMobileOpen(false)}>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <ListItemButton key={to} component={NavLink} to={to} end={end} sx={navItemSx}>
            <ListItemIcon>
              <Icon />
            </ListItemIcon>
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <List onClick={() => setMobileOpen(false)}>
        <ListItemButton component={NavLink} to="/account" sx={navItemSx}>
          <ListItemIcon>
            <ManageAccountsOutlinedIcon />
          </ListItemIcon>
          <ListItemText primary="My account" />
        </ListItemButton>
        <ListItemButton onClick={handleLogout} sx={navItemSx}>
          <ListItemIcon>
            <LogoutRoundedIcon />
          </ListItemIcon>
          <ListItemText primary="Sign out" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: (theme) => `rgba(${theme.vars.palette.background.paperChannel} / 0.85)`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }} aria-label="Open menu">
            <MenuRoundedIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <SessionTimer />
          <ColorModeToggle />
          <Tooltip title={user.email}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: 'primary.main' }}>{initials(user.name)}</Avatar>
              <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600 }}>{user.name.split(' ')[0]}</Typography>
            </Box>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }} aria-label="Admin sections">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, sm: 3, lg: 4 } }}>
        <Toolbar />
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </Box>

      <Dialog open={warning} maxWidth="xs" fullWidth>
        <DialogTitle>Are you still there?</DialogTitle>
        <DialogContent>
          <Typography>
            For security, you&apos;ll be signed out in <strong>{secondsLeft}s</strong> because of inactivity.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleLogout} color="inherit">
            Sign out now
          </Button>
          <Button onClick={stayActive} variant="contained" autoFocus>
            Stay signed in
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
