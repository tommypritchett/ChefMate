import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  handleValidationErrors
} from '../utils/validation';

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to generate JWT token
const generateToken = (userId: string, email: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Helper function to exclude password from user object
const excludePassword = (user: any) => {
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// POST /api/auth/register
router.post('/register', validateRegister, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
      }
    });

    // Generate token
    const token = generateToken(user.id, user.email);

    // Return user (without password) and token
    res.status(201).json({
      user: excludePassword(user),
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', validateLogin, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate token
    const token = generateToken(user.id, user.email);

    // Return user (without password) and token
    res.json({
      user: excludePassword(user),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // For JWT-based auth, logout is handled client-side by removing the token
  // We could implement a token blacklist here if needed
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        _count: {
          select: {
            savedRecipes: true,
            inventoryItems: true,
            shoppingLists: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: excludePassword(user)
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

// PATCH /api/auth/me
router.patch('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { firstName, lastName, preferences, notificationSettings } = req.body;

    const updateData: any = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (preferences !== undefined) updateData.preferences = JSON.stringify(preferences);
    if (notificationSettings !== undefined) updateData.notificationSettings = JSON.stringify(notificationSettings);

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: updateData
    });

    res.json({
      user: excludePassword(user)
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user information' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', validateForgotPassword, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal whether user exists or not
      return res.json({ message: 'If an account with this email exists, you will receive a password reset link.' });
    }

    // TODO: Implement email sending
    // For now, we'll just return success
    // In production, you would:
    // 1. Generate a secure reset token
    // 2. Store it in the database with expiration
    // 3. Send email with reset link
    
    res.json({ message: 'If an account with this email exists, you will receive a password reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', validateResetPassword, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    // TODO: Implement token validation and password reset
    // For now, return not implemented
    
    res.status(501).json({ error: 'Password reset not yet implemented' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;