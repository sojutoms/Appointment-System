import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import api from '../api/axios';
import BookingSummary from '../components/booking/BookingSummary';
import DateStrip from '../components/booking/DateStrip';
import StaffCard from '../components/booking/StaffCard';
import TimeSlotGrid from '../components/booking/TimeSlotGrid';
import EmptyState from '../components/EmptyState';
import IconBadge from '../components/IconBadge';
import PageLoader from '../components/PageLoader';
import ServiceCard from '../components/ServiceCard';
import useToast from '../hooks/useToast';
import { getErrorMessage } from '../utils/errors';
import { addDays, parseDate, todayString } from '../utils/format';

const STEPS = ['Service', 'Specialist', 'Date & time', 'Confirm'];
const DAYS_AHEAD = 60; // matches the server's booking limit
const NOTES_MAX = 500;

// Booking wizard. With an :id in the URL it reschedules that appointment instead.
export default function BookAppointment() {
  const { id: rescheduleId } = useParams();
  const isReschedule = Boolean(rescheduleId);
  const navigate = useNavigate();
  const showToast = useToast();

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState(null);
  const [notes, setNotes] = useState('');

  const [services, setServices] = useState(null);
  // Results are stored with the key they were fetched for, so "loading" can be
  // derived (key mismatch) instead of toggled inside effects.
  const [staffData, setStaffData] = useState({ key: null, items: [] });
  const [slotsData, setSlotsData] = useState({ key: null, slots: [], message: '' });
  const [slotsRefresh, setSlotsRefresh] = useState(0);

  const [original, setOriginal] = useState(null); // appointment being rescheduled
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(null);

  // ----- Data loading -----
  useEffect(() => {
    api
      .get('/services', { params: { limit: 50 } })
      .then(({ data }) => setServices(data.items))
      .catch((err) => setLoadError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    if (!rescheduleId) return;
    api
      .get(`/appointments/${rescheduleId}`)
      .then(({ data }) => {
        const appt = data.appointment;
        setOriginal(appt);
        setServiceId(appt.service?._id ?? '');
        setStaffId(appt.staff?._id ?? '');
        setDate(appt.date >= todayString() ? appt.date : '');
        setNotes(appt.notes ?? '');
        setStep(2);
      })
      .catch((err) => setLoadError(getErrorMessage(err)));
  }, [rescheduleId]);

  useEffect(() => {
    if (!serviceId) return undefined;
    let active = true;
    api
      .get('/staff', { params: { service: serviceId, limit: 50 } })
      .then(({ data }) => active && setStaffData({ key: serviceId, items: data.items }))
      .catch(() => active && setStaffData({ key: serviceId, items: [] }));
    return () => {
      active = false;
    };
  }, [serviceId]);

  const slotsKey = serviceId && staffId && date ? `${serviceId}|${staffId}|${date}|${slotsRefresh}` : null;
  useEffect(() => {
    if (!slotsKey) return undefined;
    let active = true;
    const params = { service: serviceId, staff: staffId, date, ...(rescheduleId && { exclude: rescheduleId }) };
    api
      .get('/appointments/available-slots', { params })
      .then(({ data }) => active && setSlotsData({ key: slotsKey, slots: data.slots, message: data.message || '' }))
      .catch((err) => active && setSlotsData({ key: slotsKey, slots: [], message: getErrorMessage(err) }));
    return () => {
      active = false;
    };
  }, [slotsKey, serviceId, staffId, date, rescheduleId]);

  // Full days the specialist is off (time off), so the calendar can grey them out.
  const [daysOff, setDaysOff] = useState({ key: null, dates: [] });
  useEffect(() => {
    if (!staffId) return undefined;
    let active = true;
    api
      .get(`/staff/${staffId}/unavailable`)
      .then(({ data }) => active && setDaysOff({ key: staffId, dates: data.dates }))
      .catch(() => active && setDaysOff({ key: staffId, dates: [] }));
    return () => {
      active = false;
    };
  }, [staffId]);

  // ----- Derived values -----
  const service = services?.find((s) => s._id === serviceId) ?? null;
  const staffLoading = Boolean(serviceId) && staffData.key !== serviceId;
  const staffList = staffLoading ? [] : staffData.items;
  const staff = staffList.find((s) => s._id === staffId) ?? null;
  const slotsLoading = Boolean(slotsKey) && slotsData.key !== slotsKey;

  const dates = useMemo(() => {
    const today = todayString();
    return Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => addDays(today, i));
  }, []);
  const offDates = daysOff.key === staffId ? daysOff.dates : [];
  const worksOn = (dateStr) => Boolean(staff?.workingDays.includes(parseDate(dateStr).getDay())) && !offDates.includes(dateStr);

  const canContinue = [Boolean(service), Boolean(staff), Boolean(slot), true][step];

  // Each step starts at the top of the page (matters on phones).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, booked]);

  // ----- Handlers -----
  const selectService = (s) => {
    if (s._id !== serviceId) {
      setServiceId(s._id);
      setStaffId('');
      setDate('');
      setSlot(null);
    }
    setStep(1);
  };

  const selectStaff = (s) => {
    if (s._id !== staffId) {
      setStaffId(s._id);
      setSlot(null);
      // Jump to the first day this person works.
      const firstDay = dates.find((d) => s.workingDays.includes(parseDate(d).getDay()));
      setDate(firstDay ?? '');
    }
    setStep(2);
  };

  const selectDate = (d) => {
    setDate(d);
    setSlot(null);
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    const payload = { service: serviceId, staff: staffId, date, startTime: slot.startTime, notes: notes.trim() };
    try {
      if (isReschedule) {
        await api.put(`/appointments/${rescheduleId}`, payload);
        showToast('Appointment rescheduled. It will be confirmed again by our staff.');
        navigate('/appointments');
      } else {
        const { data } = await api.post('/appointments', payload);
        setBooked(data.appointment);
      }
    } catch (err) {
      setError(getErrorMessage(err));
      // The slot was taken by someone else in the meantime: refresh and pick again.
      if (err.response?.status === 409) {
        setSlot(null);
        setSlotsRefresh((n) => n + 1);
        setStep(2);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setBooked(null);
    setServiceId('');
    setStaffId('');
    setDate('');
    setSlot(null);
    setNotes('');
    setError('');
    setStep(0);
  };

  // ----- Render -----
  if (loadError) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error" action={<Button component={RouterLink} to="/appointments">Back</Button>}>
          {loadError}
        </Alert>
      </Container>
    );
  }
  if (!services || (isReschedule && !original)) return <PageLoader />;

  if (isReschedule && !['pending', 'confirmed'].includes(original.status)) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="info" action={<Button component={RouterLink} to="/appointments">Back</Button>}>
          This appointment is {original.status} and can no longer be rescheduled.
        </Alert>
      </Container>
    );
  }

  if (booked) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
            <IconBadge icon={CheckCircleRoundedIcon} color="success" size={64} sx={{ mb: 2, '& svg': { fontSize: 36 } }} />
            <Typography variant="h5" component="h1" gutterBottom>
              Appointment requested!
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Your booking is <strong>pending</strong>. We&apos;ll confirm it shortly. You can track it in My Appointments.
            </Typography>
            <Box sx={{ textAlign: 'left', mb: 4 }}>
              <BookingSummary service={service} staff={staff} date={booked.date} slot={booked} />
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'center' }}>
              <Button component={RouterLink} to="/appointments" variant="contained">
                View my appointments
              </Button>
              <Button onClick={resetWizard} variant="outlined">
                Book another
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container sx={{ py: { xs: 4, md: 6 } }}>
      <Typography variant="h4" component="h1">
        {isReschedule ? 'Reschedule appointment' : 'Book an appointment'}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {isReschedule
          ? 'Pick a new time. You can also change the service or specialist.'
          : 'Choose a service, a specialist and a time that works for you.'}
      </Typography>

      <Stepper nonLinear activeStep={step} alternativeLabel sx={{ mb: 4 }}>
        {STEPS.map((label, i) => {
          const done = [Boolean(service), Boolean(staff), Boolean(slot), false][i];
          // Only allow jumping to steps whose earlier steps are complete.
          const reachable = i === 0 || [service, staff, slot].slice(0, i).every(Boolean);
          return (
            <Step key={label} completed={done && i !== step}>
              <StepButton onClick={() => reachable && setStep(i)} disabled={!reachable}>
                {label}
              </StepButton>
            </Step>
          );
        })}
      </Stepper>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Step 1: service */}
          {step === 0 &&
            (services.length === 0 ? (
              <Card>
                <EmptyState title="No services available" description="Please check back later." icon={EventBusyRoundedIcon} />
              </Card>
            ) : (
              <Grid container spacing={2}>
                {services.map((s) => (
                  <Grid key={s._id} size={{ xs: 12, sm: 6 }}>
                    <ServiceCard service={s} selected={s._id === serviceId} onSelect={selectService} />
                  </Grid>
                ))}
              </Grid>
            ))}

          {/* Step 2: specialist */}
          {step === 1 && (
            <Grid container spacing={2}>
              {staffLoading &&
                [1, 2].map((n) => (
                  <Grid key={n} size={{ xs: 12, sm: 6 }}>
                    <Skeleton variant="rounded" height={92} />
                  </Grid>
                ))}
              {!staffLoading && staffList.length === 0 && (
                <Grid size={12}>
                  <Card>
                    <EmptyState
                      title="No specialists available"
                      description="Nobody offers this service right now. Please choose another service."
                      icon={EventBusyRoundedIcon}
                    />
                  </Card>
                </Grid>
              )}
              {staffList.map((s) => (
                <Grid key={s._id} size={{ xs: 12, sm: 6 }}>
                  <StaffCard staff={s} selected={s._id === staffId} onSelect={selectStaff} />
                </Grid>
              ))}
            </Grid>
          )}

          {/* Step 3: date & time */}
          {step === 2 && (
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Choose a date
                </Typography>
                {staff && <DateStrip dates={dates} value={date} onChange={selectDate} isDisabled={(d) => !worksOn(d)} />}
                {!staff && staffLoading && <Skeleton variant="rounded" height={84} />}
                {!staff && !staffLoading && (
                  <Alert severity="warning" action={<Button onClick={() => setStep(1)}>Choose</Button>}>
                    This specialist is no longer available. Please choose another one.
                  </Alert>
                )}

                <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 4, mb: 1.5 }}>
                  Choose a time
                </Typography>
                {!date && <Typography color="text.secondary">Select a date to see available times.</Typography>}
                {date && !slotsLoading && slotsData.slots.length === 0 && (
                  <Alert severity="info">{slotsData.message || 'No times available on this day.'}</Alert>
                )}
                {date && !slotsLoading && slotsData.slots.length > 0 && !slotsData.slots.some((s) => s.available) && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    This day is fully booked. Please choose another date.
                  </Alert>
                )}
                {date && (slotsLoading || slotsData.slots.length > 0) && (
                  <TimeSlotGrid slots={slotsData.slots} loading={slotsLoading} value={slot?.startTime} onChange={setSlot} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: confirm */}
          {step === 3 && (
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Review your booking
                </Typography>
                <Box sx={{ display: { md: 'none' }, mb: 3 }}>
                  <BookingSummary service={service} staff={staff} date={date} slot={slot} />
                </Box>
                <TextField
                  label="Notes for the specialist (optional)"
                  placeholder="Anything we should know before your visit?"
                  multiline
                  minRows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX))}
                  helperText={`${notes.length}/${NOTES_MAX}`}
                  slotProps={{ formHelperText: { sx: { textAlign: 'right' } } }}
                />
                <Alert severity="info" sx={{ mt: 2 }}>
                  {isReschedule
                    ? 'Rescheduled appointments go back to pending until our staff confirms them.'
                    : 'Your appointment will be pending until our staff confirms it.'}
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 3 }}>
            <Button
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))}
              color="inherit"
            >
              Back
            </Button>
            {step < 3 ? (
              <Button variant="contained" endIcon={<ArrowForwardRoundedIcon />} disabled={!canContinue} onClick={() => setStep(step + 1)}>
                Continue
              </Button>
            ) : (
              <Button
                variant="contained"
                size="large"
                onClick={submit}
                disabled={submitting || !slot}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
              >
                {submitting ? 'Saving...' : isReschedule ? 'Confirm new time' : 'Confirm booking'}
              </Button>
            )}
          </Stack>
        </Grid>

        {/* Summary sidebar (desktop) */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: { xs: 'none', md: 'block' } }}>
          <Card sx={{ position: 'sticky', top: 88 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Your appointment
              </Typography>
              <BookingSummary service={service} staff={staff} date={date} slot={slot} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
