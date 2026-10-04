import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { homeFor } from '../utils/roles';
import PageLoader from './PageLoader';

// Wraps routes that require login. `roles` restricts further, e.g.
// <ProtectedRoute roles={['staff']} /> for the staff portal. Anyone signed in
// with the wrong role is sent to their own home page. (The API enforces the
// same rules; this only keeps the UI tidy.)
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;

  return <Outlet />;
}
