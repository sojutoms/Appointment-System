import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Placeholder from 'react-bootstrap/Placeholder';
import api from '../api/axios';

const STEPS = [
  { icon: 'bi-person-plus', title: 'Create an account', text: 'Sign up free with your email.' },
  { icon: 'bi-list-check', title: 'Choose a service', text: 'Pick what you need and who you want to see.' },
  { icon: 'bi-calendar-event', title: 'Pick a time', text: 'Only open slots are shown, so no double-booking.' },
];

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

export default function Home() {
  const [services, setServices] = useState(null);

  useEffect(() => {
    api
      .get('/services', { params: { limit: 6 } })
      .then(({ data }) => setServices(data.items))
      .catch(() => setServices([]));
  }, []);

  return (
    <>
      <section className="hero">
        <Container className="py-5">
          <div className="col-lg-7 py-lg-4">
            <span className="badge rounded-pill text-bg-light border mb-3">Online Appointment System</span>
            <h1 className="display-5 fw-semibold mb-3">Book your next appointment in under a minute.</h1>
            <p className="lead text-body-secondary mb-4">
              See real-time availability, choose a time that suits you, and manage every booking in one place.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <Button as={Link} to="/register" size="lg">
                Get started
              </Button>
              <Button as={Link} to="/login" size="lg" variant="outline-secondary">
                I already have an account
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-5">
        <h2 className="h4 fw-semibold mb-4">How it works</h2>
        <div className="row g-3 mb-5">
          {STEPS.map((step, i) => (
            <div className="col-md-4" key={step.title}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <span className="step-icon mb-3">
                    <i className={`bi ${step.icon}`} />
                  </span>
                  <Card.Title as="h3" className="h6 fw-semibold">
                    {i + 1}. {step.title}
                  </Card.Title>
                  <Card.Text className="text-body-secondary small">{step.text}</Card.Text>
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>

        <h2 className="h4 fw-semibold mb-4">Our services</h2>
        <div className="row g-3">
          {services === null &&
            [1, 2, 3].map((n) => (
              <div className="col-md-4" key={n}>
                <Card className="h-100">
                  <Card.Body>
                    <Placeholder as={Card.Title} animation="glow">
                      <Placeholder xs={7} />
                    </Placeholder>
                    <Placeholder as={Card.Text} animation="glow">
                      <Placeholder xs={10} /> <Placeholder xs={6} />
                    </Placeholder>
                  </Card.Body>
                </Card>
              </div>
            ))}
          {services?.length === 0 && (
            <p className="text-body-secondary">Services will appear here once they are added.</p>
          )}
          {services?.map((service) => (
            <div className="col-md-6 col-lg-4" key={service._id}>
              <Card className="h-100 service-card">
                <Card.Body className="d-flex flex-column">
                  <Card.Title as="h3" className="h6 fw-semibold">
                    {service.name}
                  </Card.Title>
                  <Card.Text className="text-body-secondary small flex-grow-1">{service.description}</Card.Text>
                  <div className="d-flex justify-content-between small">
                    <span>
                      <i className="bi bi-clock me-1" />
                      {service.durationMinutes} min
                    </span>
                    <span className="fw-semibold">{peso.format(service.price)}</span>
                  </div>
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
