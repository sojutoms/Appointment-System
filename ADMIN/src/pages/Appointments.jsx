import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
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
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import api from '../api/axios';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import RescheduleDialog from '../components/RescheduleDialog';
import SearchField from '../components/SearchField';
import StatusChip from '../components/StatusChip';
import TablePager from '../components/TablePager';
import useApiList from '../hooks/useApiList';
import useToast from '../hooks/useToast';
import useUrlFilters from '../hooks/useUrlFilters';
import { STATUS_META, hasStarted, isActive } from '../utils/appointments';
import { getErrorMessage } from '../utils/errors';
import { formatDate, formatDuration, formatPrice, formatTimeRange } from '../utils/format';

const SCOPES = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
];

// What each action does, for the menu and the confirmation dialog.
const ACTIONS = {
  confirmed: { label: 'Confirm', icon: CheckRoundedIcon, color: 'success', title: 'Confirm this appointment?', message: 'The client will see it as confirmed.' },
  completed: { label: 'Mark completed', icon: TaskAltRoundedIcon, color: 'primary', title: 'Mark as completed?', message: 'Use this once the visit has taken place.' },
  cancelled: { label: 'Cancel', icon: EventBusyRoundedIcon, color: 'error', title: 'Cancel this appointment?', message: 'The time slot will be released for other clients.' },
  delete: { label: 'Delete', icon: DeleteOutlineRoundedIcon, color: 'error', title: 'Delete this appointment?', message: 'It will be permanently removed. This cannot be undone.' },
};

function availableActions(appt) {
  const list = [];
  if (appt.status === 'pending') list.push('confirmed');
  if (isActive(appt) && hasStarted(appt)) list.push('completed');
  if (isActive(appt)) list.push('reschedule', 'cancelled');
  list.push('delete');
  return list;
}

function Detail({ label, children }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography component="div">{children}</Typography>
    </Box>
  );
}

