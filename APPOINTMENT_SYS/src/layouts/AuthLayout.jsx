import { Link, Outlet } from 'react-router-dom';

const HIGHLIGHTS = [
  { icon: 'bi-clock-history', text: 'See open time slots in real time' },
  { icon: 'bi-calendar2-check', text: 'Book, reschedule or cancel in seconds' },
  { icon: 'bi-shield-lock', text: 'Your account and data stay secure' },
];

// Split-screen layout for the login and sign-up pages.
export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <aside className="auth-aside d-none d-lg-flex">
        <Link to="/" className="brand brand-light">
          <span className="brand-mark">
            <i className="bi bi-calendar2-check" />
          </span>
          BookEase
        </Link>
        <div>
          <h2 className="display-6 fw-semibold mb-3">Appointments without the phone calls.</h2>
          <p className="opacity-75 mb-4">
            Choose a service, pick a time that works for you, and get on with your day.
          </p>
          <ul className="list-unstyled d-grid gap-3 mb-0">
            {HIGHLIGHTS.map(({ icon, text }) => (
              <li key={text} className="d-flex align-items-center gap-3">
                <span className="aside-icon">
                  <i className={`bi ${icon}`} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <small className="opacity-50">© {new Date().getFullYear()} BookEase</small>
      </aside>

      <section className="auth-main">
        <Link to="/" className="brand d-lg-none mb-4">
          <span className="brand-mark">
            <i className="bi bi-calendar2-check" />
          </span>
          BookEase
        </Link>
        <div className="auth-card">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
