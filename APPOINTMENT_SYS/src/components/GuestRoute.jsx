import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { homeFor } from '../utils/roles';
import PageLoader from './PageLoader';

// Login and sign-up pages: signed-in users are sent to their own home page instead.
export default function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (user) return <Navigate to={homeFor(user)} replace />;

  return <Outlet />;
}
