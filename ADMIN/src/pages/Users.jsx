import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import api from '../api/axios';
import ConfirmPasswordDialog from '../components/ConfirmPasswordDialog';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import SearchField from '../components/SearchField';
import TablePager from '../components/TablePager';
import useApiList from '../hooks/useApiList';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import useUrlFilters from '../hooks/useUrlFilters';
import { getErrorMessage } from '../utils/errors';
import { initials } from '../utils/format';

const ROLE_LABELS = { client: 'Client', staff: 'Staff', admin: 'Admin' };

const shortDate =(value) => (value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never');

export default function Users() {
  const { user: me } = useAuth();
  const showToast = useToast();
  const [filters, setFilters] = useUrlFilters({ q: '', role: '', verified: '' });
  const { items, pagination, loading, error, reload } = useApiList('/users', {
    search: filters.q,
    role: filters.role,
    verified: filters.verified,
    page: filters.page,
    limit: 10,
  });

  const [menu, setMenu] = useState(null); // { anchor, user }
  const [stepUp, setStepUp] = useState(null); // { type: 'role' | 'delete', user, role? }

  const unlock = async (target) => {
    setMenu(null);
    try {
      const { data } = await api.patch(`/users/${target._id}/unlock`);
      showToast(data.message);
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  // Runs inside the password dialog; errors are shown there.
  const runStepUp = async (confirmPassword) => {
    const { type, user, role } = stepUp;
    if (type === 'role') {
      await api.patch(`/users/${user._id}/role`, { role, confirmPassword });
      showToast(role === 'admin' ? `${user.name} is now an admin.` : `${user.name} is now a client.`);
    } else {
      await api.delete(`/users/${user._id}`, { data: { confirmPassword } });
      showToast(`${user.name}'s account was deleted.`);
      if (items.length === 1 && filters.page > 1) setFilters({ page: filters.page - 1 });
    }
    reload();
  };

  const stepUpText = (() => {
    if (!stepUp) return {};
    const { type, user, role } = stepUp;
    if (type === 'delete') {
      return {
        title: `Delete ${user.name}?`,
        message: (
          <>
            This permanently deletes <strong>{user.email}</strong> and <strong>all {user.appointmentCount} of their appointments</strong>. This cannot be
            undone.
          </>
        ),
        confirmText: 'Delete account',
        color: 'error',
      };
    }
    return role === 'admin'
      ? {
          title: `Make ${user.name} an admin?`,
          message: (
            <>
              <strong>{user.email}</strong> will be able to sign in to this admin panel and manage every booking, service, staff member and user. They
              will be signed out everywhere and must sign in again.
            </>
          ),
          confirmText: 'Make admin',
          color: 'warning',
        }
      : {
          title: `Remove admin access from ${user.name}?`,
          message: (
            <>
              <strong>{user.email}</strong> will lose access to the admin panel immediately and be signed out everywhere.
            </>
          ),
          confirmText: 'Remove admin access',
          color: 'error',
        };
  })();

  return (
    <>
      <PageHeader title="Users" description="Client and admin accounts." />

      <Card>
        <Box sx={{ p: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' } }}>
          <SearchField value={filters.q} onChange={(q) => setFilters({ q })} placeholder="Search name, email or phone" />
          <TextField
            select
            size="small"
            label="Role"
            value={filters.role}
            onChange={(e) => setFilters({ role: e.target.value })}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            <MenuItem value="">All roles</MenuItem>
            <MenuItem value="client">Clients</MenuItem>
            <MenuItem value="staff">Staff</MenuItem>
            <MenuItem value="admin">Admins</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Email"
            value={filters.verified}
            onChange={(e) => setFilters({ verified: e.target.value })}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            <MenuItem value="">Verified and unverified</MenuItem>
            <MenuItem value="true">Verified</MenuItem>
            <MenuItem value="false">Not verified</MenuItem>
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
            {[1, 2, 3, 4].map((n) => (
              <Skeleton key={n} height={60} />
            ))}
          </Box>
        ) : items.length === 0 && !error ? (
          <EmptyState icon={GroupOutlinedIcon} title="No matching users" description="Try a different search or filter." />
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Bookings</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell>Last sign-in</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((u) => {
                  const isMe = u._id === me._id;
                  return (
                    <TableRow key={u._id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Avatar sx={{ width: 36, height: 36, fontSize: 14, bgcolor: u.role === 'admin' ? 'secondary.main' : 'primary.main' }}>{initials(u.name)}</Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 600 }}>
                              {u.name} {isMe && <Chip label="You" size="small" sx={{ ml: 0.5 }} />}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {u.email}
                              {u.phone ? ` · ${u.phone}` : ''}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip label={ROLE_LABELS[u.role] ?? u.role} size="small" color={u.role === 'admin' ? 'secondary' : u.role === 'staff' ? 'info' : 'default'} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {u.isVerified === false ? <Chip label="Unverified" size="small" color="warning" /> : <Chip label="Verified" size="small" color="success" variant="outlined" />}
                          {u.locked && (
                            <Tooltip title="Locked for 15 minutes after too many wrong passwords">
                              <Chip icon={<LockRoundedIcon />} label="Locked" size="small" color="error" />
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{u.appointmentCount}</TableCell>
                      <TableCell>{shortDate(u.createdAt)}</TableCell>
                      <TableCell>{shortDate(u.lastLoginAt)}</TableCell>
                      <TableCell align="right">
                        {isMe ? (
                          <Tooltip title="Manage your own account under My account">
                            <span>
                              <IconButton disabled aria-label="No actions for your own account">
                                <MoreVertRoundedIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : (
                          <IconButton onClick={(e) => setMenu({ anchor: e.currentTarget, user: u })} aria-label={`Actions for ${u.name}`}>
                            <MoreVertRoundedIcon />
                          </IconButton>
                        )}
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

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {menu?.user.locked && (
          <MenuItem onClick={() => unlock(menu.user)}>
            <ListItemIcon>
              <LockOpenRoundedIcon fontSize="small" />
            </ListItemIcon>
            Unlock account
          </MenuItem>
        )}
        {menu?.user.role === 'staff' && (
          <MenuItem disabled sx={{ whiteSpace: 'normal', maxWidth: 260 }}>
            Staff accounts are managed on the Staff page (invite / revoke).
          </MenuItem>
        )}
        {menu && menu.user.role !== 'staff' && (
          <MenuItem
            onClick={() => {
              setStepUp({ type: 'role', user: menu.user, role: menu.user.role === 'admin' ? 'client' : 'admin' });
              setMenu(null);
            }}
          >
            <ListItemIcon>
              {menu.user.role === 'admin' ? <PersonOutlineRoundedIcon fontSize="small" /> : <AdminPanelSettingsOutlinedIcon fontSize="small" />}
            </ListItemIcon>
            {menu.user.role === 'admin' ? 'Remove admin access' : 'Make admin'}
          </MenuItem>
        )}
        {menu && (
          <MenuItem
            onClick={() => {
              setStepUp({ type: 'delete', user: menu.user });
              setMenu(null);
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <DeleteOutlineRoundedIcon fontSize="small" />
            </ListItemIcon>
            Delete account
          </MenuItem>
        )}
      </Menu>

      <ConfirmPasswordDialog
        open={Boolean(stepUp)}
        title={stepUpText.title}
        message={stepUpText.message}
        confirmText={stepUpText.confirmText}
        color={stepUpText.color}
        onConfirm={runStepUp}
        onClose={() => setStepUp(null)}
      />
    </>
  );
}
