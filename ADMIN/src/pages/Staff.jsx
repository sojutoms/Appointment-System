import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import api from '../api/axios';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import SearchField from '../components/SearchField';
import StaffFormDialog from '../components/StaffFormDialog';
import TimeOffDialog from '../components/TimeOffDialog';
import TablePager from '../components/TablePager';
import useApiList from '../hooks/useApiList';
import useToast from '../hooks/useToast';
import useUrlFilters from '../hooks/useUrlFilters';
import { getErrorMessage } from '../utils/errors';
import { formatTime, formatWorkingDays, initials } from '../utils/format';

export default function Staff() {
  const showToast = useToast();
  const [filters, setFilters] = useUrlFilters({ q: '' });
  const { items, pagination, loading, error, reload } = useApiList('/staff', {
    includeInactive: true,
    search: filters.q,
    page: filters.page,
    limit: 10,
  });

  const [editing, setEditing] = useState(null); // null | 'new' | staff
  const [deleting, setDeleting] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const [timeOffFor, setTimeOffFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState('');
  const [inviting, setInviting] = useState('');

  const invite = async (member) => {
    if (!member.email) {
      showToast('Add a work email first: edit the staff member, then send the invite.', 'warning');
      setEditing(member);
      return;
    }
    setInviting(member._id);
    try {
      const { data } = await api.post(`/staff/${member._id}/invite`);
      showToast(`${data.message} The code is valid for 24 hours.`);
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setInviting('');
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      const { data } = await api.delete(`/staff/${revoking._id}/access`);
      showToast(data.message);
      setRevoking(null);
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (member) => {
    setToggling(member._id);
    try {
      await api.put(`/staff/${member._id}`, { isActive: !member.isActive });
      showToast(`${member.name} is now ${member.isActive ? 'hidden from clients' : 'bookable'}.`);
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setToggling('');
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/staff/${deleting._id}`);
      showToast('Staff member deleted.');
      setDeleting(null);
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Staff"
        description="Specialists, the services they offer and when they work."
        action={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setEditing('new')}>
            Add staff member
          </Button>
        }
      />

      <Card>
        <Box sx={{ p: 2 }}>
          <SearchField value={filters.q} onChange={(q) => setFilters({ q })} placeholder="Search by name or specialization" sx={{ width: { xs: '100%', sm: 360 } }} />
        </Box>
        <Divider />
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} height={64} />
            ))}
          </Box>
        ) : items.length === 0 && !error ? (
          <EmptyState
            icon={BadgeOutlinedIcon}
            title={filters.q ? 'No matching staff' : 'No staff yet'}
            description={filters.q ? 'Try a different search.' : 'Add a specialist so clients can start booking.'}
          />
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Services</TableCell>
                  <TableCell>Schedule</TableCell>
                  <TableCell>Staff portal</TableCell>
                  <TableCell>Bookable</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((member) => (
                  <TableRow key={member._id} hover sx={{ opacity: member.isActive ? 1 : 0.6 }}>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Avatar sx={{ width: 36, height: 36, fontSize: 14, bgcolor: 'primary.main' }}>{initials(member.name)}</Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 600 }}>{member.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {member.specialization || '—'}
                            {member.email ? ` · ${member.email}` : ''}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      {member.services.length ? (
                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                          {member.services.map((s) => (
                            <Chip key={s._id} label={s.name} size="small" variant={s.isActive ? 'filled' : 'outlined'} />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="warning.main">
                          No services: clients can&apos;t book
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatWorkingDays(member.workingDays)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatTime(member.startTime)} – {formatTime(member.endTime)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <PortalCell member={member} busy={inviting === member._id} onInvite={invite} onRevoke={setRevoking} />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={member.isActive}
                        onChange={() => toggleActive(member)}
                        disabled={toggling === member._id}
                        slotProps={{ input: { 'aria-label': `Bookable: ${member.name}` } }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Time off">
                        <IconButton onClick={() => setTimeOffFor(member)} aria-label={`Time off for ${member.name}`}>
                          <EventBusyOutlinedIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => setEditing(member)} aria-label={`Edit ${member.name}`}>
                          <EditOutlinedIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton color="error" onClick={() => setDeleting(member)} aria-label={`Delete ${member.name}`}>
                          <DeleteOutlineRoundedIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {!loading && <TablePager pagination={pagination} onChange={(page) => setFilters({ page })} />}
      </Card>

      {editing && (
        <StaffFormDialog
          staff={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            showToast(editing === 'new' ? `${saved.name} added.` : 'Staff member updated.');
            setEditing(null);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        busy={busy}
        title={`Delete ${deleting?.name}?`}
        message="Staff with pending or confirmed appointments can't be deleted; switch them off instead so past records stay intact. Their staff-portal login (if any) is deleted too."
        confirmText="Delete"
        cancelText="Keep"
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={Boolean(revoking)}
        busy={busy}
        title={`Revoke portal access for ${revoking?.name}?`}
        message="Their staff-portal login is deleted and they are signed out immediately. Their appointments and schedule are not affected, and you can invite them again later."
        confirmText="Revoke access"
        cancelText="Keep access"
        onConfirm={revoke}
        onClose={() => setRevoking(null)}
      />

      {timeOffFor && <TimeOffDialog staff={timeOffFor} onClose={() => setTimeOffFor(null)} onChanged={(message) => showToast(message)} />}
    </>
  );
}

const PORTAL = {
  none: { label: 'No access', color: 'default', variant: 'outlined' },
  invited: { label: 'Invited', color: 'warning', variant: 'filled' },
  active: { label: 'Active', color: 'success', variant: 'filled' },
};

// Staff-portal status + the matching action (invite / resend / revoke).
function PortalCell({ member, busy, onInvite, onRevoke }) {
  const status = member.portal?.status ?? 'none';
  const meta = PORTAL[status];
  return (
    <Stack spacing={0.75} sx={{ alignItems: 'flex-start' }}>
      <Tooltip title={status === 'active' && member.portal.lastLoginAt ? `Last sign-in ${new Date(member.portal.lastLoginAt).toLocaleString('en-US')}` : ''}>
        <Chip label={meta.label} color={meta.color} variant={meta.variant} size="small" />
      </Tooltip>
      {status === 'none' && (
        <Button size="small" startIcon={<MailOutlineRoundedIcon />} onClick={() => onInvite(member)} disabled={busy} sx={{ p: 0, minWidth: 0 }}>
          Invite
        </Button>
      )}
      {status === 'invited' && (
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={() => onInvite(member)} disabled={busy} sx={{ p: 0, minWidth: 0 }}>
            Resend
          </Button>
          <Button size="small" color="error" onClick={() => onRevoke(member)} sx={{ p: 0, minWidth: 0 }}>
            Cancel
          </Button>
        </Stack>
      )}
      {status === 'active' && (
        <Button size="small" color="error" startIcon={<PersonOffOutlinedIcon />} onClick={() => onRevoke(member)} sx={{ p: 0, minWidth: 0 }}>
          Revoke
        </Button>
      )}
    </Stack>
  );
}
