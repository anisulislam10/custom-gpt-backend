const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const errorConverter = (err, req, res, next) => {
  let error = err;
  
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 
                      error.status || 
                      httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || httpStatus[statusCode];
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const { statusCode = 500, message } = err;
  
  // Ensure statusCode is a valid number
  const validStatusCode = typeof statusCode === 'number' ? 
                         statusCode : 
                         httpStatus.INTERNAL_SERVER_ERROR;

  res.locals.errorMessage = message;

  const response = {
    code: validStatusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(validStatusCode).json(response);
};

module.exports = {
  errorConverter,
  errorHandler,
};