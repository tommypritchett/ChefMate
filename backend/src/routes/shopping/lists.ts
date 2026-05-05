import express from 'express';
import prisma from '../../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import {
  inferStorageLocation,
  inferItemCategory,
  sanitizeText,
  findExistingItem,
  convertAndAdd,
} from './helpers';
import { calculateExpiryDate } from '../../utils/dateHelpers';

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
    const { name: rawName, description, sourceType, sourceRecipeId, items } = req.body;
    const name = rawName ? sanitizeText(rawName) : rawName;

    // Handle mock recipes by not setting sourceRecipeId foreign key
    const listData: any = {
      userId: req.user!.userId,
      name,
      description: description ? sanitizeText(description) : description,
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
// Smart aggregation: if a matching item exists, update quantity instead of duplicating
router.post('/:id/items', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name: rawItemName, quantity, unit, category, krogerProductId } = req.body;
    const name = rawItemName ? sanitizeText(rawItemName) : rawItemName;

    // Verify ownership and get existing items
    const list = await prisma.shoppingList.findFirst({
      where: { id, userId: req.user!.userId },
      include: { items: { where: { isChecked: false } } }
    });

    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Check for existing matching item (fuzzy match)
    const existing = findExistingItem(name, list.items);

    if (existing) {
      // Aggregate quantities
      const existingQty = existing.quantity || 0;
      const existingUnit = existing.unit || '';
      const newQty = quantity || 0;
      const newUnit = unit || existingUnit;

      let finalQty = existingQty;
      let finalUnit = existingUnit || newUnit;

      if (newQty > 0 && existingQty > 0) {
        const converted = convertAndAdd(existingQty, existingUnit, newQty, newUnit);
        finalQty = converted.quantity;
        finalUnit = converted.unit;
      } else if (newQty > 0) {
        finalQty = newQty;
        finalUnit = newUnit;
      }

      // Build notes showing aggregation history
      const prevNotes = existing.notes || '';
      const historyEntry = `${existingQty || '?'} ${existingUnit} + ${newQty || '?'} ${newUnit}`;
      const newNotes = prevNotes
        ? `${prevNotes} + ${newQty || '?'} ${newUnit}`
        : historyEntry;

      const item = await prisma.shoppingListItem.update({
        where: { id: existing.id },
        data: {
          quantity: finalQty,
          unit: finalUnit,
          notes: newNotes,
          // Upgrade krogerProductId if the new item has one and the existing doesn't
          ...(krogerProductId && !existing.krogerProductId ? { krogerProductId } : {}),
        },
      });

      res.status(200).json({
        item,
        action: 'aggregated',
        message: `Updated "${existing.name}" to ${finalQty} ${finalUnit} (was ${existingQty} ${existingUnit})`,
      });
    } else {
      // No match — create new item
      const item = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: id,
          name,
          quantity,
          unit,
          category,
          krogerProductId,
        }
      });

      res.status(201).json({ item, action: 'created' });
    }
  } catch (error) {
    console.error('Add shopping list item error:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// PATCH /api/shopping-lists/:listId/items/:itemId
// Supports editing name, quantity, unit, AND toggling isChecked
router.patch('/:listId/items/:itemId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId, itemId } = req.params;
    const { isChecked, name: rawEditName, quantity, unit, notes, krogerProductId } = req.body;
    const name = rawEditName !== undefined ? sanitizeText(rawEditName) : undefined;

    // Verify ownership
    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId }
    });

    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const updateData: any = {};
    if (isChecked !== undefined) {
      updateData.isChecked = isChecked;
      updateData.checkedAt = isChecked ? new Date() : null;
    }
    if (name !== undefined) updateData.name = name;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (unit !== undefined) updateData.unit = unit;
    if (notes !== undefined) updateData.notes = notes;
    if (krogerProductId !== undefined) updateData.krogerProductId = krogerProductId;

    // Only clear cart tracking when name truly changes (different product).
    // Quantity-only edits preserve krogerCartQuantity for partial-add support.
    if (name !== undefined && krogerProductId === undefined) {
      const existing = await prisma.shoppingListItem.findUnique({
        where: { id: itemId },
        select: { name: true },
      });
      if (existing && existing.name.toLowerCase() !== name.toLowerCase()) {
        updateData.addedToKrogerCartAt = null;
        updateData.krogerCartQuantity = null;
        updateData.krogerProductId = null;
      }
    }

    const item = await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: updateData
    });

    // Check if all items are now checked (for auto-archive)
    if (isChecked === true) {
      const allItems = await prisma.shoppingListItem.findMany({
        where: { shoppingListId: listId }
      });
      const allChecked = allItems.every(i => i.isChecked);
      const listAge = Date.now() - list.createdAt.getTime();
      const oneHour = 60 * 60 * 1000;

      if (allChecked && listAge > oneHour) {
        await prisma.shoppingList.update({
          where: { id: listId },
          data: { isActive: false, completedAt: new Date() }
        });
        return res.json({ item, listCompleted: true, message: 'Shopping list completed and archived' });
      }
    }

    res.json({ item });
  } catch (error) {
    console.error('Update shopping list item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// POST /api/shopping-lists/:listId/mark-carted — Bulk-mark items as added to Kroger cart
router.post('/:listId/mark-carted', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId } = req.params;
    const { itemIds, itemQuantities } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'itemIds array required' });
    }

    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId },
    });

    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Track per-item quantity if provided
    const qtyMap: Record<string, number> = itemQuantities || {};
    let count = 0;
    for (const itemId of itemIds) {
      const addedQty = qtyMap[itemId] || 0;
      const existing = await prisma.shoppingListItem.findUnique({
        where: { id: itemId },
        select: { krogerCartQuantity: true },
      });
      const prevQty = existing?.krogerCartQuantity || 0;
      await prisma.shoppingListItem.update({
        where: { id: itemId },
        data: {
          addedToKrogerCartAt: new Date(),
          krogerCartQuantity: prevQty + addedQty,
        },
      });
      count++;
    }
    const result = { count };

    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Mark carted error:', error);
    res.status(500).json({ error: 'Failed to mark items as carted' });
  }
});

