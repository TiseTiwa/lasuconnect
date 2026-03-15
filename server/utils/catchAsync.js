// ─────────────────────────────────────────────────────────
//  catchAsync — wraps async route handlers to auto-forward
//  errors to Express's global error handler middleware.
//  Usage: router.get('/', catchAsync(async (req, res) => { ... }))
// ─────────────────────────────────────────────────────────
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