export default function Appointments() {
  const showToast = useToast();
  const [filters, setFilters] = useUrlFilters({ scope: 'upcoming', status: '', staff: '', from: '', to: '', q: '' });
  const [staffOptions, setStaffOptions] = useState([]);

  useEffect(() => {
    api
      .get('/staff', { params: { includeInactive: true, limit: 50 } })
      .then(({ data }) => setStaffOptions(data.items))
      .catch(() => setStaffOptions([]));
  }, []);

  const { items, pagination, loading, error, reload } = useApiList('/appointments', {
    scope: filters.scope === 'all' ? '' : filters.scope,
    status: filters.status,
    staff: filters.staff,
    from: filters.from,
    to: filters.to,
    search: filters.q,
    sort: filters.scope === 'past' ? 'desc' : 'asc',
    page: filters.page,
    limit: 10,
  });

  const [menu, setMenu] = useState(null); // { anchor, appt }
  const [details, setDetails] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // { action, appt }
  const [rescheduling, setRescheduling] = useState(null);
  const [busy, setBusy] = useState(false);

  const choose = (action, appt) => {
    setMenu(null);
    setDetails(null);
    if (action === 'reschedule') setRescheduling(appt);
    else setPendingAction({ action, appt });
  };

  const runAction = async () => {
    const { action, appt } = pendingAction;
    setBusy(true);
    try {
      if (action === 'delete') await api.delete(`/appointments/${appt._id}`);
      else await api.put(`/appointments/${appt._id}`, { status: action });
      showToast(action === 'delete' ? 'Appointment deleted.' : `Appointment ${STATUS_META[action].label.toLowerCase()}.`);
      setPendingAction(null);
      if (action === 'delete' && items.length === 1 && filters.page > 1) setFilters({ page: filters.page - 1 });
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const hasFilters = Boolean(filters.status || filters.staff || filters.from || filters.to || filters.q);

  return (
    <>
      <PageHeader title="Appointments" description="Confirm, complete, reschedule or cancel bookings." />

      <Card>
        <Tabs value={filters.scope} onChange={(_e, value) => setFilters({ scope: value })} sx={{ px: 2 }}>
          {SCOPES.map((s) => (
            <Tab key={s.value} value={s.value} label={s.label} />
          ))}
        </Tabs>
        <Divider />

        <Box sx={{ p: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '2fr 1fr 1fr 1fr 1fr auto' }, alignItems: 'center' }}>
          <SearchField value={filters.q} onChange={(q) => setFilters({ q })} placeholder="Search client, service, specialist or notes" />
          <TextField
            select
            size="small"
            label="Status"
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value })}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {Object.entries(STATUS_META).map(([value, meta]) => (
              <MenuItem key={value} value={value}>
                {meta.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Specialist"
            value={staffOptions.some((s) => s._id === filters.staff) ? filters.staff : ''}
            onChange={(e) => setFilters({ staff: e.target.value })}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            <MenuItem value="">All specialists</MenuItem>
            {staffOptions.map((s) => (
              <MenuItem key={s._id} value={s._id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            size="small"
            label="From"
            value={filters.from}
            onChange={(e) => setFilters({ from: e.target.value })}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: filters.to || undefined } }}
          />
          <TextField
            type="date"
            size="small"
            label="To"
            value={filters.to}
            onChange={(e) => setFilters({ to: e.target.value })}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: filters.from || undefined } }}
          />
          <Button
            startIcon={<FilterAltOffOutlinedIcon />}
            color="inherit"
            disabled={!hasFilters}
            onClick={() => setFilters({ status: '', staff: '', from: '', to: '', q: '' })}
          >
            Clear
          </Button>
        </Box>
        <Divider />

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3, 4].map((n) => (
              <Skeleton key={n} height={56} />
            ))}
          </Box>
        ) : items.length === 0 && !error ? (
          <EmptyState title={hasFilters ? 'No matching appointments' : 'No appointments here'} description={hasFilters ? 'Try different filters.' : undefined} />
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Date & time</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Specialist</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((appt) => (
                  <TableRow key={appt._id} hover onClick={() => setDetails(appt)} sx={{ cursor: 'pointer' }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{formatDate(appt.date)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatTimeRange(appt.startTime, appt.endTime)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography>{appt.user?.name ?? 'Deleted user'}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {appt.user?.email}
                      </Typography>
                    </TableCell>
                    <TableCell>{appt.service?.name ?? '—'}</TableCell>
                    <TableCell>{appt.staff?.name ?? '—'}</TableCell>
                    <TableCell>
                      <StatusChip status={appt.status} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        aria-label="Actions"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenu({ anchor: e.currentTarget, appt });
                        }}
                      >
                        <MoreVertRoundedIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {!loading && <TablePager pagination={pagination} onChange={(page) => setFilters({ page })} />}
      </Card>

      {/* Row actions */}
      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {menu &&
          availableActions(menu.appt).map((key) => {
            if (key === 'reschedule') {
              return (
                <MenuItem key={key} onClick={() => choose('reschedule', menu.appt)}>
                  <ListItemIcon>
                    <EditCalendarRoundedIcon fontSize="small" />
                  </ListItemIcon>
                  Reschedule
                </MenuItem>
              );
            }
            const { label, icon: Icon, color } = ACTIONS[key];
            return (
              <MenuItem key={key} onClick={() => choose(key, menu.appt)} sx={{ color: color === 'error' ? 'error.main' : undefined }}>
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                {label}
              </MenuItem>
            );
          })}
      </Menu>

      {/* Details */}
      <Dialog open={Boolean(details)} onClose={() => setDetails(null)} maxWidth="xs" fullWidth>
        {details && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              Appointment
              <StatusChip status={details.status} />
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Detail label="When">
                  {formatDate(details.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  <Typography variant="body2" color="text.secondary">
                    {formatTimeRange(details.startTime, details.endTime)}
                  </Typography>
                </Detail>
                <Detail label="Client">
                  {details.user?.name ?? 'Deleted user'}
                  <Typography variant="body2" color="text.secondary">
                    {details.user?.email}
                    {details.user?.phone ? ` · ${details.user.phone}` : ''}
                  </Typography>
                </Detail>
                <Detail label="Service">
                  {details.service?.name ?? 'Service removed'}
                  {details.service && (
                    <Typography variant="body2" color="text.secondary">
                      {formatDuration(details.service.durationMinutes)} · {formatPrice(details.service.price)}
                    </Typography>
                  )}
                </Detail>
                <Detail label="Specialist">{details.staff?.name ?? 'Staff removed'}</Detail>
                <Divider />
                <Detail label="Client notes">
                  <Typography sx={{ whiteSpace: 'pre-wrap', color: details.notes ? 'text.primary' : 'text.disabled' }}>{details.notes || 'No notes'}</Typography>
                </Detail>
                <Detail label="Staff notes (private, never shown to the client)">
                  <Typography sx={{ whiteSpace: 'pre-wrap', color: details.staffNotes ? 'text.primary' : 'text.disabled' }}>
                    {details.staffNotes || 'None'}
                  </Typography>
                </Detail>
                <Typography variant="caption" color="text.secondary">
                  Booked {new Date(details.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </Typography>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
              {availableActions(details)
                .filter((a) => a !== 'delete')
                .map((key) => (
                  <Button key={key} onClick={() => choose(key, details)} color={key === 'reschedule' ? 'primary' : ACTIONS[key].color}>
                    {key === 'reschedule' ? 'Reschedule' : ACTIONS[key].label}
                  </Button>
                ))}
              <Button onClick={() => setDetails(null)} variant="contained">
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        busy={busy}
        title={pendingAction && ACTIONS[pendingAction.action].title}
        message={
          pendingAction && (
            <>
              <strong>
                {pendingAction.appt.user?.name ?? 'Client'} · {pendingAction.appt.service?.name ?? 'Service'}
              </strong>
              <br />
              {formatDate(pendingAction.appt.date)}, {formatTimeRange(pendingAction.appt.startTime, pendingAction.appt.endTime)}
              <br />
              <br />
              {ACTIONS[pendingAction.action].message}
            </>
          )
        }
        confirmText={pendingAction && ACTIONS[pendingAction.action].label}
        cancelText="Go back"
        color={pendingAction ? ACTIONS[pendingAction.action].color : 'primary'}
        onConfirm={runAction}
        onClose={() => setPendingAction(null)}
      />

      {rescheduling && (
        <RescheduleDialog
          appointment={rescheduling}
          onClose={() => setRescheduling(null)}
          onSaved={() => {
            setRescheduling(null);
            showToast('Appointment rescheduled.');
            reload();
          }}
        />
      )}
    </>
  );
}
