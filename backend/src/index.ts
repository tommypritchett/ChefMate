import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
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
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
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