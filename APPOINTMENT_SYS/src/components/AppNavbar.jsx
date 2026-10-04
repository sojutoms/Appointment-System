import { useState } from 'react';
import { NavLink, Link as RouterLink, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import useAuth from '../hooks/useAuth';
import { initials } from '../utils/format';
import { homeFor } from '../utils/roles';
import Brand from './Brand';
import ColorModeToggle from './ColorModeToggle';

const USER_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardOutlinedIcon },
  { to: '/book', label: 'Book', icon: AddCircleOutlineRoundedIcon },
  { to: '/appointments', label: 'My Appointments', icon: EventNoteOutlinedIcon },
];
const STAFF_LINKS = [
  { to: '/staff', label: 'My Schedule', icon: CalendarMonthOutlinedIcon, end: true },
  { to: '/staff/time-off', label: 'Time Off', icon: BeachAccessOutlinedIcon },
];
const GUEST_LINKS = [{ to: '/', label: 'Home', icon: HomeOutlinedIcon, end: true }];

// Highlights the current page's link.
const activeLinkSx = {
  color: 'text.secondary',
  '&.active': {
    color: 'primary.main',
    bgcolor: (theme) => `rgba(${theme.vars.palette.primary.mainChannel} / 0.08)`,
  },
};

export default function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = !user ? GUEST_LINKS : user.role === 'staff' ? STAFF_LINKS : USER_LINKS;

  const handleLogout = () => {
    setMenuAnchor(null);
    setDrawerOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: (theme) => `rgba(${theme.vars.palette.background.paperChannel} / 0.85)`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <Container>
        <Toolbar disableGutters sx={{ gap: 1 }}>
          <Brand to={user ? homeFor(user) : '/'} />

          {/* Desktop links */}
          <Box component="nav" sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, ml: 4, flexGrow: 1 }}>
            {links.map(({ to, label, end }) => (
              <Button key={to} component={NavLink} to={to} end={end} sx={activeLinkSx}>
                {label}
              </Button>
            ))}
          </Box>
          <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />

          <ColorModeToggle />

          {user ? (
            <>
              <Button
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                color="inherit"
                sx={{ display: { xs: 'none', md: 'inline-flex' }, gap: 1, pl: 1 }}
                aria-controls={menuAnchor ? 'user-menu' : undefined}
                aria-haspopup="true"
              >
                <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: 'primary.main' }}>{initials(user.name)}</Avatar>
                {user.name.split(' ')[0]}
              </Button>
              <Menu
                id="user-menu"
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { minWidth: 220, mt: 1 } } }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{user.name}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {user.email}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem component={RouterLink} to="/profile" onClick={() => setMenuAnchor(null)}>
                  <ListItemIcon>
                    <PersonOutlineRoundedIcon fontSize="small" />
                  </ListItemIcon>
                  My profile
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutRoundedIcon fontSize="small" />
                  </ListItemIcon>
                  Log out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
              <Button component={RouterLink} to="/login" variant="outlined">
                Log in
              </Button>
              <Button component={RouterLink} to="/register" variant="contained">
                Sign up
              </Button>
            </Box>
          )}

          {/* Mobile menu */}
          <IconButton
            onClick={() => setDrawerOpen(true)}
            sx={{ display: user ? { xs: 'inline-flex', md: 'none' } : { xs: 'inline-flex', sm: 'none' } }}
            aria-label="Open menu"
          >
            <MenuRoundedIcon />
          </IconButton>
        </Toolbar>
      </Container>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 280 }} role="presentation">
          {user && (
            <Box sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>{initials(user.name)}</Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }} noWrap>
                  {user.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {user.email}
                </Typography>
              </Box>
            </Box>
          )}
          <Divider />
          <List onClick={() => setDrawerOpen(false)}>
            {links.map(({ to, label, icon: Icon, end }) => (
              <ListItemButton key={to} component={NavLink} to={to} end={end} sx={activeLinkSx}>
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <Icon />
                </ListItemIcon>
                <ListItemText primary={label} />
              </ListItemButton>
            ))}
            {user ? (
              <>
                <ListItemButton component={NavLink} to="/profile" sx={activeLinkSx}>
                  <ListItemIcon sx={{ color: 'inherit' }}>
                    <PersonOutlineRoundedIcon />
                  </ListItemIcon>
                  <ListItemText primary="My profile" />
                </ListItemButton>
                <Divider sx={{ my: 1 }} />
                <ListItemButton onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutRoundedIcon />
                  </ListItemIcon>
                  <ListItemText primary="Log out" />
                </ListItemButton>
              </>
            ) : (
              <Box sx={{ p: 2, display: 'grid', gap: 1 }}>
                <Button component={RouterLink} to="/login" variant="outlined">
                  Log in
                </Button>
                <Button component={RouterLink} to="/register" variant="contained">
                  Sign up
                </Button>
              </Box>
            )}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
