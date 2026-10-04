import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
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
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import api from '../api/axios';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import SearchField from '../components/SearchField';
import ServiceFormDialog from '../components/ServiceFormDialog';
import TablePager from '../components/TablePager';
import useApiList from '../hooks/useApiList';
import useToast from '../hooks/useToast';
import useUrlFilters from '../hooks/useUrlFilters';
import { getErrorMessage } from '../utils/errors';
import { formatDuration, formatPrice } from '../utils/format';

export default function Services() {
  const showToast = useToast();
  const [filters, setFilters] = useUrlFilters({ q: '' });
  const { items, pagination, loading, error, reload } = useApiList('/services', {
    includeInactive: true,
    search: filters.q,
    page: filters.page,
    limit: 10,
  });

  const [editing, setEditing] = useState(null); // null | 'new' | service
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState('');

  const toggleActive = async (service) => {
    setToggling(service._id);
    try {
      await api.put(`/services/${service._id}`, { isActive: !service.isActive });
      showToast(`"${service.name}" is now ${service.isActive ? 'hidden from clients' : 'bookable'}.`);
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
      await api.delete(`/services/${deleting._id}`);
      showToast('Service deleted.');
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
        title="Services"
        description="What clients can book, how long it takes and what it costs."
        action={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setEditing('new')}>
            Add service
          </Button>
        }
      />

      <Card>
        <Box sx={{ p: 2 }}>
          <SearchField value={filters.q} onChange={(q) => setFilters({ q })} placeholder="Search services" sx={{ width: { xs: '100%', sm: 360 } }} />
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
              <Skeleton key={n} height={56} />
            ))}
          </Box>
        ) : items.length === 0 && !error ? (
          <EmptyState
            icon={MedicalServicesOutlinedIcon}
            title={filters.q ? 'No matching services' : 'No services yet'}
            description={filters.q ? 'Try a different search.' : 'Add the first service clients can book.'}
          />
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Service</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Bookable</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((service) => (
                  <TableRow key={service._id} hover sx={{ opacity: service.isActive ? 1 : 0.6 }}>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Typography sx={{ fontWeight: 600 }}>{service.name}</Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {service.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDuration(service.durationMinutes)}</TableCell>
                    <TableCell>{formatPrice(service.price)}</TableCell>
                    <TableCell>
                      <Tooltip title={service.isActive ? 'Visible to clients. Click to hide.' : 'Hidden from clients. Click to show.'}>
                        <Switch
                          checked={service.isActive}
                          onChange={() => toggleActive(service)}
                          disabled={toggling === service._id}
                          slotProps={{ input: { 'aria-label': `Bookable: ${service.name}` } }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton onClick={() => setEditing(service)} aria-label={`Edit ${service.name}`}>
                          <EditOutlinedIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton color="error" onClick={() => setDeleting(service)} aria-label={`Delete ${service.name}`}>
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
        <ServiceFormDialog
          service={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            showToast(editing === 'new' ? `"${saved.name}" added.` : 'Service updated.');
            setEditing(null);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        busy={busy}
        title={`Delete "${deleting?.name}"?`}
        message="It will be removed from every specialist. Services with pending or confirmed appointments can't be deleted; switch them off instead."
        confirmText="Delete"
        cancelText="Keep it"
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
