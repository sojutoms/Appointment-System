import { Outlet } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';

export default function MainLayout() {
  return (
    <div className="app-shell">
      <AppNavbar />
      <main className="flex-grow-1">
        <Outlet />
      </main>
      <footer className="app-footer border-top">
        <div className="container small text-body-secondary py-3">
          © {new Date().getFullYear()} BookEase · Online Appointment System
        </div>
      </footer>
    </div>
  );
}
