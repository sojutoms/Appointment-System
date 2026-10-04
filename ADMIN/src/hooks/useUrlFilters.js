import { useSearchParams } from 'react-router-dom';

// Validators for `allowed` entries that aren't a fixed list of values.
export const FILTER = {
  date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime()),
  id: (v) => /^[a-f\d]{24}$/i.test(v),
  search: (v) => v.length <= 50,
};

const MAX_PAGE = 10000;

/**
 * List filters stored in the URL (?status=pending&page=2), so they survive a
 * refresh and can be linked to. Any change except `page` resets to page 1.
 * `allowed` maps a key to a list of valid values or a validator function;
 * anything else in the URL (old or hand-edited links) falls back to the default.
 * Returns [values, update].
 */
export default function useUrlFilters(defaults, allowed = {}) {
  const [params, setParams] = useSearchParams();

  const isValid = (key, value) => {
    const rule = allowed[key];
    if (!rule || value === '') return true;
    return Array.isArray(rule) ? rule.includes(value) : rule(value);
  };

  const values = Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => {
      const value = params.get(key);
      return [key, value !== null && isValid(key, value) ? value : fallback];
    })
  );
  values.page = Math.min(MAX_PAGE, Math.max(1, Math.floor(Number(params.get('page'))) || 1));

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
