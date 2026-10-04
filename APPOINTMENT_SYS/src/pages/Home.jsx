import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import api from '../api/axios';
import IconBadge from '../components/IconBadge';
import ServiceCard from '../components/ServiceCard';
import useAuth from '../hooks/useAuth';

const STEPS = [
  { icon: PersonAddAltRoundedIcon, title: 'Create an account', text: 'Sign up free and verify your email.' },
  { icon: FactCheckOutlinedIcon, title: 'Choose a service', text: 'Pick what you need and who you want to see.' },
  { icon: EventAvailableRoundedIcon, title: 'Pick a time', text: 'Only open slots are shown, so no double-booking.' },
];

export default function Home() {
  const { user } = useAuth();
  const [services, setServices] = useState(null);

  useEffect(() => {
    api
      .get('/services', { params: { limit: 6 } })
      .then(({ data }) => setServices(data.items))
      .catch(() => setServices([]));
  }, []);

  return (
    <>
      <Box
        component="section"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          background: (theme) =>
            `radial-gradient(circle at 85% 20%, rgba(${theme.vars.palette.primary.mainChannel} / 0.14), transparent 45%)`,
        }}
      >
        <Container sx={{ py: { xs: 7, md: 10 } }}>
          <Box sx={{ maxWidth: 680 }}>
            <Chip label="Online Appointment System" variant="outlined" size="small" sx={{ mb: 2 }} />
            <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '2.2rem', md: '3.2rem' }, mb: 2 }}>
              Book your next appointment in under a minute.
            </Typography>
            <Typography variant="h6" component="p" color="text.secondary" sx={{ fontWeight: 400, mb: 4 }}>
              See real-time availability, choose a time that suits you, and manage every booking in one place.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {user ? (
                <Button component={RouterLink} to="/book" variant="contained" size="large">
                  Book an appointment
                </Button>
              ) : (
                <>
                  <Button component={RouterLink} to="/register" variant="contained" size="large">
                    Get started
                  </Button>
                  <Button component={RouterLink} to="/login" variant="outlined" size="large">
                    I already have an account
                  </Button>
                </>
              )}
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container sx={{ py: 6 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
          How it works
        </Typography>
        <Grid container spacing={2} sx={{ mb: 6 }}>
          {STEPS.map((step, i) => (
            <Grid key={step.title} size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <IconBadge icon={step.icon} sx={{ mb: 2 }} />
                  <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
                    {i + 1}. {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.text}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
          Our services
        </Typography>
        <Grid container spacing={2}>
          {services === null &&
            [1, 2, 3].map((n) => (
              <Grid key={n} size={{ xs: 12, sm: 6, md: 4 }}>
                <Skeleton variant="rounded" height={150} />
              </Grid>
            ))}
          {services?.length === 0 && (
            <Grid size={12}>
              <Typography color="text.secondary">Services will appear here once they are added.</Typography>
            </Grid>
          )}
          {services?.map((service) => (
            <Grid key={service._id} size={{ xs: 12, sm: 6, md: 4 }}>
              <ServiceCard service={service} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </>
  );
}
