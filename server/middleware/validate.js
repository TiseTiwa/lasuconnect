const { validationResult } = require('express-validator');
const { sendError } = require('../utils/apiResponse');

// Runs after express-validator rules — returns 422 if any field fails
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return sendError(res, {
      statusCode: 422,
      message: messages[0], // Show the first validation error
      errors: messages,
    });
  }
  next();
};

module.exports = validate;
