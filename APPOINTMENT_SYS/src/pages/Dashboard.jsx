import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';
import IconBadge from '../components/IconBadge';
import StatusChip from '../components/StatusChip';
import useAuth from '../hooks/useAuth';
import { getErrorMessage } from '../utils/errors';
import { formatTimeRange, relativeDay } from '../utils/format';

function StatCard({ icon, label, value, color }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconBadge icon={icon} color={color} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" noWrap>
            {label}
          </Typography>
          <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>
            {value ?? <Skeleton width={32} />}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/appointments/stats'),
      api.get('/appointments', { params: { scope: 'upcoming', status: 'active', limit: 4 } }),
    ])
      .then(([statsRes, listRes]) => {
        setStats(statsRes.data);
        setUpcoming(listRes.data.items);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  // The client app always shows the signed-in user's own numbers; admins manage
  // the whole system from the separate admin panel.
  const cards = [
    { icon: EventRoundedIcon, label: "Today's appointments", value: stats?.today, color: 'primary' },
    { icon: HourglassEmptyRoundedIcon, label: 'Pending', value: stats?.byStatus.pending, color: 'warning' },
    { icon: CheckCircleOutlineRoundedIcon, label: 'Confirmed', value: stats?.byStatus.confirmed, color: 'success' },
    { icon: TaskAltRoundedIcon, label: 'Completed', value: stats?.byStatus.completed, color: 'info' },
  ];

  return (
    <Container sx={{ py: { xs: 4, md: 6 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 4 }}
      >
        <div>
          <Typography variant="h4" component="h1">
            Hello, {user.name.split(' ')[0]} 👋
          </Typography>
          <Typography color="text.secondary">
            Here is a summary of your appointments.
          </Typography>
        </div>
        <Button component={RouterLink} to="/book" variant="contained" size="large" startIcon={<AddRoundedIcon />}>
          Book appointment
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {cards.map((card) => (
          <Grid key={card.label} size={{ xs: 6, lg: 3 }}>
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      <Card>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 2 }}>
          <Typography variant="h6" component="h2">
            Upcoming appointments
          </Typography>
          <Button component={RouterLink} to="/appointments" endIcon={<ArrowForwardRoundedIcon />}>
            View all
          </Button>
        </Stack>
        <Divider />
        {upcoming === null && !error && (
          <Box sx={{ p: 2.5 }}>
            {[1, 2].map((n) => (
              <Skeleton key={n} height={56} />
            ))}
          </Box>
        )}
        {upcoming?.length === 0 && (
          <EmptyState
            title="No upcoming appointments"
            description="When you book an appointment, it will show up here."
            action={
              <Button component={RouterLink} to="/book" variant="outlined">
                Book now
              </Button>
            }
          />
        )}
        {upcoming?.map((appt, i) => (
          <Box key={appt._id}>
            {i > 0 && <Divider />}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 1, sm: 2 }}
              sx={{ px: 2.5, py: 2, alignItems: { sm: 'center' } }}
            >
              <Box sx={{ minWidth: 130 }}>
                <Typography sx={{ fontWeight: 600 }}>{relativeDay(appt.date)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatTimeRange(appt.startTime, appt.endTime)}
                </Typography>
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography noWrap>{appt.service?.name ?? 'Service removed'}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  with {appt.staff?.name ?? 'staff removed'}
                </Typography>
              </Box>
              <StatusChip status={appt.status} />
            </Stack>
          </Box>
        ))}
      </Card>
    </Container>
  );
}
