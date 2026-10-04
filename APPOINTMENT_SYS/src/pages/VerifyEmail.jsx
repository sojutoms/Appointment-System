import { useState } from 'react';
import { Navigate, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import api from '../api/axios';
import IconBadge from '../components/IconBadge';
import OtpInput from '../components/OtpInput';
import ResendCode from '../components/ResendCode';
import SubmitButton from '../components/SubmitButton';
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
      if (err.response?.data?.code === 'ALREADY_VERIFIED') {
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
      <IconBadge icon={MarkEmailReadOutlinedIcon} size={52} sx={{ mb: 2 }} />
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
        Check your email
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        We sent a 6-digit code to{' '}
        <Box component="span" sx={{ fontWeight: 600, color: 'text.primary', wordBreak: 'break-all' }}>
          {email}
        </Box>
        . It expires in 10 minutes.
      </Typography>

      {notice && (
        <Alert severity="success" onClose={() => setNotice('')} sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit(code.trim());
        }}
      >
        <OtpInput value={code} onChange={setCode} onComplete={submit} disabled={submitting} invalid={Boolean(error)} />
        <SubmitButton busy={submitting} busyText="Verifying..." disabled={code.trim().length !== 6} sx={{ mt: 3 }}>
          Verify email
        </SubmitButton>
      </Box>

      <Box sx={{ mt: 3 }}>
        <ResendCode cooldownUntil={cooldownUntil} onResend={resend} disabled={submitting} />
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 3 }}>
        Wrong email?{' '}
        <Link component={RouterLink} to="/register" onClick={clearPendingEmail}>
          Sign up again
        </Link>
      </Typography>
    </>
  );
}
