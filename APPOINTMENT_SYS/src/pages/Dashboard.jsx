import { useEffect, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import api from '../api/axios';
import PageLoader from '../components/PageLoader';
import useAuth from '../hooks/useAuth';
import { getErrorMessage } from '../utils/errors';

function StatCard({ icon, label, value, tone }) {
  return (
    <Card className="h-100 border-0 shadow-sm">
      <Card.Body className="d-flex align-items-center gap-3">
        <span className={`stat-icon tone-${tone}`}>
          <i className={`bi ${icon}`} />
        </span>
        <div>
          <div className="small text-body-secondary">{label}</div>
          <div className="h4 fw-semibold mb-0">{value}</div>
        </div>
      </Card.Body>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/appointments/stats')
      .then(({ data }) => setStats(data))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const isAdmin = user.role === 'admin';
  const cards = stats && [
    { icon: 'bi-calendar-day', label: "Today's appointments", value: stats.today, tone: 'primary' },
    { icon: 'bi-hourglass-split', label: 'Pending', value: stats.byStatus.pending, tone: 'warning' },
    { icon: 'bi-check2-circle', label: 'Confirmed', value: stats.byStatus.confirmed, tone: 'success' },
    { icon: 'bi-archive', label: 'Completed', value: stats.byStatus.completed, tone: 'secondary' },
    ...(isAdmin
      ? [
          { icon: 'bi-people', label: 'Clients', value: stats.clients, tone: 'info' },
          { icon: 'bi-briefcase', label: 'Active services', value: stats.activeServices, tone: 'primary' },
          { icon: 'bi-person-badge', label: 'Active staff', value: stats.activeStaff, tone: 'success' },
          { icon: 'bi-x-circle', label: 'Cancelled', value: stats.byStatus.cancelled, tone: 'danger' },
        ]
      : []),
  ];

  return (
    <Container className="py-4 py-md-5">
      <div className="mb-4">
        <h1 className="h3 fw-semibold mb-1">Hello, {user.name.split(' ')[0]} 👋</h1>
        <p className="text-body-secondary mb-0">
          {isAdmin ? 'Here is an overview of the appointment system.' : 'Here is a summary of your appointments.'}
        </p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {!stats && !error && <PageLoader label="Loading your dashboard..." />}

      {cards && (
        <div className="row g-3">
          {cards.map((card) => (
            <div className="col-6 col-lg-3" key={card.label}>
              <StatCard {...card} />
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}
