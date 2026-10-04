import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import api from '../api/axios';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import IconBadge from '../components/IconBadge';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import WeekChart from '../components/WeekChart';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import { getErrorMessage } from '../utils/errors';
import { formatDate, formatTimeRange, relativeDay, todayString } from '../utils/format';

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

function AppointmentRow({ appt, actions }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }} sx={{ px: 2.5, py: 1.75, alignItems: { sm: 'center' } }}>
      <Box sx={{ minWidth: 120 }}>
        <Typography sx={{ fontWeight: 600 }}>{relativeDay(appt.date)}</Typography>
        <Typography variant="body2" color="text.secondary">
          {formatTimeRange(appt.startTime, appt.endTime)}
        </Typography>
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography noWrap>{appt.user?.name ?? 'Deleted user'}</Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {appt.service?.name ?? '—'} · {appt.staff?.name ?? '—'}
        </Typography>
      </Box>
      {actions ?? <StatusChip status={appt.status} />}
    </Stack>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const showToast = useToast();
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState(null);
  const [today, setToday] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [busyId, setBusyId] = useState('');
  // Cancelling frees the slot, so it is confirmed first (as on the Appointments page).
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    let active = true;
    const date = todayString();
    Promise.all([
      api.get('/appointments/stats'),
      api.get('/appointments', { params: { status: 'pending', scope: 'upcoming', limit: 6 } }),
      api.get('/appointments', { params: { date, status: 'active', sort: 'asc', limit: 20 } }),
    ])
      .then(([s, p, t]) => {
        if (!active) return;
        setStats(s.data);
        setPending(p.data);
        setToday(t.data.items);
        // A later successful refresh clears an earlier error.
        setError('');
      })
      .catch((err) => active && setError(getErrorMessage(err)));
    return () => {
      active = false;
    };
  }, [refresh]);

  const setStatus = async (appt, status) => {
    setBusyId(appt._id);
    try {
      await api.put(`/appointments/${appt._id}`, { status });
      showToast(status === 'confirmed' ? 'Appointment confirmed.' : 'Appointment cancelled.');
      setRefresh((n) => n + 1);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setBusyId('');
    }
  };

  const cards = [
    { icon: EventRoundedIcon, label: "Today's appointments", value: stats?.today, color: 'primary' },
    { icon: HourglassEmptyRoundedIcon, label: 'Awaiting confirmation', value: stats?.byStatus.pending, color: 'warning' },
    { icon: EventAvailableRoundedIcon, label: 'Upcoming (active)', value: stats?.upcoming, color: 'success' },
    { icon: TaskAltRoundedIcon, label: 'Completed', value: stats?.byStatus.completed, color: 'info' },
    { icon: GroupOutlinedIcon, label: 'Clients', value: stats?.clients, color: 'secondary' },
    { icon: MedicalServicesOutlinedIcon, label: 'Active services', value: stats?.activeServices, color: 'primary' },
    { icon: BadgeOutlinedIcon, label: 'Active staff', value: stats?.activeStaff, color: 'success' },
    { icon: CloseRoundedIcon, label: 'Cancelled', value: stats?.byStatus.cancelled, color: 'error' },
  ];

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} description="Here's what's happening with appointments." />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {cards.map((card) => (
          <Grid key={card.label} size={{ xs: 6, lg: 3 }}>
            <StatCard {...card} value={error && card.value === undefined ? '—' : card.value} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
                Next 7 days
              </Typography>
              {stats?.nextSevenDays ? (
                <WeekChart days={stats.nextSevenDays} />
              ) : error ? (
                <Typography color="text.secondary">Couldn&apos;t load the chart.</Typography>
              ) : (
                <Skeleton variant="rounded" height={210} />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ height: '100%' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 2 }}>
              <Typography variant="h6" component="h2">
                Needs confirmation
              </Typography>
              <Button component={RouterLink} to="/appointments?status=pending" endIcon={<ArrowForwardRoundedIcon />} size="small">
                All {pending?.pagination?.total ? `(${pending.pagination.total})` : ''}
              </Button>
            </Stack>
            <Divider />
            {pending === null && !error && <Skeleton variant="rounded" height={160} sx={{ m: 2.5 }} />}
            {pending?.items.length === 0 && <EmptyState icon={TaskAltRoundedIcon} title="All caught up" description="No bookings are waiting for confirmation." />}
            {pending?.items.map((appt, i) => (
              <Box key={appt._id}>
                {i > 0 && <Divider />}
                <AppointmentRow
                  appt={appt}
                  actions={
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Confirm">
                        <span>
                          <IconButton color="success" onClick={() => setStatus(appt, 'confirmed')} disabled={busyId === appt._id} aria-label="Confirm">
                            <CheckRoundedIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Cancel">
                        <span>
                          <IconButton color="error" onClick={() => setCancelling(appt)} disabled={busyId === appt._id} aria-label="Cancel">
                            <CloseRoundedIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  }
                />
              </Box>
            ))}
          </Card>
        </Grid>

        <Grid size={12}>
          <Card>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 2 }}>
              <Typography variant="h6" component="h2">
                Today&apos;s schedule
              </Typography>
              <Button component={RouterLink} to={`/appointments?from=${todayString()}&to=${todayString()}`} endIcon={<ArrowForwardRoundedIcon />} size="small">
                Manage
              </Button>
            </Stack>
            <Divider />
            {today === null && !error && <Skeleton variant="rounded" height={120} sx={{ m: 2.5 }} />}
            {today?.length === 0 && <EmptyState title="Nothing scheduled today" description="Confirmed and pending appointments for today will appear here." />}
            {today?.map((appt, i) => (
              <Box key={appt._id}>
                {i > 0 && <Divider />}
                <AppointmentRow appt={appt} />
              </Box>
            ))}
          </Card>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={Boolean(cancelling)}
        title="Cancel this appointment?"
        message={
          cancelling
            ? `${cancelling.user?.name ?? 'This client'}'s booking on ${formatDate(cancelling.date)} at ${formatTimeRange(cancelling.startTime, cancelling.endTime)} will be cancelled and the time slot freed.`
            : ''
        }
        confirmText="Cancel appointment"
        busy={Boolean(cancelling) && busyId === cancelling._id}
        onConfirm={async () => {
          await setStatus(cancelling, 'cancelled');
          setCancelling(null);
        }}
        onClose={() => setCancelling(null)}
      />
    </>
  );
}
