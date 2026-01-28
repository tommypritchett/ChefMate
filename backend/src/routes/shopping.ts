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

// DELETE /api/shopping-lists/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const list = await prisma.shoppingList.findFirst({
      where: { id, userId: req.user!.userId }
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    await prisma.shoppingList.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete shopping list error:', error);
    res.status(500).json({ error: 'Failed to delete shopping list' });
  }
});

// POST /api/shopping-lists/:id/items
router.post('/:id/items', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, quantity, unit, category } = req.body;
    
    // Verify ownership
    const list = await prisma.shoppingList.findFirst({
      where: { id, userId: req.user!.userId }
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    const item = await prisma.shoppingListItem.create({
      data: {
        shoppingListId: id,
        name,
        quantity,
        unit,
        category
      }
    });
    
    res.status(201).json({ item });
  } catch (error) {
    console.error('Add shopping list item error:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// PATCH /api/shopping-lists/:listId/items/:itemId
router.patch('/:listId/items/:itemId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId, itemId } = req.params;
    const { isChecked } = req.body;
    
    // Verify ownership
    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId }
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    const item = await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: { 
        isChecked,
        checkedAt: isChecked ? new Date() : null
      }
    });
    
    res.json({ item });
  } catch (error) {
    console.error('Update shopping list item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/shopping-lists/:listId/items/:itemId
router.delete('/:listId/items/:itemId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId, itemId } = req.params;
    
    // Verify ownership
    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId }
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    await prisma.shoppingListItem.delete({ where: { id: itemId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete shopping list item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;