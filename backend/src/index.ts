import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
// @ts-ignore - no types available
import timeout from 'express-timeout-handler';
import prisma from './lib/prisma';

import authRoutes from './routes/auth';
import recipeRoutes from './routes/recipes';
import aiRoutes from './routes/ai';
import inventoryRoutes from './routes/inventory';
import favoritesRoutes from './routes/favorites';
import shoppingRoutes from './routes/shopping';
import nutritionRoutes from './routes/nutrition';
import conversationRoutes from './routes/conversations';
import mealPlanRoutes from './routes/mealplans';
import healthGoalRoutes from './routes/health-goals';
import groceryRoutes from './routes/grocery';
import krogerRoutes from './routes/kroger';
import { generalLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:8081',
    'http://localhost:19000',
    'http://localhost:19006',
    process.env.APP_URL || 'http://localhost:8081'
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout middleware (30s for normal requests, 90s for AI)
app.use(timeout.handler({
  timeout: 30000, // 30 seconds default
  onTimeout: (req: Request, res: Response) => {
    res.status(408).json({
      error: 'Request timeout',
      message: 'The server took too long to respond. Please try again.'
    });
  },
  disable: ['write', 'setHeaders', 'send', 'json', 'end']
}));

// Longer timeout for AI endpoints
app.use('/api/ai', timeout.handler({
  timeout: 90000, // 90 seconds for AI
  onTimeout: (req: Request, res: Response) => {
    res.status(408).json({
      error: 'AI request timeout',
      message: 'The AI processing took too long. Please try again with a simpler request.'
    });
  },
  disable: ['write', 'setHeaders', 'send', 'json', 'end']
}));

// Apply general rate limiting to all routes
app.use('/api/', generalLimiter);

// Simple CSRF protection using custom header verification
// For state-changing requests (POST, PATCH, DELETE, PUT), verify X-Requested-With header
app.use((req, res, next) => {
  const method = req.method.toUpperCase();

  // Allow GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // Skip CSRF check for auth endpoints (login/register don't have tokens yet)
  if (req.path.startsWith('/api/auth/login') ||
      req.path.startsWith('/api/auth/register') ||
      req.path.startsWith('/api/auth/refresh') ||
      req.path.startsWith('/api/auth/forgot-password') ||
      req.path.startsWith('/api/auth/reset-password')) {
    return next();
  }

  // For all other state-changing requests, verify custom header
  const requestedWith = req.headers['x-requested-with'];
  if (requestedWith !== 'XMLHttpRequest') {
    return res.status(403).json({
      error: 'CSRF validation failed. Missing or invalid X-Requested-With header.'
    });
  }

  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/shopping-lists', shoppingRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/meal-plans', mealPlanRoutes);
app.use('/api/health-goals', healthGoalRoutes);
app.use('/api/grocery', groceryRoutes);
app.use('/api/kroger', krogerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // JSON parse errors (malformed body)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  // Prisma unique constraint violations
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`🚀 ChefMate API server running on http://localhost:${port}`);
});