import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import useCountdown, { formatSeconds } from '../hooks/useCountdown';

// "Resend code" link that stays locked while the cooldown runs.
// `onResend` must return a promise; the parent handles success and errors.
export default function ResendCode({ cooldownUntil, onResend, disabled }) {
  const secondsLeft = useCountdown(cooldownUntil);
  const [sending, setSending] = useState(false);

  const handleClick = async () => {
    setSending(true);
    try {
      await onResend();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="text-center small text-body-secondary">
      Didn&apos;t get the code?{' '}
      {secondsLeft > 0 ? (
        <span aria-live="polite">
          Resend in <span className="fw-semibold tabular-nums">{formatSeconds(secondsLeft)}</span>
        </span>
      ) : (
        <Button variant="link" size="sm" className="p-0 align-baseline" onClick={handleClick} disabled={sending || disabled}>
          {sending ? (
            <>
              <Spinner size="sm" className="me-1" />
              Sending...
            </>
          ) : (
            'Resend code'
          )}
        </Button>
      )}
      <div className="mt-1">Check your spam folder too.</div>
    </div>
  );
}
