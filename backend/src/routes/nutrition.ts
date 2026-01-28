import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/nutrition/daily/:date
router.get('/daily/:date', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);
    
    const meals = await prisma.mealLog.findMany({
      where: {
        userId: req.user!.userId,
        mealDate: {
          gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
          lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)
        }
      },
      include: {
        recipe: {
          select: {
            id: true,
            title: true,
            imageUrl: true
          }
        }
      },
      orderBy: { mealTime: 'asc' }
    });
    
    // Calculate daily totals
    const totals = meals.reduce((acc, meal) => {
      acc.calories += meal.calories || 0;
      acc.protein += meal.proteinGrams || 0;
      acc.carbs += meal.carbsGrams || 0;
      acc.fat += meal.fatGrams || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    res.json({ meals, totals });
  } catch (error) {
    console.error('Get daily nutrition error:', error);
    res.status(500).json({ error: 'Failed to fetch nutrition data' });
  }
});

// POST /api/nutrition/log-meal
router.post('/log-meal', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { mealType, mealDate, recipeId, mealName, calories, protein, carbs, fat } = req.body;
    
    const mealLog = await prisma.mealLog.create({
      data: {
        userId: req.user!.userId,
        mealType,
        mealDate: new Date(mealDate),
        recipeId,
        mealName,
        calories: calories ? parseInt(calories) : null,
        proteinGrams: protein ? parseFloat(protein) : null,
        carbsGrams: carbs ? parseFloat(carbs) : null,
        fatGrams: fat ? parseFloat(fat) : null
      }
    });
    
    res.status(201).json({ mealLog });
  } catch (error) {
    console.error('Log meal error:', error);
    res.status(500).json({ error: 'Failed to log meal' });
  }
});

export default router;