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
    const { goalType, targetValue, unit, targetDate, startingWeight, startWeightDate } = req.body;
    if (!goalType || targetValue == null) {
      return res.status(400).json({ error: 'goalType and targetValue are required' });
    }

    // Upsert: deactivate any existing goal of this type, then create new
    await prisma.healthGoal.updateMany({
      where: { userId: req.user!.userId, goalType, isActive: true },
      data: { isActive: false },
    });

    const goalData: any = {
      userId: req.user!.userId,
      goalType,
      targetValue: parseFloat(targetValue),
      unit: unit || null,
      targetDate: targetDate ? new Date(targetDate) : null,
    };

    // Weight goal — store starting weight info
    if (goalType === 'weight' && startingWeight != null) {
      goalData.startingWeight = parseFloat(startingWeight);
      goalData.startWeightDate = startWeightDate ? new Date(startWeightDate) : new Date();
      goalData.currentValue = parseFloat(startingWeight);
    }

    const goal = await prisma.healthGoal.create({ data: goalData });

    // Auto-create first weight log entry
    if (goalType === 'weight' && startingWeight != null) {
      const logDate = goalData.startWeightDate || new Date();
      logDate.setUTCHours(0, 0, 0, 0);
      await prisma.weightLog.upsert({
        where: { userId_logDate: { userId: req.user!.userId, logDate } },
        update: { weight: parseFloat(startingWeight), unit: unit || 'lbs' },
        create: {
          userId: req.user!.userId,
          weight: parseFloat(startingWeight),
          unit: unit || 'lbs',
          logDate,
          notes: 'Starting weight',
        },
      });
    }

    res.status(201).json({ goal });
  } catch (error) {
    console.error('Create health goal error:', error);
    res.status(500).json({ error: 'Failed to create health goal' });
  }
});

// ─── Weight Log Endpoints (must be before /:id routes) ────────────────────

// POST /api/health-goals/weight-log — upsert weight entry
router.post('/weight-log', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { weight, unit, logDate, notes } = req.body;
    if (weight == null || !logDate) {
      return res.status(400).json({ error: 'weight and logDate are required' });
    }

    // Normalize to midnight UTC
    const dateObj = new Date(logDate);
    dateObj.setUTCHours(0, 0, 0, 0);

    const log = await prisma.weightLog.upsert({
      where: { userId_logDate: { userId: req.user!.userId, logDate: dateObj } },
      update: { weight: parseFloat(weight), unit: unit || 'lbs', notes: notes || null },
      create: {
        userId: req.user!.userId,
        weight: parseFloat(weight),
        unit: unit || 'lbs',
        logDate: dateObj,
        notes: notes || null,
      },
    });

    // Auto-update weight goal's currentValue to latest weight
    const latestLog = await prisma.weightLog.findFirst({
      where: { userId: req.user!.userId },
      orderBy: { logDate: 'desc' },
    });
    if (latestLog) {
      await prisma.healthGoal.updateMany({
        where: { userId: req.user!.userId, goalType: 'weight', isActive: true },
        data: { currentValue: latestLog.weight },
      });
    }

    res.json({ log });
  } catch (error) {
    console.error('Log weight error:', error);
    res.status(500).json({ error: 'Failed to log weight' });
  }
});

// GET /api/health-goals/weight-logs?days=90 — weight history
router.get('/weight-logs', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const days = parseInt(req.query.days as string) || 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await prisma.weightLog.findMany({
      where: { userId: req.user!.userId, logDate: { gte: since } },
      orderBy: { logDate: 'asc' },
    });

    // Compute stats
    const allLogs = await prisma.weightLog.findMany({
      where: { userId: req.user!.userId },
      orderBy: { logDate: 'asc' },
    });

    const startWeight = allLogs.length > 0 ? allLogs[0].weight : null;
    const currentWeight = allLogs.length > 0 ? allLogs[allLogs.length - 1].weight : null;
    const weights = allLogs.map(l => l.weight);
    const lowest = weights.length > 0 ? Math.min(...weights) : null;
    const highest = weights.length > 0 ? Math.max(...weights) : null;
    const totalChange = startWeight != null && currentWeight != null ? currentWeight - startWeight : null;

    // Streak: consecutive days with logs from today backwards
    let streak = 0;
    if (allLogs.length > 0) {
      const logDates = new Set(allLogs.map(l => l.logDate.toISOString().split('T')[0]));
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      while (logDates.has(d.toISOString().split('T')[0])) {
        streak++;
        d.setDate(d.getDate() - 1);
      }
    }

    res.json({
      logs,
      stats: { startWeight, currentWeight, lowest, highest, totalChange, streak },
    });
  } catch (error) {
    console.error('Get weight logs error:', error);
    res.status(500).json({ error: 'Failed to fetch weight logs' });
  }
});

// DELETE /api/health-goals/weight-log/:id
router.delete('/weight-log/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const log = await prisma.weightLog.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!log) return res.status(404).json({ error: 'Weight log not found' });

    await prisma.weightLog.delete({ where: { id: req.params.id } });

    // Update weight goal currentValue to latest remaining
    const latestLog2 = await prisma.weightLog.findFirst({
      where: { userId: req.user!.userId },
      orderBy: { logDate: 'desc' },
    });
    if (latestLog2) {
      await prisma.healthGoal.updateMany({
        where: { userId: req.user!.userId, goalType: 'weight', isActive: true },
        data: { currentValue: latestLog2.weight },
      });
    }

    res.json({ message: 'Weight log deleted' });
  } catch (error) {
    console.error('Delete weight log error:', error);
    res.status(500).json({ error: 'Failed to delete weight log' });
  }
});

