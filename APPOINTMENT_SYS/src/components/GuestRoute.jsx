import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import PageLoader from './PageLoader';

// Login and sign-up pages: logged-in users are sent to their dashboard instead.
export default function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
