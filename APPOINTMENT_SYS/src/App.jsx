import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom';
import AuthProvider from './context/AuthProvider';
import ToastProvider from './context/ToastProvider';
import GuestRoute from './components/GuestRoute';
import PageLoader from './components/PageLoader';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import { CLIENT_ROLES } from './utils/roles';

// Pages are loaded on demand (code splitting) to keep the first download small.
const BookAppointment = lazy(() => import('./pages/BookAppointment'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const MyAppointments = lazy(() => import('./pages/MyAppointments'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Profile = lazy(() => import('./pages/Profile'));
const Register = lazy(() => import('./pages/Register'));
const StaffActivate = lazy(() => import('./pages/StaffActivate'));
const StaffSchedule = lazy(() => import('./pages/staff/StaffSchedule'));
const StaffTimeOff = lazy(() => import('./pages/staff/StaffTimeOff'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));

// A different appointment id must start a fresh booking wizard.
function RescheduleRoute() {
  const { id } = useParams();
  return <BookAppointment key={id} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Only for visitors who are not logged in */}
              <Route element={<GuestRoute />}>
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/staff/activate" element={<StaffActivate />} />
                </Route>
              </Route>

              <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />

                {/* Clients (booking side) */}
                <Route element={<ProtectedRoute roles={CLIENT_ROLES} />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/book" element={<BookAppointment key="new" />} />
                  <Route path="/appointments" element={<MyAppointments />} />
                  {/* Keyed per route so state never carries over between booking and rescheduling. */}
                  <Route path="/appointments/:id/reschedule" element={<RescheduleRoute />} />
                </Route>

                {/* Staff portal */}
                <Route element={<ProtectedRoute roles={['staff']} />}>
                  <Route path="/staff" element={<StaffSchedule />} />
                  <Route path="/staff/time-off" element={<StaffTimeOff />} />
                </Route>

                {/* Everyone signed in */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/profile" element={<Profile />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
