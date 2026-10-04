import { useSearchParams } from 'react-router-dom';

/**
 * List filters stored in the URL (?status=pending&page=2), so they survive a
 * refresh and can be linked to. Any change except `page` resets to page 1.
 * Returns [values, update].
 */
export default function useUrlFilters(defaults) {
  const [params, setParams] = useSearchParams();

  const values = Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, params.get(key) ?? fallback]));
  values.page = Math.max(1, Number(params.get('page')) || 1);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined || value === defaults[key]) next.delete(key);
      else next.set(key, String(value));
    });
    if (!('page' in changes)) next.delete('page');
    if (changes.page === 1) next.delete('page');
    setParams(next, { replace: true });
  };

  return [values, update];
}
