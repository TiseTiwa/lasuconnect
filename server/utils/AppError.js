// ─────────────────────────────────────────────────────────
//  AppError — Custom error class for operational errors.
//  Extends native Error with an HTTP statusCode and
//  an isOperational flag so the global handler knows
//  whether to send a user-friendly message or a generic one.
//
//  Usage:  throw new AppError('User not found', 404);
// ─────────────────────────────────────────────────────────
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Capture stack trace excluding this constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