// PATCH /api/shopping-lists/:listId — Update list (name, archive, etc.)
router.patch('/:listId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId } = req.params;
    const { name, isActive } = req.body;

    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId }
    });

    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) {
      updateData.isActive = isActive;
      if (!isActive) updateData.completedAt = new Date();
    }

    const updated = await prisma.shoppingList.update({
      where: { id: listId },
      data: updateData,
      include: { items: true }
    });

    res.json({ list: updated });
  } catch (error) {
    console.error('Update shopping list error:', error);
    res.status(500).json({ error: 'Failed to update shopping list' });
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
    const { storageLocation, category } = req.body;

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

    // Add to inventory — auto-infer storage location if not provided
    const inferredStorage = storageLocation || inferStorageLocation(item.name);
    const inferredCategory = category || item.category || inferItemCategory(item.name);

    // Compute expiry date — item-name-aware
    const expiresAt = calculateExpiryDate(inferredStorage, inferredCategory, new Date(), item.name);

    // Check for existing inventory item (case-insensitive) to avoid duplicates
    const existingInventory = await prisma.inventoryItem.findFirst({
      where: {
        userId: req.user!.userId,
        name: { equals: item.name },
      },
    });

    let inventoryItem;
    if (existingInventory && existingInventory.name.toLowerCase() === item.name.toLowerCase()) {
      inventoryItem = await prisma.inventoryItem.update({
        where: { id: existingInventory.id },
        data: {
          quantity: (existingInventory.quantity || 0) + (item.quantity || 1),
          purchasedAt: new Date(),
          expiresAt,
        },
      });
    } else {
      inventoryItem = await prisma.inventoryItem.create({
        data: {
          userId: req.user!.userId,
          name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || 'pieces',
          category: inferredCategory,
          storageLocation: inferredStorage,
          purchasedAt: new Date(),
          expiresAt,
        }
      });
    }

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

// GET /api/shopping-lists/:listId/purchase-preview
// Preview storage locations for all unchecked items (auto-inferred)
router.get('/:listId/purchase-preview', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId } = req.params;

    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId },
      include: { items: true }
    });

    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const uncheckedItems = list.items.filter(item => !item.isChecked);

    const preview = uncheckedItems.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: inferItemCategory(item.name),
      storageLocation: inferStorageLocation(item.name),
    }));

    res.json({ items: preview });
  } catch (error) {
    console.error('Purchase preview error:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// POST /api/shopping-lists/:listId/purchase-all
// Mark all checked items as purchased AND add to inventory
// Accepts optional itemLocations array for per-item storage overrides
router.post('/:listId/purchase-all', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId } = req.params;
    // itemLocations: [{itemId, storageLocation}] — per-item overrides
    const { itemLocations } = req.body;

    // Verify ownership and get list with items
    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId },
      include: { items: true }
    });

    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Purchase checked items (or all unchecked if no checked items)
    const checkedItems = list.items.filter(item => item.isChecked);
    const itemsToPurchase = checkedItems.length > 0 ? checkedItems : list.items.filter(item => !item.isChecked);

    if (itemsToPurchase.length === 0) {
      return res.json({ success: true, message: 'No items to purchase', count: 0 });
    }

    // Build location map from overrides
    const locationMap: Record<string, string> = {};
    if (Array.isArray(itemLocations)) {
      for (const loc of itemLocations) {
        if (loc.itemId && loc.storageLocation) {
          locationMap[loc.itemId] = loc.storageLocation;
        }
      }
    }

    // Mark all as checked
    await prisma.shoppingListItem.updateMany({
      where: {
        id: { in: itemsToPurchase.map(i => i.id) },
      },
      data: {
        isChecked: true,
        checkedAt: new Date()
      }
    });

    // Add all to inventory with per-item storage inference + dedup + expiry
    const inventoryItems = await Promise.all(
      itemsToPurchase.map(async item => {
        const storage = locationMap[item.id] || inferStorageLocation(item.name);
        const category = inferItemCategory(item.name);
        const expiresAt = calculateExpiryDate(storage, category, new Date(), item.name);

        // Check for existing inventory item to avoid duplicates
        const existingInventory = await prisma.inventoryItem.findFirst({
          where: {
            userId: req.user!.userId,
            name: { equals: item.name },
          },
        });

        if (existingInventory && existingInventory.name.toLowerCase() === item.name.toLowerCase()) {
          return prisma.inventoryItem.update({
            where: { id: existingInventory.id },
            data: {
              quantity: (existingInventory.quantity || 0) + (item.quantity || 1),
              purchasedAt: new Date(),
              expiresAt,
            },
          });
        }

        return prisma.inventoryItem.create({
          data: {
            userId: req.user!.userId,
            name: item.name,
            quantity: item.quantity || 1,
            unit: item.unit || 'pieces',
            category,
            storageLocation: storage,
            purchasedAt: new Date(),
            expiresAt,
          }
        });
      })
    );

    // Auto-archive if all items now checked and list is old enough
    const allItems = await prisma.shoppingListItem.findMany({
      where: { shoppingListId: listId }
    });
    const allChecked = allItems.every(i => i.isChecked);
    let listArchived = false;
    if (allChecked) {
      const listAge = Date.now() - list.createdAt.getTime();
      if (listAge > 60 * 60 * 1000) { // >1 hour old
        await prisma.shoppingList.update({
          where: { id: listId },
          data: { isActive: false, completedAt: new Date() }
        });
        listArchived = true;
      }
    }

    res.json({
      success: true,
      message: `${inventoryItems.length} items added to inventory`,
      count: inventoryItems.length,
      inventoryItems,
      listArchived,
    });
  } catch (error) {
    console.error('Purchase all items error:', error);
    res.status(500).json({ error: 'Failed to purchase items' });
  }
});

