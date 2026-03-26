import express from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/meal-plans — List user's meal plans
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const plans = await prisma.mealPlan.findMany({
      where: { userId: req.user!.userId },
      orderBy: { startDate: 'desc' },
      include: {
        slots: {
          include: {
            recipe: {
              select: {
                id: true,
                title: true,
                slug: true,
                imageUrl: true,
                nutrition: true,
                prepTimeMinutes: true,
                cookTimeMinutes: true
              }
            }
          },
          orderBy: [{ date: 'asc' }, { mealType: 'asc' }]
        },
        _count: { select: { slots: true } }
      }
    });

    res.json({ plans });
  } catch (error) {
    console.error('Get meal plans error:', error);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
});

// POST /api/meal-plans — Create a new meal plan
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, startDate, endDate, notes } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: 'Name, startDate, and endDate are required' });
    }

    const plan = await prisma.mealPlan.create({
      data: {
        userId: req.user!.userId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        notes
      },
      include: {
        slots: true
      }
    });

    res.status(201).json({ plan });
  } catch (error) {
    console.error('Create meal plan error:', error);
    res.status(500).json({ error: 'Failed to create meal plan' });
  }
});

// GET /api/meal-plans/:id — Get a single meal plan with slots
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const plan = await prisma.mealPlan.findFirst({
      where: { id, userId: req.user!.userId },
      include: {
        slots: {
          include: {
            recipe: {
              select: {
                id: true,
                title: true,
                slug: true,
                imageUrl: true,
                nutrition: true,
                ingredients: true,
                prepTimeMinutes: true,
                cookTimeMinutes: true,
                servings: true,
                difficulty: true
              }
            }
          },
          orderBy: [{ date: 'asc' }, { mealType: 'asc' }]
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    res.json({ plan });
  } catch (error) {
    console.error('Get meal plan error:', error);
    res.status(500).json({ error: 'Failed to fetch meal plan' });
  }
});

// PATCH /api/meal-plans/:id — Update a meal plan
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, isActive, notes } = req.body;

    const plan = await prisma.mealPlan.findFirst({
      where: { id, userId: req.user!.userId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.mealPlan.update({
      where: { id },
      data: updateData,
      include: { slots: true }
    });

    res.json({ plan: updated });
  } catch (error) {
    console.error('Update meal plan error:', error);
    res.status(500).json({ error: 'Failed to update meal plan' });
  }
});

// DELETE /api/meal-plans/:id — Delete a meal plan
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const plan = await prisma.mealPlan.findFirst({
      where: { id, userId: req.user!.userId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    await prisma.mealPlan.delete({ where: { id } });

    res.json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    console.error('Delete meal plan error:', error);
    res.status(500).json({ error: 'Failed to delete meal plan' });
  }
});

