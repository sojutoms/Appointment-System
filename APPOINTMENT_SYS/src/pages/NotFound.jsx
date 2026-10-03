import { Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';

export default function NotFound() {
  return (
    <Container className="py-5 text-center">
      <div className="display-1 fw-bold text-primary opacity-25">404</div>
      <h1 className="h4 fw-semibold">Page not found</h1>
      <p className="text-body-secondary">The page you are looking for does not exist or was moved.</p>
      <Button as={Link} to="/">
        Go home
      </Button>
    </Container>
  );
}
