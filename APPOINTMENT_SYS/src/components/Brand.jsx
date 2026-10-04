import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded';

// Logo + app name. `light` is for use on the purple auth panel.
export default function Brand({ to = '/', light = false }) {
  return (
    <Box
      component={RouterLink}
      to={to}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        textDecoration: 'none',
        color: light ? '#fff' : 'text.primary',
        fontWeight: 700,
        fontSize: '1.2rem',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 34,
          height: 34,
          borderRadius: 2,
          bgcolor: light ? 'rgba(255,255,255,0.18)' : 'primary.main',
          color: light ? '#fff' : 'primary.contrastText',
        }}
      >
        <LocalHospitalRoundedIcon fontSize="small" />
      </Box>
      CliniQuick
    </Box>
  );
}
