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
      where: { id: slotId, mealPlanId: id }
    });

    if (!slot) {
      return res.status(404).json({ error: 'Meal plan slot not found' });
    }

    await prisma.mealPlanSlot.delete({ where: { id: slotId } });

    res.json({ message: 'Meal plan slot deleted successfully' });
  } catch (error) {
    console.error('Delete meal plan slot error:', error);
    res.status(500).json({ error: 'Failed to delete meal plan slot' });
  }
});

export default router;
