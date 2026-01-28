import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/shopping-lists
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const lists = await prisma.shoppingList.findMany({
      where: { userId: req.user!.userId },
      include: {
        items: true,
        _count: {
          select: { items: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ lists });
  } catch (error) {
    console.error('Get shopping lists error:', error);
    res.status(500).json({ error: 'Failed to fetch shopping lists' });
  }
});

// POST /api/shopping-lists
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description, sourceType, sourceRecipeId } = req.body;
    
    // Handle mock recipes by not setting sourceRecipeId foreign key
    const listData: any = {
      userId: req.user!.userId,
      name,
      description,
      sourceType
    };
    
    // Only set sourceRecipeId for real recipes (not mock ones)
    if (sourceRecipeId && !sourceRecipeId.startsWith('mock-')) {
      listData.sourceRecipeId = sourceRecipeId;
    }
    
    const list = await prisma.shoppingList.create({
      data: listData
    });
    
    res.status(201).json({ list });
  } catch (error) {
    console.error('Create shopping list error:', error);
    res.status(500).json({ error: 'Failed to create shopping list' });
  }
});

export default router;