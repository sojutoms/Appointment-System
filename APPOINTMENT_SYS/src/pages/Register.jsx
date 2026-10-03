import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Spinner from 'react-bootstrap/Spinner';
import PasswordField from '../components/PasswordField';
import useAuth from '../hooks/useAuth';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { setPendingEmail, startCooldown } from '../utils/otpSession';
import { passwordStrength, validateRegister } from '../utils/validation';

const STRENGTH = [
  { label: 'Too weak', variant: 'danger' },
  { label: 'Weak', variant: 'danger' },
  { label: 'Fair', variant: 'warning' },
  { label: 'Good', variant: 'info' },
  { label: 'Strong', variant: 'success' },
];

const INITIAL = { name: '', email: '', phone: '', password: '', confirmPassword: '' };

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const strength = STRENGTH[passwordStrength(form.password)];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validateRegister(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSubmitting(true);
    const email = form.email.trim().toLowerCase();
    try {
      const data = await register({
        name: form.name.trim(),
        email,
        phone: form.phone.trim(),
        password: form.password,
      });
      setPendingEmail(email);
      startCooldown('verify-email', email, data.resendAvailableIn);
      navigate('/verify-email');
    } catch (err) {
      // Signed up again within the resend cooldown: the account details were
      // updated and the code already sent still works, so continue to verify.
      if (err.response?.data?.code === 'OTP_COOLDOWN') {
        setPendingEmail(email);
        startCooldown('verify-email', email, err.response.data.retryAfter);
        navigate('/verify-email', { state: { notice: 'Use the code we already sent to your email.' } });
        return;
      }
      setErrors(getFieldErrors(err));
      setServerError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1 className="h3 fw-semibold mb-1">Create your account</h1>
      <p className="text-body-secondary mb-4">It only takes a minute to start booking.</p>

      {serverError && (
        <Alert variant="danger" onClose={() => setServerError('')} dismissible>
          {serverError}
        </Alert>
      )}

      <Form noValidate onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="name">
          <Form.Label>Full name</Form.Label>
          <Form.Control
            name="name"
            placeholder="Juan Dela Cruz"
            autoComplete="name"
            autoFocus
            value={form.name}
            onChange={handleChange}
            isInvalid={Boolean(errors.name)}
          />
          <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
        </Form.Group>

        <div className="row g-3 mb-3">
          <Form.Group className="col-sm-7" controlId="email">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              isInvalid={Boolean(errors.email)}
            />
            <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="col-sm-5" controlId="phone">
            <Form.Label>
              Phone <span className="text-body-secondary fw-normal">(optional)</span>
            </Form.Label>
            <Form.Control
              type="tel"
              name="phone"
              placeholder="0917 123 4567"
              autoComplete="tel"
              value={form.phone}
              onChange={handleChange}
              isInvalid={Boolean(errors.phone)}
            />
            <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
          </Form.Group>
        </div>

        <PasswordField
          id="password"
          label="Password"
          name="password"
          placeholder="At least 8 characters, with a letter and a number"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
        />
        {form.password && (
          <div className="password-meter mb-3" aria-live="polite">
            <ProgressBar
              now={(passwordStrength(form.password) / 4) * 100 || 5}
              variant={strength.variant}
              style={{ height: 6 }}
            />
            <small className="text-body-secondary">Strength: {strength.label}</small>
          </div>
        )}

        <PasswordField
          id="confirmPassword"
          label="Confirm password"
          name="confirmPassword"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />

        <Button type="submit" className="w-100 mt-2" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner size="sm" className="me-2" />
              Sending verification code...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </Form>

      <p className="text-center text-body-secondary mt-4 mb-0">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </>
  );
}
