import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import api from '../api/axios';
import OtpInput from '../components/OtpInput';
import PasswordField from '../components/PasswordField';
import ResendCode from '../components/ResendCode';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { getCooldownUntil, startCooldown } from '../utils/otpSession';
import { validateEmail, validatePassword } from '../utils/validation';

const PURPOSE = 'reset-password';
const STEPS = ['Email', 'Code', 'New password'];

function StepIndicator({ step }) {
  return (
    <ol className="step-indicator mb-4" aria-label="Progress">
      {STEPS.map((label, i) => (
        <li key={label} className={i < step ? 'done' : i === step ? 'active' : ''} aria-current={i === step ? 'step' : undefined}>
          <span className="step-dot">{i < step ? <i className="bi bi-check" /> : i + 1}</span>
          <span className="step-label">{label}</span>
        </li>
      ))}
    </ol>
  );
}

function SubmitButton({ busy, busyText, children, disabled }) {
  return (
    <Button type="submit" className="w-100" size="lg" disabled={busy || disabled}>
      {busy ? (
        <>
          <Spinner size="sm" className="me-2" />
          {busyText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

// Three steps on one page: request a code -> enter the code -> set a new password.
export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' });

  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const fail = (err) => {
    setError(getErrorMessage(err));
    setFieldErrors(getFieldErrors(err));
    const retryAfter = err.response?.data?.retryAfter;
    if (retryAfter) setCooldownUntil(startCooldown(PURPOSE, normalizedEmail, retryAfter));
  };

  const reset = () => {
    setError('');
    setNotice('');
    setFieldErrors({});
  };

  // Step 1: request the code.
  const requestCode = async (e) => {
    e.preventDefault();
    reset();
    const emailError = validateEmail(email);
    if (emailError) {
      setFieldErrors({ email: emailError });
      return;
    }

    // Still cooling down from an earlier request (e.g. went back a step): reuse that code.
    const existing = getCooldownUntil(PURPOSE, normalizedEmail);
    if (existing) {
      setCooldownUntil(existing);
      setNotice(`We already sent a code to ${normalizedEmail}. Enter it below.`);
      setStep(1);
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: normalizedEmail });
      setCooldownUntil(startCooldown(PURPOSE, normalizedEmail, data.resendAvailableIn));
      setNotice(data.message);
      setStep(1);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    reset();
    try {
      const { data } = await api.post('/auth/resend-otp', { email: normalizedEmail, purpose: PURPOSE });
      setCooldownUntil(startCooldown(PURPOSE, normalizedEmail, data.resendAvailableIn));
      setCode('');
      setNotice('A new code is on its way. Earlier codes no longer work.');
    } catch (err) {
      fail(err);
    }
  };

  // Step 2: check the code; the server returns a one-time reset token.
  const verifyCode = async (otp) => {
    if (busy) return;
    reset();
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter all 6 digits of the code.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/verify-reset-otp', { email: normalizedEmail, otp });
      setResetToken(data.resetToken);
      setStep(2);
    } catch (err) {
      fail(err);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  // Step 3: set the new password.
  const savePassword = async (e) => {
    e.preventDefault();
    reset();
    const errors = {};
    const passwordError = validatePassword(passwords.password);
    if (passwordError) errors.password = passwordError;
    if (passwords.confirmPassword !== passwords.password) errors.confirmPassword = 'Passwords do not match.';
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setBusy(true);
    try {
      await api.post('/auth/reset-password', { email: normalizedEmail, resetToken, password: passwords.password });
      navigate('/login', { replace: true, state: { message: 'Password updated. Log in with your new password.' } });
    } catch (err) {
      fail(err);
      // The reset session expired: start over from the code step.
      if (err.response?.data?.code === 'RESET_EXPIRED') {
        setResetToken('');
        setCode('');
        setStep(1);
      }
      setBusy(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  return (
    <>
      <h1 className="h3 fw-semibold mb-1">Reset your password</h1>
      <p className="text-body-secondary mb-4">
        {step === 0 && "Enter your account's email and we'll send you a 6-digit code."}
        {step === 1 && (
          <>
            Enter the code sent to <span className="fw-semibold text-body text-break">{normalizedEmail}</span>. It
            expires in 10 minutes.
          </>
        )}
        {step === 2 && 'Choose a new password for your account.'}
      </p>

      <StepIndicator step={step} />

      {notice && !error && <Alert variant="success">{notice}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      {step === 0 && (
        <Form noValidate onSubmit={requestCode}>
          <Form.Group className="mb-4" controlId="email">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors({});
              }}
              isInvalid={Boolean(fieldErrors.email)}
            />
            <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
          </Form.Group>
          <SubmitButton busy={busy} busyText="Sending code...">
            Send code
          </SubmitButton>
        </Form>
      )}

      {step === 1 && (
        <>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              verifyCode(code.trim());
            }}
          >
            <OtpInput value={code} onChange={setCode} onComplete={verifyCode} disabled={busy} invalid={Boolean(error)} />
            <div className="mt-4">
              <SubmitButton busy={busy} busyText="Checking..." disabled={code.trim().length !== 6}>
                Continue
              </SubmitButton>
            </div>
          </form>
          <div className="mt-4">
            <ResendCode cooldownUntil={cooldownUntil} onResend={resend} disabled={busy} />
          </div>
          <div className="text-center mt-3">
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                reset();
                setCode('');
                setStep(0);
              }}
            >
              Use a different email
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <Form noValidate onSubmit={savePassword}>
          <PasswordField
            id="password"
            label="New password"
            name="password"
            placeholder="At least 8 characters, with a letter and a number"
            autoComplete="new-password"
            autoFocus
            value={passwords.password}
            onChange={handlePasswordChange}
            error={fieldErrors.password}
          />
          <PasswordField
            id="confirmPassword"
            label="Confirm new password"
            name="confirmPassword"
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            value={passwords.confirmPassword}
            onChange={handlePasswordChange}
            error={fieldErrors.confirmPassword}
          />
          <div className="mt-2">
            <SubmitButton busy={busy} busyText="Saving...">
              Update password
            </SubmitButton>
          </div>
        </Form>
      )}

      <p className="text-center text-body-secondary mt-4 mb-0">
        Remembered it? <Link to="/login">Back to log in</Link>
      </p>
    </>
  );
}
