// Removes keys starting with "$" or containing "." from the request body so
// clients cannot smuggle MongoDB operators (e.g. {"$gt": ""}) into updates.
// Query strings are already safe: Express 5 parses them without nesting.
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key];
      } else {
        value[key] = clean(value[key]);
      }
    }
  }
  return value;
}

export default function sanitizeBody(req, _res, next) {
  if (req.body) clean(req.body);
  next();
}
