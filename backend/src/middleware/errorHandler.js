import { AppError } from '../utils/errors.js';

/**
 * Global Error Handler Middleware
 * Centralized error handling following DRY principle
 */
export const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    name: err.name,
  });

  // If error is an AppError (operational error), use its status code
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  // Invalid enum / field values (e.g. role not in DB enum — run migrations)
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      error: 'Invalid data for database',
      ...(process.env.NODE_ENV !== 'production' && { details: err.message }),
    });
  }

  // Handle Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'A record with this value already exists',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Record not found',
    });
  }

  if (err.code === 'P2021') {
    return res.status(500).json({
      error: 'Table does not exist. Run: npx prisma migrate deploy',
      code: err.code,
    });
  }

  if (err.code === 'P2014') {
    return res.status(409).json({
      error: 'Relation constraint violation',
      code: err.code,
    });
  }

  // Default to 500 server error
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack,
      details: err.toString(),
      code: err.code,
      meta: err.meta,
    }),
  });
};

/**
 * Async Handler Wrapper
 * Catches async errors and passes them to error handler
 * Eliminates need for try-catch in every controller
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
