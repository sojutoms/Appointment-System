import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import IconBadge from '../components/IconBadge';
import OtpInput from '../components/OtpInput';
import PasswordField from '../components/PasswordField';
import ResendCode from '../components/ResendCode';
import SubmitButton from '../components/SubmitButton';
import useAuth from '../hooks/useAuth';
import { getErrorMessage } from '../utils/errors';
import { validateEmail } from '../utils/validation';

// Two steps: password, then the 6-digit code emailed to the admin.
// The challenge token from step 1 lives only in component state, never in storage.
export default function Login() {
  const { startLogin, verifyCode, resendCode, signOutReason } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Keep the filters (?status=...&page=...) of the page the admin was on.
  const from = location.state?.from;
  const redirectTo = from?.pathname ? `${from.pathname}${from.search ?? ''}` : '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [challenge, setChallenge] = useState(null); // { token, emailHint }
  const [code, setCode] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setError('');
    const nextErrors = {};
    const emailError = validateEmail(form.email);
    if (emailError) nextErrors.email = emailError;
    if (!form.password) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      const data = await startLogin(form.email.trim().toLowerCase(), form.password);
      if (data.token) {
        navigate(redirectTo, { replace: true });
        return;
      }
      setChallenge({ token: data.challengeToken, emailHint: data.emailHint });
      setCooldownUntil(Date.now() + (data.resendAvailableIn ?? 60) * 1000);
      setNotice(data.reused ? 'We already sent you a code a moment ago. Enter it below.' : '');
      // The password has done its job; don't keep it around.
      setForm((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (otp) => {
    if (busy) return;
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter all 6 digits of the code.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await verifyCode(challenge.token, otp);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setCode('');
      // The 10-minute sign-in window ran out: start again from the password.
      if (err.response?.data?.code === 'CHALLENGE_EXPIRED') setChallenge(null);
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      const data = await resendCode(challenge.token);
      setCooldownUntil(Date.now() + data.resendAvailableIn * 1000);
      setCode('');
      setNotice('A new code is on its way. Earlier codes no longer work.');
    } catch (err) {
      const retryAfter = err.response?.data?.retryAfter;
      if (retryAfter) setCooldownUntil(Date.now() + retryAfter * 1000);
      if (err.response?.data?.code === 'CHALLENGE_EXPIRED') setChallenge(null);
      setError(getErrorMessage(err));
    }
  };

  if (challenge) {
    return (
      <>
        <IconBadge icon={MarkEmailReadOutlinedIcon} size={52} sx={{ mb: 2 }} />
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          Enter your sign-in code
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          For extra security we sent a 6-digit code to <strong>{challenge.emailHint}</strong>. It expires in 10 minutes.
        </Typography>

        {notice && !error && (
          <Alert severity="info" sx={{ mb: 2 }}>
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
            submitCode(code.trim());
          }}
        >
          <OtpInput value={code} onChange={setCode} onComplete={submitCode} disabled={busy} invalid={Boolean(error)} />
          <SubmitButton busy={busy} busyText="Verifying..." disabled={code.trim().length !== 6} sx={{ mt: 3 }}>
            Sign in
          </SubmitButton>
        </Box>

        <Box sx={{ mt: 3 }}>
          <ResendCode cooldownUntil={cooldownUntil} onResend={resend} disabled={busy} />
        </Box>
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Button
            size="small"
            onClick={() => {
              setChallenge(null);
              setCode('');
              setError('');
            }}
          >
            Use a different account
          </Button>
        </Box>
      </>
    );
  }

  return (
    <>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
        Admin sign in
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Sign in with your administrator account.
      </Typography>

      {signOutReason && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {signOutReason}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" noValidate onSubmit={submitPassword}>
        <Stack spacing={2.5}>
          <TextField
            label="Email"
            type="email"
            slotProps={{ htmlInput: { maxLength: 64 } }}
            name="email"
            autoComplete="username"
            autoFocus
            value={form.email}
            onChange={handleChange}
            error={Boolean(errors.email)}
            helperText={errors.email}
          />
          <PasswordField label="Password" name="password" value={form.password} onChange={handleChange} error={errors.password} />
          <SubmitButton busy={busy} busyText="Checking...">
            Continue
          </SubmitButton>
        </Stack>
      </Box>
    </>
  );
}
