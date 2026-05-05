import express from 'express';
import OpenAI from 'openai';
import prisma from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { parseDateParam, formatDateUTC, getTodayUTC } from '../utils/dateHelpers';

const router = express.Router();

// GET /api/nutrition/daily/:date
router.get('/daily/:date', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { date } = req.params;

    // Parse date to UTC midnight
    const dayStart = parseDateParam(date);
    if (!dayStart) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const meals = await prisma.mealLog.findMany({
      where: {
        userId: req.user!.userId,
        mealDate: {
          gte: dayStart,
          lt: dayEnd,
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

// GET /api/nutrition/search-recipes?q=chicken
router.get('/search-recipes', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const q = (req.query.q as string || '').toLowerCase().trim();
    if (!q || q.length < 2) {
      return res.json({ recipes: [] });
    }

    const recipes = await prisma.recipe.findMany({
      where: {
        isPublished: true,
        nutrition: { not: null },
      },
      select: {
        id: true,
        title: true,
        brand: true,
        description: true,
        nutrition: true,
        servings: true,
      },
      take: 50,
    });

    // SQLite-safe case-insensitive search
    const matches = recipes
      .filter(r => {
        const title = (r.title || '').toLowerCase();
        const brand = (r.brand || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return title.includes(q) || brand.includes(q) || desc.includes(q);
      })
      .slice(0, 5)
      .map(r => {
        let nutrition = null;
        try { nutrition = JSON.parse(r.nutrition!); } catch {}
        return { id: r.id, title: r.title, brand: r.brand, nutrition, servings: r.servings };
      });

    res.json({ recipes: matches });
  } catch (error) {
    console.error('Search recipes error:', error);
    res.status(500).json({ error: 'Failed to search recipes' });
  }
});

// GET /api/nutrition/estimate?q=McChicken
router.get('/estimate', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(501).json({ error: 'AI nutrition estimation requires an OpenAI API key' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a nutrition expert. Estimate nutrition for one serving of the given food. Return ONLY valid JSON with these exact fields: {"mealName": "string", "calories": number, "protein": number, "carbs": number, "fat": number}. Use grams for macros. Be accurate based on common nutritional databases.',
        },
        { role: 'user', content: `Estimate nutrition for one serving of: ${q}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    const result = JSON.parse(content);
    const protein = Math.round(result.protein || 0);
    const carbs = Math.round(result.carbs || 0);
    const fat = Math.round(result.fat || 0);
    // Atwater formula: protein=4cal/g, carbs=4cal/g, fat=9cal/g
    const calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9);
    res.json({
      mealName: result.mealName || q,
      calories: calculatedCalories,
      protein,
      carbs,
      fat,
    });
  } catch (error) {
    console.error('Estimate nutrition error:', error);
    res.status(500).json({ error: 'Failed to estimate nutrition' });
  }
});

// POST /api/nutrition/estimate-ingredients
// Takes an ingredient list and returns per-item macro breakdown + totals
router.post('/estimate-ingredients', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { ingredients } = req.body;
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'ingredients array is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(501).json({ error: 'AI nutrition estimation requires an OpenAI API key' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const ingredientList = ingredients.join(', ');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a nutrition expert. Given a list of ingredients with quantities, estimate the macros for each item AND the total. Return ONLY valid JSON: {"breakdown": [{"item": "string", "calories": number, "protein": number, "carbs": number, "fat": number}], "totals": {"calories": number, "protein": number, "carbs": number, "fat": number}}. Use grams for macros. Round to whole numbers. Be accurate using standard nutritional databases.',
        },
        { role: 'user', content: `Estimate nutrition for these ingredients: ${ingredientList}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    const result = JSON.parse(content);
    // Recalculate totals with Atwater formula for consistency
    const breakdown = (result.breakdown || []).map((item: any) => ({
      item: item.item,
      calories: Math.round((item.protein || 0) * 4 + (item.carbs || 0) * 4 + (item.fat || 0) * 9),
      protein: Math.round(item.protein || 0),
      carbs: Math.round(item.carbs || 0),
      fat: Math.round(item.fat || 0),
    }));
    const totals = breakdown.reduce(
      (acc: any, item: any) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    res.json({ breakdown, totals });
  } catch (error) {
    console.error('Estimate ingredients error:', error);
    res.status(500).json({ error: 'Failed to estimate nutrition from ingredients' });
  }
});

// GET /api/nutrition/recent-meals — last 10 unique logged meals for quick re-log
router.get('/recent-meals', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const meals = await prisma.mealLog.findMany({
      where: {
        userId: req.user!.userId,
        mealName: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 30, // fetch extra to deduplicate
      select: {
        id: true,
        mealType: true,
        mealName: true,
        notes: true,
        calories: true,
        proteinGrams: true,
        carbsGrams: true,
        fatGrams: true,
        createdAt: true,
      },
    });

    // Deduplicate by mealName (case-insensitive), keep most recent
    const seen = new Set<string>();
    const unique = meals.filter(m => {
      const key = (m.mealName || '').toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);

    res.json({ meals: unique });
  } catch (error) {
    console.error('Recent meals error:', error);
    res.status(500).json({ error: 'Failed to fetch recent meals' });
  }
});

// POST /api/nutrition/log-meal
router.post('/log-meal', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { mealType, mealDate, recipeId, mealName, calories, protein, carbs, fat, mealTime, notes } = req.body;

    const mealLog = await prisma.mealLog.create({
      data: {
        userId: req.user!.userId,
        mealType,
        mealDate: new Date(mealDate),
        mealTime: mealTime ? new Date(mealTime) : new Date(),
        recipeId,
        mealName,
        calories: calories ? parseInt(calories) : null,
        proteinGrams: protein ? parseFloat(protein) : null,
        carbsGrams: carbs ? parseFloat(carbs) : null,
        fatGrams: fat ? parseFloat(fat) : null,
        notes: notes || null,
      }
    });
    
    res.status(201).json({ mealLog });
  } catch (error) {
    console.error('Log meal error:', error);
    res.status(500).json({ error: 'Failed to log meal' });
  }
});

// PATCH /api/nutrition/meal/:id
router.patch('/meal/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { mealType, mealName, calories, protein, carbs, fat, mealTime } = req.body;

    // Verify ownership
    const existing = await prisma.mealLog.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    const mealLog = await prisma.mealLog.update({
      where: { id },
      data: {
        ...(mealType !== undefined && { mealType }),
        ...(mealName !== undefined && { mealName }),
        ...(mealTime !== undefined && { mealTime: mealTime ? new Date(mealTime) : null }),
        ...(calories !== undefined && { calories: calories !== null ? parseInt(calories) : null }),
        ...(protein !== undefined && { proteinGrams: protein !== null ? parseFloat(protein) : null }),
        ...(carbs !== undefined && { carbsGrams: carbs !== null ? parseFloat(carbs) : null }),
        ...(fat !== undefined && { fatGrams: fat !== null ? parseFloat(fat) : null }),
      },
    });

    res.json({ mealLog });
  } catch (error) {
    console.error('Update meal error:', error);
    res.status(500).json({ error: 'Failed to update meal' });
  }
});

// DELETE /api/nutrition/meal/:id
router.delete('/meal/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.mealLog.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    await prisma.mealLog.delete({ where: { id } });

    // Un-complete the matching meal plan slot (if any)
    // This keeps the meal plan in sync when user deletes a logged meal
    if (existing.mealDate && existing.mealType) {
      const dateStr = existing.mealDate.toISOString().split('T')[0];
      const dayStart = new Date(dateStr);
      const dayEnd = new Date(dateStr);
      dayEnd.setDate(dayEnd.getDate() + 1);

      // Find completed slot matching this meal log's date, mealType, and recipe/name
      const matchConditions: any[] = [];
      if (existing.recipeId) matchConditions.push({ recipeId: existing.recipeId });
      if (existing.mealName) {
        matchConditions.push({
          recipe: { title: existing.mealName },
        });
        matchConditions.push({ customName: existing.mealName });
      }

      if (matchConditions.length > 0) {
        const matchingSlot = await prisma.mealPlanSlot.findFirst({
          where: {
            isCompleted: true,
            mealType: existing.mealType,
            date: { gte: dayStart, lt: dayEnd },
            mealPlan: { userId: req.user!.userId },
            OR: matchConditions,
          },
        });

        if (matchingSlot) {
          await prisma.mealPlanSlot.update({
            where: { id: matchingSlot.id },
            data: { isCompleted: false, completedAt: null },
          });
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

export default router;