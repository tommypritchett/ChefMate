import express from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

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
    const { name, description, sourceType, sourceRecipeId, items } = req.body;
    
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
    
    // Auto-populate items from recipe if sourceRecipeId provided
    if (sourceRecipeId && !sourceRecipeId.startsWith('mock-')) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: sourceRecipeId }
      });
      
      if (recipe && recipe.ingredients) {
        const ingredients = typeof recipe.ingredients === 'string' 
          ? JSON.parse(recipe.ingredients) 
          : recipe.ingredients;
        
        if (Array.isArray(ingredients) && ingredients.length > 0) {
          await prisma.shoppingListItem.createMany({
            data: ingredients.map((ing: any) => ({
              shoppingListId: list.id,
              name: ing.name,
              quantity: ing.amount || null,
              unit: ing.unit || null,
              category: null
            }))
          });
        }
      }
    }
    
    // Also handle manually passed items array
    if (items && Array.isArray(items) && items.length > 0) {
      await prisma.shoppingListItem.createMany({
        data: items.map((item: any) => ({
          shoppingListId: list.id,
          name: item.name,
          quantity: item.quantity || null,
          unit: item.unit || null,
          category: item.category || null
        }))
      });
    }
    
    // Fetch the complete list with items
    const completeList = await prisma.shoppingList.findUnique({
      where: { id: list.id },
      include: { items: true }
    });
    
    res.status(201).json({ list: completeList });
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

// POST /api/shopping-lists/:listId/items/:itemId/purchase
// Mark item as purchased AND add to inventory
router.post('/:listId/items/:itemId/purchase', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId, itemId } = req.params;
    const { storageLocation = 'fridge', category } = req.body;
    
    // Verify ownership
    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId }
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    // Get the item
    const item = await prisma.shoppingListItem.findUnique({
      where: { id: itemId }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Mark as checked
    await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: { 
        isChecked: true,
        checkedAt: new Date()
      }
    });
    
    // Add to inventory
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        userId: req.user!.userId,
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || 'pieces',
        category: category || item.category || 'other',
        storageLocation,
        purchasedAt: new Date()
      }
    });
    
    res.json({ 
      success: true, 
      message: `${item.name} added to inventory`,
      inventoryItem 
    });
  } catch (error) {
    console.error('Purchase item error:', error);
    res.status(500).json({ error: 'Failed to purchase item' });
  }
});

// POST /api/shopping-lists/:listId/purchase-all
// Mark all unchecked items as purchased AND add to inventory
router.post('/:listId/purchase-all', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId } = req.params;
    const { storageLocation = 'fridge' } = req.body;
    
    // Verify ownership and get list with items
    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId },
      include: { items: true }
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    const uncheckedItems = list.items.filter(item => !item.isChecked);
    
    if (uncheckedItems.length === 0) {
      return res.json({ success: true, message: 'No items to purchase', count: 0 });
    }
    
    // Mark all as checked
    await prisma.shoppingListItem.updateMany({
      where: { 
        shoppingListId: listId,
        isChecked: false
      },
      data: { 
        isChecked: true,
        checkedAt: new Date()
      }
    });
    
    // Add all to inventory
    const inventoryItems = await Promise.all(
      uncheckedItems.map(item => 
        prisma.inventoryItem.create({
          data: {
            userId: req.user!.userId,
            name: item.name,
            quantity: item.quantity || 1,
            unit: item.unit || 'pieces',
            category: item.category || 'other',
            storageLocation,
            purchasedAt: new Date()
          }
        })
      )
    );
    
    res.json({ 
      success: true, 
      message: `${inventoryItems.length} items added to inventory`,
      count: inventoryItems.length,
      inventoryItems 
    });
  } catch (error) {
    console.error('Purchase all items error:', error);
    res.status(500).json({ error: 'Failed to purchase items' });
  }
});

export default router;