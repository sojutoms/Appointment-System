import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

// Runs after express-validator chains and rejects the request with every
// field error, e.g. { errors: [{ field: 'email', message: '...' }] }.
export default function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((err) => ({ field: err.path, message: err.msg }));
  throw new ApiError(400, errors[0].message, errors);
}
