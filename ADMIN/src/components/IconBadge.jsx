import Box from '@mui/material/Box';

// Rounded, softly tinted square holding an icon (used in headers and stat cards).
export default function IconBadge({ icon: Icon, color = 'primary', size = 48, sx }) {
  return (
    <Box
      sx={{
        display: 'inline-grid',
        placeItems: 'center',
        flex: 'none',
        width: size,
        height: size,
        borderRadius: 3,
        color: `${color}.main`,
        bgcolor: (theme) => `rgba(${theme.vars.palette[color].mainChannel} / 0.12)`,
        ...sx,
      }}
    >
      <Icon />
    </Box>
  );
}
