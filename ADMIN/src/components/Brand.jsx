import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';

export default function Brand({ to = '/' }) {
  return (
    <Box
      component={RouterLink}
      to={to}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, textDecoration: 'none', color: 'text.primary', fontWeight: 700, fontSize: '1.1rem' }}
    >
      <Box sx={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <AdminPanelSettingsRoundedIcon fontSize="small" />
      </Box>
      <span>
        CliniQuick{' '}
        <Box component="span" sx={{ color: 'primary.main' }}>
          Admin
        </Box>
      </span>
    </Box>
  );
}
