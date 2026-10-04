import { useCallback, useEffect, useRef, useState } from 'react';

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];

/**
 * Signs the admin out after `timeoutMs` without any mouse/keyboard/touch activity.
 * During the last `warnMs` it reports `secondsLeft` so the UI can show a warning.
 * Returns { warning, secondsLeft, stayActive }.
 */
export default function useIdleTimeout({ timeoutMs, warnMs = 60_000, onTimeout, enabled = true }) {
  const lastActive = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(null);

  const stayActive = useCallback(() => {
    lastActive.current = Date.now();
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    lastActive.current = Date.now();

    // Activity only counts while no warning is showing; then the admin must click "Stay signed in".
    let warning = false;
    const onActivity = () => {
      if (!warning) lastActive.current = Date.now();
    };
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const id = setInterval(() => {
      const remaining = timeoutMs - (Date.now() - lastActive.current);
      if (remaining <= 0) {
        clearInterval(id);
        onTimeout();
      } else if (remaining <= warnMs) {
        warning = true;
        setSecondsLeft(Math.ceil(remaining / 1000));
      } else {
        warning = false;
        setSecondsLeft(null);
      }
    }, 1000);

    return () => {
      clearInterval(id);
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [enabled, timeoutMs, warnMs, onTimeout]);

  return { warning: secondsLeft !== null, secondsLeft, stayActive };
}
