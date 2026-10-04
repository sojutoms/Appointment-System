import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function PageHeader({ title, description, action }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }}
    >
      <div>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
          {title}
        </Typography>
        {description && <Typography color="text.secondary">{description}</Typography>}
      </div>
      {action}
    </Stack>
  );
}
