import Divider from '@mui/material/Divider';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// "Showing 1–10 of 42" + page buttons, shown under list tables.
export default function TablePager({ pagination, onChange }) {
  if (!pagination || pagination.total === 0) return null;
  const { page, limit, total, totalPages } = pagination;
  return (
    <>
      <Divider />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ p: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
        </Typography>
        {totalPages > 1 && <Pagination count={totalPages} page={page} onChange={(_e, value) => onChange(value)} color="primary" shape="rounded" />}
      </Stack>
    </>
  );
}
