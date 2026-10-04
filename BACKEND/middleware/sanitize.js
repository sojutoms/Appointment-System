import ApiError from '../utils/ApiError.js';

// Body fields that are meant to be lists of plain values. Every other field
// must be a single plain value (string, number, boolean or null).
const ARRAY_FIELDS = new Set(['services', 'workingDays']);

const isPlain = (v) => v === null || ['string', 'number', 'boolean'].includes(typeof v);

// Rejects arrays/objects where a single value is expected. Without this, a
// field such as {"email": ["victim@x.com", "me@x.com"]} passes per-element
// validation and Mongoose turns it into an $in query, matching other accounts.
// Express 5 also turns repeated query keys (?staff=a&staff=b) into arrays.
// It also removes keys starting with "$" or containing "." so operators like
// {"$gt": ""} can never reach a query or update.
export default function sanitizeInput(req, _res, next) {
  const { body, query } = req;

  if (body !== undefined && body !== null) {
    if (typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'Invalid request body.');
    for (const key of Object.keys(body)) {
      const value = body[key];
      if (key.startsWith('$') || key.includes('.')) delete body[key];
      else if (ARRAY_FIELDS.has(key) && Array.isArray(value)) {
        if (!value.every(isPlain)) throw new ApiError(400, `Invalid value for "${key}".`);
      } else if (!isPlain(value)) {
        throw new ApiError(400, `Invalid value for "${key}".`);
      }
    }
  }

  for (const [key, value] of Object.entries(query ?? {})) {
    if (typeof value !== 'string') throw new ApiError(400, `Invalid value for "${key}".`);
  }

  next();
}
