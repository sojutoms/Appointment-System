// Error with an HTTP status code; thrown from controllers and turned into a
// JSON response by the error handler middleware.
// `meta` adds extra fields to the response body, e.g. { code, retryAfter }.
export default class ApiError extends Error {
  constructor(statusCode, message, details, meta) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.meta = meta;
  }
}
