import Chip from '@mui/material/Chip';
import { STATUS_META } from '../utils/appointments';

export default function StatusChip({ status, size = 'small' }) {
  const meta = STATUS_META[status] || { label: status, color: 'default' };
  return <Chip label={meta.label} color={meta.color} size={size} variant={status === 'completed' ? 'outlined' : 'filled'} />;
}
