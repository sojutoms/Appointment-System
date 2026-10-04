import api from './axios';

// The API returns at most 50 items per request. This loads every page of a
// list endpoint (up to 1,000 items) for dropdowns and short lists that must be
// complete. Resolves to the items array.
export async function fetchAll(url, params = {}, maxPages = 20) {
  const items = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const { data } = await api.get(url, { params: { ...params, page, limit: 50 } });
    items.push(...data.items);
    if (page >= (data.pagination?.totalPages ?? 1)) break;
  }
  return items;
}
