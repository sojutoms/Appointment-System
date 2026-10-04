import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import PageLoader from './PageLoader';

// The sign-in page: already signed-in admins go straight to the dashboard.
export default function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
