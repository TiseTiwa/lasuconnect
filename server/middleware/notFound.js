const AppError = require('../utils/AppError');

// Catches all requests that don't match any defined route
const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

module.exports = notFound;
