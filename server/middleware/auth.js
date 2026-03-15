const { verifyAccessToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/User');

// ── protect — verify JWT and attach user to req ───────────
const protect = catchAsync(async (req, res, next) => {
  // 1. Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('You are not logged in. Please log in to continue.', 401));
  }

  const token = authHeader.split(' ')[1];

  // 2. Verify token
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid token. Please log in again.', 401));
  }

  // 3. Check user still exists
  const user = await User.findById(decoded.id).select('-passwordHash');
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // 4. Check account is active
  if (!user.isActive) {
    return next(new AppError('Your account has been suspended. Please contact support.', 403));
  }

  // 5. Attach user to request
  req.user = user;
  next();
});

// ── restrictTo — role-based access control ────────────────
// Usage: router.delete('/:id', protect, restrictTo('admin', 'super_admin'), deletePost)
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};

// ── optionalAuth — attach user if token present, but don't block ──
// Used for public routes that show extra data if logged in
const optionalAuth = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (user && user.isActive) req.user = user;
  } catch (_) {
    // Silently ignore invalid tokens for optional auth
  }
  next();
});

module.exports = { protect, restrictTo, optionalAuth };
