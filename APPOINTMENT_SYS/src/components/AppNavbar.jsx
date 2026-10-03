import { Link, NavLink, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Button from 'react-bootstrap/Button';
import useAuth from '../hooks/useAuth';

export default function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Navbar expand="md" className="app-navbar border-bottom" sticky="top" collapseOnSelect>
      <Container>
        <Navbar.Brand as={Link} to={user ? '/dashboard' : '/'} className="brand">
          <span className="brand-mark">
            <i className="bi bi-calendar2-check" />
          </span>
          BookEase
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto">
            {user ? (
              <Nav.Link as={NavLink} to="/dashboard" eventKey="dashboard">
                Dashboard
              </Nav.Link>
            ) : (
              <Nav.Link as={NavLink} to="/" end eventKey="home">
                Home
              </Nav.Link>
            )}
          </Nav>

          {user ? (
            <Nav>
              <NavDropdown
                align="end"
                id="user-menu"
                title={
                  <span className="d-inline-flex align-items-center gap-2">
                    <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
                    <span>{user.name.split(' ')[0]}</span>
                  </span>
                }
              >
                <NavDropdown.Header>
                  <div className="fw-semibold text-body">{user.name}</div>
                  <div className="small">{user.email}</div>
                </NavDropdown.Header>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-2" />
                  Log out
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>
          ) : (
            <div className="d-flex gap-2 py-2 py-md-0">
              <Button as={Link} to="/login" variant="outline-primary" size="sm">
                Log in
              </Button>
              <Button as={Link} to="/register" variant="primary" size="sm">
                Sign up
              </Button>
            </div>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
