import { useEffect, useState } from 'react';
import api from '../api/axios';
import { getErrorMessage } from '../utils/errors';

/**
 * Fetches a paginated list endpoint and refetches whenever `params` change.
 * Results are stored with the request key, so `loading` is derived instead of
 * being toggled inside the effect. Call `reload()` after a change.
 */
export default function useApiList(endpoint, params) {
  const [refresh, setRefresh] = useState(0);
  // Drop empty filters so they don't appear in the request at all.
  const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));
  const key = JSON.stringify({ endpoint, cleanParams, refresh });
  const [state, setState] = useState({ key: null, items: [], pagination: null, error: '' });

  useEffect(() => {
    let active = true;
    const { endpoint: url, cleanParams: query } = JSON.parse(key);
    api
      .get(url, { params: query })
      .then(({ data }) => active && setState({ key, items: data.items, pagination: data.pagination, error: '' }))
      .catch((err) => active && setState({ key, items: [], pagination: null, error: getErrorMessage(err) }));
    return () => {
      active = false;
    };
  }, [key]);

  return {
    items: state.items,
    pagination: state.pagination,
    error: state.error,
    loading: state.key !== key,
    reload: () => setRefresh((n) => n + 1),
  };
}
