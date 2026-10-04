import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AuthProvider from './context/AuthProvider';
import ToastProvider from './context/ToastProvider';
import GuestOnly from './components/GuestOnly';
import RequireAdmin from './components/RequireAdmin';
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages are loaded on demand (code splitting).
const Account = lazy(() => import('./pages/Account'));
const Appointments = lazy(() => import('./pages/Appointments'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Services = lazy(() => import('./pages/Services'));
const Staff = lazy(() => import('./pages/Staff'));
const Users = lazy(() => import('./pages/Users'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route element={<GuestOnly />}>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
              </Route>
            </Route>

            {/* Every other page requires an admin session. */}
            <Route element={<RequireAdmin />}>
              <Route element={<AdminLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/appointments" element={<Appointments />} />
                <Route path="/services" element={<Services />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/users" element={<Users />} />
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/account" element={<Account />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
