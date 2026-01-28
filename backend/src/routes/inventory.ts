import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/inventory
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ items });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// POST /api/inventory
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, category, storageLocation, quantity, unit, purchasedAt, expiresAt } = req.body;
    
    const item = await prisma.inventoryItem.create({
      data: {
        userId: req.user!.userId,
        name,
        category,
        storageLocation,
        quantity: quantity ? parseFloat(quantity) : null,
        unit,
        purchasedAt: purchasedAt ? new Date(purchasedAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });
    
    res.status(201).json({ item });
  } catch (error) {
    console.error('Create inventory item error:', error);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// DELETE /api/inventory/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Verify the item belongs to the user before deleting
    const item = await prisma.inventoryItem.findFirst({
      where: { 
        id, 
        userId: req.user!.userId 
      }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    await prisma.inventoryItem.delete({
      where: { id }
    });
    
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

export default router;