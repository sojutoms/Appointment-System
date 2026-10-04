import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import PageLoader from './PageLoader';

// Guards every admin page. This only hides the UI: the real protection is the
// API, which rejects any request without a valid admin-panel token.
export default function RequireAdmin() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Checking your session..." />;
  if (!user || user.role !== 'admin') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
