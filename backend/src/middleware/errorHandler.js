import { logger } from '../utils/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID format for ${err.path}`;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }

  if (statusCode >= 500) logger.error(err.stack || err.message);
  res.status(statusCode).json({
    error: message,
    details: statusCode < 500 ? err.details || null : null
  });
}
