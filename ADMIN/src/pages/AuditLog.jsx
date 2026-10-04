import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import SearchField from '../components/SearchField';
import TablePager from '../components/TablePager';
import useApiList from '../hooks/useApiList';
import useUrlFilters, { FILTER } from '../hooks/useUrlFilters';

const CATEGORIES = [
  { value: '', label: 'All events' },
  { value: 'auth.', label: 'Sign-ins' },
  { value: 'appointment.', label: 'Appointments' },
  { value: 'service.', label: 'Services' },
  { value: 'staff.', label: 'Staff' },
  { value: 'timeoff.', label: 'Time off' },
  { value: 'user.', label: 'Users' },
  { value: 'account.', label: 'Own account' },
];

const LABELS = {
  'auth.admin_login': 'Signed in',
  'auth.admin_login_failed': 'Sign-in failed',
  'auth.admin_2fa_failed': 'Wrong sign-in code',
  'auth.admin_logout': 'Signed out',
  'auth.step_up_failed': 'Wrong password on confirm',
  'appointment.confirmed': 'Confirmed appointment',
  'appointment.completed': 'Completed appointment',
  'appointment.cancelled': 'Cancelled appointment',
  'appointment.pending': 'Reopened appointment',
  'appointment.reschedule': 'Rescheduled appointment',
  'appointment.delete': 'Deleted appointment',
  'service.create': 'Added service',
  'service.update': 'Updated service',
  'service.delete': 'Deleted service',
  'staff.create': 'Added staff',
  'staff.update': 'Updated staff',
  'staff.delete': 'Deleted staff',
  'staff.invite': 'Sent staff invite',
  'staff.revoke_access': 'Revoked staff access',
  'staff.appointment_confirmed': 'Staff confirmed appointment',
  'staff.appointment_completed': 'Staff completed appointment',
  'timeoff.create': 'Added time off',
  'timeoff.delete': 'Removed time off',
  'user.role_change': 'Changed role',
  'user.unlock': 'Unlocked account',
  'user.delete': 'Deleted user',
  'account.password_change': 'Changed password',
};

const COLORS = { auth: 'info', appointment: 'primary', service: 'secondary', staff: 'secondary', timeoff: 'secondary', user: 'warning', account: 'default' };

// Read-only view of the append-only audit trail.
export default function AuditLog() {
  const [filters, setFilters] = useUrlFilters(
    { q: '', action: '', success: '' },
    { q: FILTER.search, action: CATEGORIES.map((c) => c.value), success: ['true', 'false'] }
  );
  const { items, pagination, loading, error } = useApiList('/admin/audit-logs', {
    search: filters.q,
    action: filters.action,
    success: filters.success,
    page: filters.page,
    limit: 20,
  });

  return (
    <>
      <PageHeader title="Audit log" description="Every admin sign-in and change, newest first. Entries can't be edited or deleted." />

      <Card>
        <Box sx={{ p: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' } }}>
          <SearchField value={filters.q} onChange={(q) => setFilters({ q })} placeholder="Search admin email, details or IP" />
          <TextField
            select
            size="small"
            label="Type"
            value={filters.action}
            onChange={(e) => setFilters({ action: e.target.value })}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Result"
            value={filters.success}
            onChange={(e) => setFilters({ success: e.target.value })}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            <MenuItem value="">All results</MenuItem>
            <MenuItem value="true">Succeeded</MenuItem>
            <MenuItem value="false">Failed / suspicious</MenuItem>
          </TextField>
        </Box>
        <Divider />
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Skeleton key={n} height={48} />
            ))}
          </Box>
        ) : items.length === 0 && !error ? (
          <EmptyState icon={HistoryRoundedIcon} title="No events found" description="Try a different filter." />
        ) : (
          <TableContainer>
            <Table size="small" sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>Admin</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell>IP address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((entry) => {
                  const category = entry.action.split('.')[0];
                  return (
                    <TableRow key={entry._id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {new Date(entry.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                      </TableCell>
                      <TableCell>{entry.actorEmail || <Typography variant="body2" color="text.disabled">unknown</Typography>}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={entry.success ? <CheckCircleOutlineRoundedIcon /> : <ErrorOutlineRoundedIcon />}
                          label={LABELS[entry.action] ?? entry.action}
                          color={entry.success ? COLORS[category] ?? 'default' : 'error'}
                          variant={entry.success ? 'outlined' : 'filled'}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 380 }}>
                        <Typography variant="body2">{entry.summary}</Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={entry.userAgent || ''}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {entry.ip || '—'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {!loading && <TablePager pagination={pagination} onChange={(page) => setFilters({ page })} />}
      </Card>
    </>
  );
}
