// ─────────────────────────────────────────────────────────
//  apiResponse — Standardizes all API JSON responses.
//  Every endpoint should use these helpers for consistency.
//
//  Success shape: { success: true, message, data, meta }
//  Error shape:   { success: false, message, errors }
// ─────────────────────────────────────────────────────────

const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null, meta = null }) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta; // for pagination info
  return res.status(statusCode).json(response);
};

const sendError = (res, { statusCode = 500, message = 'Something went wrong', errors = null }) => {
  const response = { success: false, message };
  if (errors !== null) response.errors = errors;
  return res.status(statusCode).json(response);
};

module.exports = { sendSuccess, sendError };
