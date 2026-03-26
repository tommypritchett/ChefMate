import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  handleValidationErrors
} from '../utils/validation';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Helper function to generate JWT access token (short-lived)
const generateToken = (userId: string, email: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // Short-lived access token (15 minutes)
  );
};

// Helper function to generate refresh token (long-lived)
const generateRefreshToken = async (userId: string): Promise<string> => {
  // Generate a secure random token
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

  // Token expires in 30 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Revoke any existing active refresh tokens for this user (single device policy)
  // Comment out the next 5 lines if you want multi-device support
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true, revokedAt: new Date() }
  });

  // Store the hashed token in the database
  await prisma.refreshToken.create({
    data: {
      userId,
      token: hashedToken,
      expiresAt
    }
  });

  return refreshToken; // Return unhashed token to send to client
};

// Helper function to exclude password from user object
const excludePassword = (user: any) => {
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// POST /api/auth/register
router.post('/register', authLimiter, validateRegister, handleValidationErrors, async (req: Request, res: Response) => {
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

    // Generate access and refresh tokens
    const token = generateToken(user.id, user.email);
    const refreshToken = await generateRefreshToken(user.id);

    // Return user (without password), access token, and refresh token
    res.status(201).json({
      user: excludePassword(user),
      token,
      refreshToken
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, validateLogin, handleValidationErrors, async (req: Request, res: Response) => {
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

    // Generate access and refresh tokens
    const token = generateToken(user.id, user.email);
    const refreshToken = await generateRefreshToken(user.id);

    // Return user (without password), access token, and refresh token
    res.json({
      user: excludePassword(user),
      token,
      refreshToken
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
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal whether user exists or not
      return res.json({ message: 'If an account with this email exists, you will receive a password reset link.' });
    }

    // Generate a secure reset token (32 bytes = 64 hex chars)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Invalidate any existing unused tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        used: false,
        expiresAt: { gt: new Date() }
      },
      data: { used: true }
    });

    // Store the hashed token in the database
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt
      }
    });

    // In production, send email with reset link
    // For now, log to console for development
    const resetUrl = `${process.env.APP_URL || 'http://localhost:8081'}/reset-password?token=${resetToken}`;
    console.log('='.repeat(80));
    console.log('PASSWORD RESET REQUESTED');
    console.log(`Email: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Token expires at: ${expiresAt.toISOString()}`);
    console.log('='.repeat(80));

    // TODO: Implement email sending service
    // await sendPasswordResetEmail(user.email, resetUrl);

    res.json({ message: 'If an account with this email exists, you will receive a password reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', passwordResetLimiter, validateResetPassword, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find the token in the database
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true }
    });

    // Validate token
    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (resetToken.used) {
      return res.status(400).json({ error: 'This reset token has already been used' });
    }

    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This reset token has expired' });
    }

    // Hash the new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update user's password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: {
          used: true,
          usedAt: new Date()
        }
      })
    ]);

    console.log(`Password successfully reset for user: ${resetToken.user.email}`);

    res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Find the token in the database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: { user: true }
    });

    // Validate token
    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (tokenRecord.revoked) {
      return res.status(401).json({ error: 'Refresh token has been revoked' });
    }

    if (tokenRecord.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token has expired' });
    }

    // Generate new access token
    const newAccessToken = generateToken(tokenRecord.userId, tokenRecord.user.email);

    // Optionally rotate the refresh token (recommended for higher security)
    // Uncomment the next 3 lines to enable refresh token rotation
    // const newRefreshToken = await generateRefreshToken(tokenRecord.userId);
    // await prisma.refreshToken.update({ where: { id: tokenRecord.id }, data: { revoked: true, revokedAt: new Date() } });
    // return res.json({ token: newAccessToken, refreshToken: newRefreshToken });

    res.json({
      token: newAccessToken,
      user: excludePassword(tokenRecord.user)
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Hash and revoke the specific refresh token
      const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

      await prisma.refreshToken.updateMany({
        where: {
          token: hashedToken,
          userId: req.user!.userId,
          revoked: false
        },
        data: {
          revoked: true,
          revokedAt: new Date()
        }
      });
    } else {
      // Revoke all refresh tokens for this user
      await prisma.refreshToken.updateMany({
        where: {
          userId: req.user!.userId,
          revoked: false
        },
        data: {
          revoked: true,
          revokedAt: new Date()
        }
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to log out' });
  }
});

export default router;