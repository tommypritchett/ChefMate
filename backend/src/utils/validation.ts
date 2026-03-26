import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Validates and parses a numeric value with range checking
 * @param value - The value to parse
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @param fieldName - Name of the field for error messages
 * @returns Parsed number
 * @throws Error if value is invalid
 */
export function validateNumeric(
  value: any,
  min: number,
  max: number,
  fieldName: string = 'value'
): number {
  const num = parseFloat(value);

  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (!isFinite(num)) {
    throw new Error(`${fieldName} must be a finite number`);
  }

  if (num < min || num > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }

  return num;
}

/**
 * Validates an optional numeric value
 * Returns null if value is null/undefined, otherwise validates it
 */
export function validateOptionalNumeric(
  value: any,
  min: number,
  max: number,
  fieldName: string = 'value'
): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return validateNumeric(value, min, max, fieldName);
}

export const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .optional(),
];

export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
];

export const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
];

export const validateResetPassword = [
  body('token')
    .isLength({ min: 1 })
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
];

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  
  next();
};