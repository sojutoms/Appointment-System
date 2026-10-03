import { useEffect, useState } from 'react';

// Seconds remaining until the `until` timestamp (ms); updates every second.
export default function useCountdown(until) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    // Sync immediately when `until` changes, then tick each second until done.
    const first = setTimeout(tick, 0);
    if (!until || until <= Date.now()) return () => clearTimeout(first);

    const id = setInterval(() => {
      tick();
      if (Date.now() >= until) clearInterval(id);
    }, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [until]);

  return Math.max(0, Math.ceil(((until ?? 0) - now) / 1000));
}

export function formatSeconds(total) {
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}
