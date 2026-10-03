// Helpers shared by list endpoints for search and pagination.

const MAX_LIMIT = 50;

export function getPagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || 10));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginated(items, total, { page, limit }) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

// Escapes user input so it is matched literally inside a RegExp
// (prevents ReDoS and regex injection through the search box).
export function searchRegex(text) {
  const trimmed = String(text ?? '').trim().slice(0, 100);
  if (!trimmed) return null;
  return new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}
