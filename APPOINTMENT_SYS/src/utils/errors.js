// Turns an Axios error into a message that is safe to show to the user.
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (error?.request && !error.response) {
    return 'Cannot reach the server. Check your connection or try again in a moment.';
  }
  return fallback;
}

// Maps the API's validation errors ([{ field, message }]) to { field: message }.
export function getFieldErrors(error) {
  const list = error?.response?.data?.errors;
  if (!Array.isArray(list)) return {};
  return list.reduce((acc, { field, message }) => {
    if (field && !acc[field]) acc[field] = message;
    return acc;
  }, {});
}
