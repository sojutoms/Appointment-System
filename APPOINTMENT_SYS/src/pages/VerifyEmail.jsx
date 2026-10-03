import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import api from '../api/axios';
import OtpInput from '../components/OtpInput';
import ResendCode from '../components/ResendCode';
import useAuth from '../hooks/useAuth';
import { getErrorMessage } from '../utils/errors';
import { clearPendingEmail, getCooldownUntil, getPendingEmail, startCooldown } from '../utils/otpSession';

const PURPOSE = 'verify-email';

export default function VerifyEmail() {
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email] = useState(getPendingEmail);

  const [code, setCode] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(() => (email ? getCooldownUntil(PURPOSE, email) : 0));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [submitting, setSubmitting] = useState(false);

  // Arrived here without signing up first (e.g. typed the URL).
  if (!email) return <Navigate to="/register" replace />;

  const submit = async (otp) => {
    if (submitting) return;
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter all 6 digits of the code.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await verifyEmail(email, otp);
      clearPendingEmail();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'ALREADY_VERIFIED') {
        clearPendingEmail();
        navigate('/login', { replace: true, state: { message: 'Your email is already verified. Please log in.' } });
        return;
      }
      setError(getErrorMessage(err));
      setCode('');
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setError('');
    setNotice('');
    try {
      const { data } = await api.post('/auth/resend-otp', { email, purpose: PURPOSE });
      setCooldownUntil(startCooldown(PURPOSE, email, data.resendAvailableIn));
      setCode('');
      setNotice('A new code is on its way. Earlier codes no longer work.');
    } catch (err) {
      const retryAfter = err.response?.data?.retryAfter;
      if (retryAfter) setCooldownUntil(startCooldown(PURPOSE, email, retryAfter));
      setError(getErrorMessage(err));
    }
  };

  return (
    <>
      <div className="otp-hero-icon mb-3">
        <i className="bi bi-envelope-check" />
      </div>
      <h1 className="h3 fw-semibold mb-1">Check your email</h1>
      <p className="text-body-secondary mb-4">
        We sent a 6-digit code to <span className="fw-semibold text-body text-break">{email}</span>. It expires in 10
        minutes.
      </p>

      {notice && (
        <Alert variant="success" onClose={() => setNotice('')} dismissible>
          {notice}
        </Alert>
      )}
      {error && <Alert variant="danger">{error}</Alert>}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit(code.trim());
        }}
      >
        <OtpInput value={code} onChange={setCode} onComplete={submit} disabled={submitting} invalid={Boolean(error)} />

        <Button type="submit" className="w-100 mt-4" size="lg" disabled={submitting || code.trim().length !== 6}>
          {submitting ? (
            <>
              <Spinner size="sm" className="me-2" />
              Verifying...
            </>
          ) : (
            'Verify email'
          )}
        </Button>
      </form>

      <div className="mt-4">
        <ResendCode cooldownUntil={cooldownUntil} onResend={resend} disabled={submitting} />
      </div>

      <p className="text-center text-body-secondary small mt-4 mb-0">
        Wrong email?{' '}
        <Link
          to="/register"
          onClick={() => {
            clearPendingEmail();
          }}
        >
          Sign up again
        </Link>
      </p>
    </>
  );
}