// POST /api/shopping-lists/:id/items/bulk
// Parse raw text (one item per line or comma-separated) and add all items at once
router.post('/:id/items/bulk', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { items: rawText } = req.body;

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ error: 'Items text is required' });
    }

    // Verify ownership
    const list = await prisma.shoppingList.findFirst({
      where: { id, userId: req.user!.userId }
    });

    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Split by newlines or commas, trim each line
    const lines = rawText.split(/[\n,]+/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);

    if (lines.length === 0) {
      return res.status(400).json({ error: 'No items found in text' });
    }

    // Parse each line: "chicken breast 3 lbs" → name, qty, unit
    // Regex: optional leading quantity + unit at the end, rest is name
    const parsedItems = lines.map((line: string) => {
      // Try pattern: "name qty unit" e.g. "chicken breast 3 lbs"
      const trailingMatch = line.match(/^(.+?)\s+(\d+\.?\d*)\s*([a-zA-Z]+)$/);
      if (trailingMatch) {
        return {
          name: trailingMatch[1].trim(),
          quantity: parseFloat(trailingMatch[2]),
          unit: trailingMatch[3],
          category: inferItemCategory(trailingMatch[1].trim()),
        };
      }

      // Try pattern: "qty unit name" e.g. "3 lbs chicken breast"
      const leadingMatch = line.match(/^(\d+\.?\d*)\s*([a-zA-Z]+)\s+(.+)$/);
      if (leadingMatch) {
        return {
          name: leadingMatch[3].trim(),
          quantity: parseFloat(leadingMatch[1]),
          unit: leadingMatch[2],
          category: inferItemCategory(leadingMatch[3].trim()),
        };
      }

      // Try pattern: "qty name" e.g. "3 chicken breasts"
      const qtyOnlyMatch = line.match(/^(\d+\.?\d*)\s+(.+)$/);
      if (qtyOnlyMatch) {
        return {
          name: qtyOnlyMatch[2].trim(),
          quantity: parseFloat(qtyOnlyMatch[1]),
          unit: null,
          category: inferItemCategory(qtyOnlyMatch[2].trim()),
        };
      }

      // Just a name
      return {
        name: line,
        quantity: null,
        unit: null,
        category: inferItemCategory(line),
      };
    });

    // Create all items
    await prisma.shoppingListItem.createMany({
      data: parsedItems.map((item: any) => ({
        shoppingListId: id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
      })),
    });

    // Fetch updated list
    const updatedList = await prisma.shoppingList.findUnique({
      where: { id },
      include: { items: true },
    });

    res.status(201).json({
      count: parsedItems.length,
      items: parsedItems,
      list: updatedList,
    });
  } catch (error) {
    console.error('Bulk add items error:', error);
    res.status(500).json({ error: 'Failed to add items' });
  }
});

export default router;
