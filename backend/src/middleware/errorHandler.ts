import { Request, Response, NextFunction } from 'express';
import { AppError, sanitizeErrorMessage, getErrorStatusCode } from '../utils/errors';

/**
 * Global error handling middleware
 * Should be added last in the middleware chain
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  const statusCode = getErrorStatusCode(error);
  const message = sanitizeErrorMessage(error);

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error,
    }),
  });
}

/**
 * 404 handler for unknown routes
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
}