// POST /api/meal-plans/:id/slots — Add a slot to a meal plan
router.post('/:id/slots', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { recipeId, date, mealType, customName, notes, servings } = req.body;

    if (!date || !mealType) {
      return res.status(400).json({ error: 'Date and mealType are required' });
    }

    // Verify plan belongs to user
    const plan = await prisma.mealPlan.findFirst({
      where: { id, userId: req.user!.userId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    const slot = await prisma.mealPlanSlot.create({
      data: {
        mealPlanId: id,
        recipeId: recipeId || null,
        date: new Date(date),
        mealType,
        customName,
        notes,
        servings: servings || null,
      },
      include: {
        recipe: {
          select: {
            id: true,
            title: true,
            slug: true,
            imageUrl: true,
            nutrition: true
          }
        }
      }
    });

    res.status(201).json({ slot });
  } catch (error) {
    console.error('Create meal plan slot error:', error);
    res.status(500).json({ error: 'Failed to add slot to meal plan' });
  }
});

// PATCH /api/meal-plans/:id/slots/:slotId — Update a meal plan slot
router.patch('/:id/slots/:slotId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id, slotId } = req.params;
    const { recipeId, date, mealType, customName, notes, servings } = req.body;

    // Verify plan belongs to user
    const plan = await prisma.mealPlan.findFirst({
      where: { id, userId: req.user!.userId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    const slot = await prisma.mealPlanSlot.findFirst({
      where: { id: slotId, mealPlanId: id }
    });

    if (!slot) {
      return res.status(404).json({ error: 'Meal plan slot not found' });
    }

    const { isCompleted } = req.body;

    // Handle Mark as Eaten / Undo
    if (isCompleted !== undefined) {
      const now = new Date();
      const updated = await prisma.mealPlanSlot.update({
        where: { id: slotId },
        data: {
          isCompleted,
          completedAt: isCompleted ? now : null,
        },
        include: {
          recipe: {
            select: {
              id: true,
              title: true,
              slug: true,
              imageUrl: true,
              nutrition: true,
              servings: true,
            }
          }
        }
      });

      let mealLogCreated = false;

      if (isCompleted && updated.recipeId && updated.recipe) {
        // Check if a MealLog already exists for this user+recipe+date+mealType (user may have logged via Edit & Log)
        const dateStr = new Date(updated.date).toISOString().split('T')[0];
        const dayStart = new Date(dateStr);
        const dayEnd = new Date(dateStr);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const existingLog = await prisma.mealLog.findFirst({
          where: {
            userId: req.user!.userId,
            mealType: updated.mealType,
            mealDate: { gte: dayStart, lt: dayEnd },
            OR: [
              { recipeId: updated.recipeId },
              { mealName: updated.recipe.title },
            ],
          }
        });

        if (!existingLog) {
          // Auto-create MealLog from recipe nutrition
          let calories = 0, protein = 0, carbs = 0, fat = 0;
          try {
            const nutr = typeof updated.recipe.nutrition === 'string' ? JSON.parse(updated.recipe.nutrition) : updated.recipe.nutrition;
            const multiplier = (updated.servings || updated.recipe.servings || 1) / (updated.recipe.servings || 1);
            calories = Math.round((nutr?.calories || 0) * multiplier);
            protein = Math.round(((nutr?.protein || 0) * multiplier) * 10) / 10;
            carbs = Math.round(((nutr?.carbs || 0) * multiplier) * 10) / 10;
            fat = Math.round(((nutr?.fat || 0) * multiplier) * 10) / 10;
          } catch {}

          await prisma.mealLog.create({
            data: {
              userId: req.user!.userId,
              mealType: updated.mealType,
              mealDate: updated.date,
              mealTime: now,
              recipeId: updated.recipeId,
              recipeServings: updated.servings || updated.recipe.servings || 1,
              mealName: updated.recipe.title,
              calories,
              proteinGrams: protein,
              carbsGrams: carbs,
              fatGrams: fat,
              notes: `Auto-logged from meal plan`,
            }
          });
        }
        mealLogCreated = true;
      } else if (!isCompleted && slot.recipeId) {
        // Undo: remove auto-created MealLog
        const dateStr = new Date(slot.date).toISOString().split('T')[0];
        const dayStart = new Date(dateStr);
        const dayEnd = new Date(dateStr);
        dayEnd.setDate(dayEnd.getDate() + 1);

        await prisma.mealLog.deleteMany({
          where: {
            userId: req.user!.userId,
            recipeId: slot.recipeId,
            mealType: slot.mealType,
            mealDate: { gte: dayStart, lt: dayEnd },
            notes: 'Auto-logged from meal plan',
          }
        });
      }

      return res.json({ slot: updated, mealLogCreated });
    }

    const updateData: any = {};
    if (recipeId !== undefined) updateData.recipeId = recipeId;
    if (date !== undefined) updateData.date = new Date(date);
    if (mealType !== undefined) updateData.mealType = mealType;
    if (customName !== undefined) updateData.customName = customName;
    if (notes !== undefined) updateData.notes = notes;
    if (servings !== undefined) updateData.servings = servings;

    const updated = await prisma.mealPlanSlot.update({
      where: { id: slotId },
      data: updateData,
      include: {
        recipe: {
          select: {
            id: true,
            title: true,
            slug: true,
            imageUrl: true,
            nutrition: true
          }
        }
      }
    });

    res.json({ slot: updated });
  } catch (error) {
    console.error('Update meal plan slot error:', error);
    res.status(500).json({ error: 'Failed to update meal plan slot' });
  }
});

// DELETE /api/meal-plans/:id/slots/:slotId — Delete a meal plan slot
router.delete('/:id/slots/:slotId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id, slotId } = req.params;

    // Verify plan belongs to user
    const plan = await prisma.mealPlan.findFirst({
      where: { id, userId: req.user!.userId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    const slot = await prisma.mealPlanSlot.findFirst({
      where: { id: slotId, mealPlanId: id },
      include: { recipe: { select: { title: true } } }
    });

    if (!slot) {
      return res.status(404).json({ error: 'Meal plan slot not found' });
    }

    // If the slot was completed, also delete the associated MealLog
    if (slot.isCompleted) {
      const dateStr = new Date(slot.date).toISOString().split('T')[0];
      const dayStart = new Date(dateStr);
      const dayEnd = new Date(dateStr);
      dayEnd.setDate(dayEnd.getDate() + 1);

      await prisma.mealLog.deleteMany({
        where: {
          userId: req.user!.userId,
          mealType: slot.mealType,
          mealDate: { gte: dayStart, lt: dayEnd },
          OR: [
            ...(slot.recipeId ? [{ recipeId: slot.recipeId }] : []),
            ...(slot.recipe?.title ? [{ mealName: slot.recipe.title }] : []),
            ...(slot.customName ? [{ mealName: slot.customName }] : []),
          ],
        }
      });
    }

    await prisma.mealPlanSlot.delete({ where: { id: slotId } });

    res.json({ message: 'Meal plan slot deleted successfully' });
  } catch (error) {
    console.error('Delete meal plan slot error:', error);
    res.status(500).json({ error: 'Failed to delete meal plan slot' });
  }
});

export default router;
