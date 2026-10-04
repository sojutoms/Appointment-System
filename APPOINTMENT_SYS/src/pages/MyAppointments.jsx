import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import api from '../api/axios';
import AppointmentActions from '../components/AppointmentActions';
import AppointmentDetailsDialog from '../components/AppointmentDetailsDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import StatusChip from '../components/StatusChip';
import useDebounce from '../hooks/useDebounce';
import useToast from '../hooks/useToast';
import { STATUS_META } from '../utils/appointments';
import { getErrorMessage } from '../utils/errors';
import { formatDate, formatTimeRange } from '../utils/format';
import { clickable } from '../utils/a11y';
import { LIMITS } from '../utils/validation';

const PAGE_SIZE = 8;
const SCOPES = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
];

export default function MyAppointments() {
  const navigate = useNavigate();
  const showToast = useToast();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('md'));

  // Filters live in the URL so they survive refresh and the back button.
  const [params, setParams] = useSearchParams();
  const scope = SCOPES.some((s) => s.value === params.get('scope')) ? params.get('scope') : 'upcoming';
  const status = STATUS_META[params.get('status')] ? params.get('status') : '';
  const page = Math.min(10000, Math.max(1, Math.floor(Number(params.get('page'))) || 1));
  const urlQuery = (params.get('q') || '').slice(0, LIMITS.search);
  const [search, setSearch] = useState(urlQuery);
  const debouncedSearch = useDebounce(search.trim());

  // The URL's search changed from outside (nav link, back/forward): show it in the box.
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    if (urlQuery !== search.trim()) setSearch(urlQuery);
  }

  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page'); // any filter change goes back to page 1
    setParams(next, { replace: true });
  };

  // Push the debounced search text into the URL, only when the user typed
  // (not when the URL changed), so navigating can clear an old search.
  useEffect(() => {
    if (urlQuery === debouncedSearch) return;
    const next = new URLSearchParams(params);
    if (debouncedSearch) next.set('q', debouncedSearch);
    else next.delete('q');
    next.delete('page');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // ----- Data -----
  const [refresh, setRefresh] = useState(0);
  const query = {
    ...(scope !== 'all' && { scope }),
    ...(status && { status }),
    ...(urlQuery && { search: urlQuery }),
    page,
    limit: PAGE_SIZE,
  };
  const key = JSON.stringify({ ...query, refresh });
  const [data, setData] = useState({ key: null, items: [], pagination: null, error: '' });
  const loading = data.key !== key;

  useEffect(() => {
    let active = true;
    api
      .get('/appointments', { params: JSON.parse(key) })
      .then(({ data: res }) => active && setData({ key, items: res.items, pagination: res.pagination, error: '' }))
      .catch((err) => active && setData({ key, items: [], pagination: null, error: getErrorMessage(err) }));
    return () => {
      active = false;
    };
  }, [key]);

  // Past the last page (old link, or its last item removed): go to the last page.
  const lastPage = data.pagination?.total > 0 ? data.pagination.totalPages : null;
  useEffect(() => {
    if (!loading && lastPage && page > lastPage) updateParams({ page: String(lastPage) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, lastPage, page]);

  // ----- Actions -----
  const [details, setDetails] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type: 'cancel' | 'delete', appointment }
  const [busy, setBusy] = useState(false);

  const reschedule = (appt) => navigate(`/appointments/${appt._id}/reschedule`);
  const askCancel = (appt) => {
    setDetails(null);
    setConfirm({ type: 'cancel', appointment: appt });
  };
  const askDelete = (appt) => setConfirm({ type: 'delete', appointment: appt });

  const runConfirmed = async () => {
    const { type, appointment } = confirm;
    setBusy(true);
    try {
      if (type === 'cancel') {
        await api.put(`/appointments/${appointment._id}`, { status: 'cancelled' });
        showToast('Appointment cancelled.');
      } else {
        await api.delete(`/appointments/${appointment._id}`);
        showToast('Appointment removed from your history.');
        // Deleted the last item on this page: go back a page.
        if (data.items.length === 1 && page > 1) updateParams({ page: String(page - 1) });
      }
      setConfirm(null);
      setRefresh((n) => n + 1);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const hasFilters = Boolean(status || params.get('q'));
  const items = data.items;

  return (
    <Container sx={{ py: { xs: 4, md: 6 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }}>
        <div>
          <Typography variant="h4" component="h1">
            My appointments
          </Typography>
          <Typography color="text.secondary">
            View, reschedule or cancel your bookings.
          </Typography>
        </div>
        <Button component={RouterLink} to="/book" variant="contained" startIcon={<AddRoundedIcon />}>
          Book appointment
        </Button>
      </Stack>

      <Card>
        <Tabs value={scope} onChange={(_e, value) => updateParams({ scope: value === 'upcoming' ? '' : value })} sx={{ px: 2 }}>
          {SCOPES.map((s) => (
            <Tab key={s.value} value={s.value} label={s.label} />
          ))}
        </Tabs>
        <Divider />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: 2 }}>
          <TextField
            size="small"
            placeholder="Search service, specialist or notes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
              htmlInput: { 'aria-label': 'Search appointments', maxLength: LIMITS.search },
            }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => updateParams({ status: e.target.value })}
            sx={{ minWidth: { sm: 180 } }}
            fullWidth={false}
            // Show "All statuses" (the empty value) instead of a blank box.
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {Object.entries(STATUS_META).map(([value, meta]) => (
              <MenuItem key={value} value={value}>
                {meta.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Divider />

        {data.error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {data.error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} height={56} />
            ))}
          </Box>
        )}

        {!loading && !data.error && items.length === 0 && (
          <EmptyState
            icon={hasFilters ? SearchOffRoundedIcon : undefined}
            title={hasFilters ? 'No matching appointments' : scope === 'past' ? 'No past appointments' : 'No appointments yet'}
            description={hasFilters ? 'Try a different search or status filter.' : 'Book your first appointment in under a minute.'}
            action={
              hasFilters ? (
                <Button
                  variant="outlined"
                  onClick={() => {
                    // The search box clears the URL's `q` itself once the debounce settles.
                    setSearch('');
                    updateParams({ status: '' });
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button component={RouterLink} to="/book" variant="outlined">
                  Book now
                </Button>
              )
            }
          />
        )}

        {/* Desktop: table */}
        {!loading && items.length > 0 && !isMobile && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date & time</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Specialist</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((appt) => (
                  <TableRow key={appt._id} hover {...clickable(() => setDetails(appt))} aria-label={`View appointment on ${formatDate(appt.date)}`} sx={{ cursor: 'pointer' }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{formatDate(appt.date)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatTimeRange(appt.startTime, appt.endTime)}
                      </Typography>
                    </TableCell>
                    <TableCell>{appt.service?.name ?? '—'}</TableCell>
                    <TableCell>{appt.staff?.name ?? '—'}</TableCell>
                    <TableCell>
                      <StatusChip status={appt.status} />
                    </TableCell>
                    <TableCell align="right">
                      <AppointmentActions appointment={appt} onReschedule={reschedule} onCancel={askCancel} onDelete={askDelete} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Mobile: cards */}
        {!loading && items.length > 0 && isMobile && (
          <Stack divider={<Divider />}>
            {items.map((appt) => (
              <Box
                key={appt._id}
                {...clickable(() => setDetails(appt))}
                aria-label={`View appointment on ${formatDate(appt.date)}`}
                sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }} noWrap>
                      {appt.service?.name ?? 'Service removed'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      with {appt.staff?.name ?? '—'}
                    </Typography>
                  </Box>
                  <StatusChip status={appt.status} />
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography variant="body2">
                    {formatDate(appt.date, { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
                    {formatTimeRange(appt.startTime, appt.endTime)}
                  </Typography>
                  <AppointmentActions appointment={appt} onReschedule={reschedule} onCancel={askCancel} onDelete={askDelete} />
                </Stack>
              </Box>
            ))}
          </Stack>
        )}

        {!loading && data.pagination && data.pagination.totalPages > 1 && (
          <>
            <Divider />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ p: 2, justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.pagination.total)} of {data.pagination.total}
              </Typography>
              <Pagination
                count={data.pagination.totalPages}
                page={page}
                onChange={(_e, value) => updateParams({ page: value > 1 ? String(value) : '' })}
                color="primary"
                shape="rounded"
              />
            </Stack>
          </>
        )}
      </Card>

      <AppointmentDetailsDialog
        appointment={details}
        onClose={() => setDetails(null)}
        onReschedule={reschedule}
        onCancel={askCancel}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        busy={busy}
        title={confirm?.type === 'cancel' ? 'Cancel this appointment?' : 'Remove from history?'}
        message={
          confirm &&
          (confirm.type === 'cancel'
            ? `Your ${confirm.appointment.service?.name ?? ''} appointment on ${formatDate(confirm.appointment.date)} at ${formatTimeRange(confirm.appointment.startTime, confirm.appointment.endTime)} will be cancelled and the time slot released.`
            : 'This appointment will be permanently deleted. This cannot be undone.')
        }
        confirmText={confirm?.type === 'cancel' ? 'Cancel appointment' : 'Delete'}
        onConfirm={runConfirmed}
        onClose={() => setConfirm(null)}
      />
    </Container>
  );
}
