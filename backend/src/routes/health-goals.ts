import express from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/health-goals — all goals for user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const goals = await prisma.healthGoal.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ goals });
  } catch (error) {
    console.error('Get health goals error:', error);
    res.status(500).json({ error: 'Failed to fetch health goals' });
  }
});

// POST /api/health-goals — create or update a goal
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { goalType, targetValue, unit, targetDate } = req.body;
    if (!goalType || targetValue == null) {
      return res.status(400).json({ error: 'goalType and targetValue are required' });
    }

    // Upsert: deactivate any existing goal of this type, then create new
    await prisma.healthGoal.updateMany({
      where: { userId: req.user!.userId, goalType, isActive: true },
      data: { isActive: false },
    });

    const goal = await prisma.healthGoal.create({
      data: {
        userId: req.user!.userId,
        goalType,
        targetValue: parseFloat(targetValue),
        unit: unit || null,
        targetDate: targetDate ? new Date(targetDate) : null,
      },
    });

    res.status(201).json({ goal });
  } catch (error) {
    console.error('Create health goal error:', error);
    res.status(500).json({ error: 'Failed to create health goal' });
  }
});

// PATCH /api/health-goals/:id — update a goal
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const goal = await prisma.healthGoal.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const { targetValue, currentValue, isActive, targetDate } = req.body;
    const updated = await prisma.healthGoal.update({
      where: { id: req.params.id },
      data: {
        ...(targetValue != null && { targetValue: parseFloat(targetValue) }),
        ...(currentValue != null && { currentValue: parseFloat(currentValue) }),
        ...(isActive != null && { isActive }),
        ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
      },
    });

    res.json({ goal: updated });
  } catch (error) {
    console.error('Update health goal error:', error);
    res.status(500).json({ error: 'Failed to update health goal' });
  }
});

// DELETE /api/health-goals/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const goal = await prisma.healthGoal.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    await prisma.healthGoal.delete({ where: { id: req.params.id } });
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    console.error('Delete health goal error:', error);
    res.status(500).json({ error: 'Failed to delete health goal' });
  }
});

// GET /api/health-goals/progress — weekly summary vs goals
router.get('/progress', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const goals = await prisma.healthGoal.findMany({
      where: { userId: req.user!.userId, isActive: true },
    });

    // Get last 7 days of meal logs
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const meals = await prisma.mealLog.findMany({
      where: {
        userId: req.user!.userId,
        mealDate: { gte: weekAgo },
      },
      orderBy: { mealDate: 'asc' },
    });

    // Group by date
    const dailyTotals: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    for (const meal of meals) {
      const dateKey = meal.mealDate.toISOString().split('T')[0];
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      }
      dailyTotals[dateKey].calories += meal.calories || 0;
      dailyTotals[dateKey].protein += meal.proteinGrams || 0;
      dailyTotals[dateKey].carbs += meal.carbsGrams || 0;
      dailyTotals[dateKey].fat += meal.fatGrams || 0;
    }

    // Calculate weekly averages
    const days = Object.keys(dailyTotals).length || 1;
    const weeklyAvg = {
      calories: Math.round(Object.values(dailyTotals).reduce((s, d) => s + d.calories, 0) / days),
      protein: Math.round(Object.values(dailyTotals).reduce((s, d) => s + d.protein, 0) / days),
      carbs: Math.round(Object.values(dailyTotals).reduce((s, d) => s + d.carbs, 0) / days),
      fat: Math.round(Object.values(dailyTotals).reduce((s, d) => s + d.fat, 0) / days),
    };

    res.json({ goals, dailyTotals, weeklyAvg, mealCount: meals.length });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

export default router;