// GET /api/health-goals/calendar-data?month=2026-02 — calendar nutrition data
router.get('/calendar-data', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const monthStr = req.query.month as string; // YYYY-MM
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
      return res.status(400).json({ error: 'month query param required (YYYY-MM)' });
    }

    const [year, month] = monthStr.split('-').map(Number);
    // Fetch full month + some padding for week view spanning months
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(Date.UTC(year, month, 7)); // into next month

    const [meals, wLogs] = await Promise.all([
      prisma.mealLog.findMany({
        where: {
          userId: req.user!.userId,
          mealDate: { gte: startDate, lte: endDate },
        },
      }),
      prisma.weightLog.findMany({
        where: {
          userId: req.user!.userId,
          logDate: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const days: Record<string, { calories: number; protein: number; carbs: number; fat: number; hasWeightLog: boolean; weight?: number }> = {};

    for (const meal of meals) {
      const key = meal.mealDate.toISOString().split('T')[0];
      if (!days[key]) days[key] = { calories: 0, protein: 0, carbs: 0, fat: 0, hasWeightLog: false };
      days[key].calories += meal.calories || 0;
      days[key].protein += meal.proteinGrams || 0;
      days[key].carbs += meal.carbsGrams || 0;
      days[key].fat += meal.fatGrams || 0;
    }

    for (const wl of wLogs) {
      const key = wl.logDate.toISOString().split('T')[0];
      if (!days[key]) days[key] = { calories: 0, protein: 0, carbs: 0, fat: 0, hasWeightLog: false };
      days[key].hasWeightLog = true;
      days[key].weight = wl.weight;
    }

    res.json({ days });
  } catch (error) {
    console.error('Get calendar data error:', error);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
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

// GET /api/health-goals/score-recipes — score recipes against active goals
router.get('/score-recipes', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const goals = await prisma.healthGoal.findMany({
      where: { userId: req.user!.userId, isActive: true },
    });

    if (goals.length === 0) {
      return res.json({ recipes: [], message: 'Set up health goals first to get personalized recipe scoring.' });
    }

    const recipes = await prisma.recipe.findMany({
      where: { isPublished: true },
      take: 50,
      orderBy: { averageRating: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        nutrition: true,
        dietaryTags: true,
        difficulty: true,
        prepTimeMinutes: true,
        cookTimeMinutes: true,
        servings: true,
      },
    });

    // Score each recipe against goals
    const scored = recipes.map(recipe => {
      const nutrition = recipe.nutrition ? JSON.parse(recipe.nutrition) : {};
      const tags: string[] = recipe.dietaryTags ? JSON.parse(recipe.dietaryTags) : [];
      let score = 0;
      const reasons: string[] = [];

      for (const goal of goals) {
        const { goalType, targetValue } = goal;

        switch (goalType) {
          case 'calories': {
            const cal = nutrition.calories || 0;
            if (cal <= targetValue) {
              score += 3;
              reasons.push(`${cal} cal (under ${targetValue} target)`);
            } else {
              score -= 1;
            }
            break;
          }
          case 'protein': {
            const p = nutrition.protein || 0;
            if (p >= targetValue) {
              score += 3;
              reasons.push(`${p}g protein (meets ${targetValue}g goal)`);
            } else if (p >= targetValue * 0.7) {
              score += 1;
            }
            break;
          }
          case 'carbs': {
            const c = nutrition.carbs || 0;
            if (c <= targetValue) {
              score += 2;
              reasons.push(`${c}g carbs (under ${targetValue}g limit)`);
            } else {
              score -= 1;
            }
            break;
          }
          case 'fat': {
            const f = nutrition.fat || 0;
            if (f <= targetValue) {
              score += 2;
              reasons.push(`${f}g fat (under ${targetValue}g limit)`);
            } else {
              score -= 1;
            }
            break;
          }
          // Diet-specific goals score by dietary tags
          case 'keto': {
            const c2 = nutrition.carbs || 0;
            const f2 = nutrition.fat || 0;
            if (c2 < 20 && f2 > 20) { score += 5; reasons.push('Keto-friendly'); }
            if (tags.includes('keto') || tags.includes('low-carb')) { score += 3; reasons.push('Tagged keto'); }
            break;
          }
          case 'vegetarian': {
            if (tags.includes('vegetarian') || tags.includes('vegan')) { score += 5; reasons.push('Vegetarian'); }
            break;
          }
          case 'vegan': {
            if (tags.includes('vegan')) { score += 5; reasons.push('Vegan'); }
            break;
          }
          case 'high-protein': {
            const p2 = nutrition.protein || 0;
            if (p2 >= 30) { score += 4; reasons.push(`${p2}g protein (high)`); }
            else if (p2 >= 20) { score += 2; }
            break;
          }
          case 'low-carb': {
            const c3 = nutrition.carbs || 0;
            if (c3 < 30) { score += 4; reasons.push(`${c3}g carbs (low)`); }
            else if (c3 < 50) { score += 2; }
            break;
          }
          case 'gluten-free': {
            if (tags.includes('gluten-free')) { score += 5; reasons.push('Gluten-free'); }
            break;
          }
          case 'dairy-free': {
            if (tags.includes('dairy-free')) { score += 5; reasons.push('Dairy-free'); }
            break;
          }
        }
      }

      return {
        id: recipe.id,
        title: recipe.title,
        slug: recipe.slug,
        category: recipe.category,
        nutrition,
        dietaryTags: tags,
        difficulty: recipe.difficulty,
        totalTime: (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0),
        score,
        reasons,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    res.json({
      recipes: scored.slice(0, 20),
      goalTypes: goals.map(g => g.goalType),
    });
  } catch (error) {
    console.error('Score recipes error:', error);
    res.status(500).json({ error: 'Failed to score recipes' });
  }
});

export default router;
