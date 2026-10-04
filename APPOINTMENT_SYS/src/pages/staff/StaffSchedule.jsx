import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import ViewWeekOutlinedIcon from '@mui/icons-material/ViewWeekOutlined';
import api from '../../api/axios';
import DateStrip from '../../components/booking/DateStrip';
import EmptyState from '../../components/EmptyState';
import IconBadge from '../../components/IconBadge';
import StatusChip from '../../components/StatusChip';
import StaffAppointmentDialog from '../../components/staff/StaffAppointmentDialog';
import useToast from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/errors';
import { addDays, formatDate, formatTime, formatTimeRange, parseDate, relativeDay, todayString } from '../../utils/format';

function StatCard({ icon, label, value, color }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconBadge icon={icon} color={color} />
        <Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>
            {value ?? <Skeleton width={28} />}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function StaffSchedule() {
  const showToast = useToast();
  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [pending, setPending] = useState(null);
  const [date, setDate] = useState(todayString);
  const [day, setDay] = useState({ date: null, appointments: [], timeOff: [] });
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [confirming, setConfirming] = useState('');

  // Two weeks back (to complete recent visits) through two months ahead.
  const dates = useMemo(() => {
    const today = todayString();
    return Array.from({ length: 75 }, (_, i) => addDays(today, i - 14));
  }, []);

  useEffect(() => {
    api.get('/staff-portal/me').then(({ data }) => setProfile(data.staff)).catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    Promise.all([api.get('/staff-portal/summary'), api.get('/staff-portal/appointments', { params: { status: 'pending', scope: 'upcoming', limit: 5 } })])
      .then(([s, p]) => {
        setSummary(s.data);
        setPending(p.data);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [refresh]);

  useEffect(() => {
    let active = true;
    api
      .get('/staff-portal/day', { params: { date } })
      .then(({ data }) => active && setDay(data))
      .catch((err) => active && setError(getErrorMessage(err)));
    return () => {
      active = false;
    };
  }, [date, refresh]);

  const dayLoading = day.date !== date;
  const worksToday = profile ? profile.workingDays.includes(parseDate(date).getDay()) : true;

  const quickConfirm = async (appt) => {
    setConfirming(appt._id);
    try {
      await api.patch(`/staff-portal/appointments/${appt._id}`, { status: 'confirmed' });
      showToast('Appointment confirmed.');
      setRefresh((n) => n + 1);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setConfirming('');
    }
  };

  return (
    <Container sx={{ py: { xs: 4, md: 6 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 4 }}>
        <div>
          <Typography variant="h4" component="h1">
            {profile ? `Hello, ${profile.name}` : <Skeleton width={260} />}
          </Typography>
          <Typography color="text.secondary">
            {profile ? `${profile.specialization || 'Staff'} · your schedule and clients` : <Skeleton width={200} />}
          </Typography>
        </div>
        <Button component={RouterLink} to="/staff/time-off" variant="outlined" startIcon={<BeachAccessOutlinedIcon />}>
          Manage time off
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={EventRoundedIcon} label="Today" value={summary?.today} color="primary" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={ViewWeekOutlinedIcon} label="Next 7 days" value={summary?.next7Days} color="info" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={HourglassEmptyRoundedIcon} label="To confirm" value={summary?.pending} color="warning" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={TaskAltRoundedIcon} label="Completed" value={summary?.completed} color="success" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <DateStrip dates={dates} value={date} onChange={setDate} isDisabled={() => false} />
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mt: 3, mb: 1 }}>
                <Typography variant="h6" component="h2">
                  {['Today', 'Tomorrow'].includes(relativeDay(date))
                    ? `${relativeDay(date)} · ${formatDate(date, { month: 'long', day: 'numeric' })}`
                    : formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}
                </Typography>
                {profile && (
                  <Typography variant="body2" color="text.secondary">
                    {worksToday ? `Hours ${formatTime(profile.startTime)} – ${formatTime(profile.endTime)}` : 'Not a working day'}
                  </Typography>
                )}
              </Stack>

              {day.timeOff?.length > 0 && !dayLoading && (
                <Stack spacing={1} sx={{ mb: 2 }}>
                  {day.timeOff.map((t) => (
                    <Alert key={t._id} severity="info" icon={<BeachAccessOutlinedIcon />}>
                      Time off {t.allDay ? '(all day)' : `${formatTime(t.startTime)} – ${formatTime(t.endTime)}`}
                      {t.reason ? `: ${t.reason}` : ''}
                    </Alert>
                  ))}
                </Stack>
              )}

              {dayLoading && [1, 2].map((n) => <Skeleton key={n} variant="rounded" height={72} sx={{ mb: 1 }} />)}
              {!dayLoading && day.appointments.length === 0 && (
                <EmptyState title="No appointments" description={worksToday ? 'Nothing booked for this day yet.' : 'You are not scheduled to work this day.'} />
              )}
              <Stack spacing={1.25}>
                {!dayLoading &&
                  day.appointments.map((appt) => (
                    <Card key={appt._id} sx={{ opacity: appt.status === 'cancelled' ? 0.55 : 1, borderLeft: 4, borderLeftColor: appt.status === 'confirmed' ? 'success.main' : appt.status === 'pending' ? 'warning.main' : 'divider' }}>
                      <CardActionArea onClick={() => setSelected(appt)} sx={{ p: 2 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }} sx={{ alignItems: { sm: 'center' } }}>
                          <Box sx={{ minWidth: 150 }}>
                            <Typography sx={{ fontWeight: 700 }}>{formatTimeRange(appt.startTime, appt.endTime)}</Typography>
                          </Box>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 600 }} noWrap>
                              {appt.user?.name ?? 'Deleted account'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {appt.service?.name ?? '—'}
                              {appt.notes ? ` · “${appt.notes}”` : ''}
                            </Typography>
                          </Box>
                          <StatusChip status={appt.status} />
                        </Stack>
                      </CardActionArea>
                    </Card>
                  ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <Box sx={{ px: 2.5, py: 2 }}>
              <Typography variant="h6" component="h2">
                Waiting for you to confirm
              </Typography>
            </Box>
            <Divider />
            {pending === null && <Skeleton variant="rounded" height={120} sx={{ m: 2 }} />}
            {pending?.items.length === 0 && <EmptyState icon={TaskAltRoundedIcon} title="All caught up" description="New bookings appear here." />}
            {pending?.items.map((appt, i) => (
              <Box key={appt._id}>
                {i > 0 && <Divider />}
                <Stack direction="row" spacing={1} sx={{ px: 2.5, py: 1.5, alignItems: 'center' }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setSelected(appt)}>
                    <Typography sx={{ fontWeight: 600 }} noWrap>
                      {appt.user?.name ?? 'Deleted account'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {relativeDay(appt.date)} · {formatTime(appt.startTime)} · {appt.service?.name}
                    </Typography>
                  </Box>
                  <Tooltip title="Confirm">
                    <span>
                      <IconButton color="success" onClick={() => quickConfirm(appt)} disabled={confirming === appt._id} aria-label="Confirm">
                        <CheckRoundedIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Box>
            ))}
          </Card>
        </Grid>
      </Grid>

      {selected && (
        <StaffAppointmentDialog
          key={selected._id}
          appointment={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated, action) => {
            showToast(action === 'notes' ? 'Notes saved.' : action === 'confirmed' ? 'Appointment confirmed.' : 'Marked as completed.');
            setSelected(action === 'notes' ? updated : null);
            setRefresh((n) => n + 1);
          }}
        />
      )}
    </Container>
  );
}
