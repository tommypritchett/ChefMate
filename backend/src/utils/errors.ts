/**
 * Custom error classes for better error handling
 */

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Sanitizes error messages to prevent leaking sensitive information
 */
export function sanitizeErrorMessage(error: any): string {
  if (error instanceof AppError) {
    return error.message;
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    return 'An unexpected error occurred. Please try again.';
  }

  return error.message || 'An error occurred';
}

/**
 * Maps error types to HTTP status codes
 */
export function getErrorStatusCode(error: any): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  // Prisma errors
  if (error.code === 'P2002') return 409; // Unique constraint
  if (error.code === 'P2025') return 404; // Not found
  if (error.code === 'P2003') return 400; // Foreign key constraint

  return 500;
}
