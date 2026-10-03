import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import api from '../api/axios';
import PasswordField from '../components/PasswordField';
import useAuth from '../hooks/useAuth';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { setPendingEmail, startCooldown } from '../utils/otpSession';
import { validateLogin } from '../utils/validation';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Where the user was trying to go before being sent to login.
  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validateLogin(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        await continueVerification(err.response.data.email);
        return;
      }
      setErrors(getFieldErrors(err));
      setServerError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  // Correct password but the email was never verified: send a fresh code
  // (unless one was sent very recently) and go to the verification screen.
  const continueVerification = async (email) => {
    setPendingEmail(email);
    let notice = 'Your email is not verified yet. We sent you a new code.';
    try {
      const { data } = await api.post('/auth/resend-otp', { email, purpose: 'verify-email' });
      startCooldown('verify-email', email, data.resendAvailableIn);
    } catch (err) {
      const retryAfter = err.response?.data?.retryAfter;
      if (retryAfter) startCooldown('verify-email', email, retryAfter);
      notice = 'Your email is not verified yet. Enter the code we sent earlier, or request a new one.';
    }
    navigate('/verify-email', { state: { notice } });
  };

  return (
    <>
      <h1 className="h3 fw-semibold mb-1">Welcome back</h1>
      <p className="text-body-secondary mb-4">Log in to manage your appointments.</p>

      {location.state?.message && !serverError && <Alert variant="success">{location.state.message}</Alert>}

      {serverError && (
        <Alert variant="danger" onClose={() => setServerError('')} dismissible>
          {serverError}
        </Alert>
      )}

      <Form noValidate onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="email">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            name="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            value={form.email}
            onChange={handleChange}
            isInvalid={Boolean(errors.email)}
          />
          <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
        </Form.Group>

        <PasswordField
          id="password"
          label="Password"
          name="password"
          placeholder="Enter your password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
        />
        <div className="text-end mt-n2 mb-3">
          <Link to="/forgot-password" state={{ email: form.email.trim() }} className="small">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-100" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner size="sm" className="me-2" />
              Logging in...
            </>
          ) : (
            'Log in'
          )}
        </Button>
      </Form>

      <p className="text-center text-body-secondary mt-4 mb-0">
        Don&apos;t have an account? <Link to="/register">Sign up</Link>
      </p>
    </>
  );
}
