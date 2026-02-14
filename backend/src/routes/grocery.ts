import express from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getPricesForItem, getPricesForList } from '../services/grocery-prices';

const router = express.Router();

// GET /api/grocery/price?item=chicken+breast — single item price comparison
router.get('/price', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const item = req.query.item as string;
    if (!item) return res.status(400).json({ error: 'item query parameter required' });
    const result = getPricesForItem(item);
    res.json(result);
  } catch (error) {
    console.error('Price lookup error:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// POST /api/grocery/compare — compare prices for multiple items
router.post('/compare', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }
    const result = getPricesForList(items);
    res.json(result);
  } catch (error) {
    console.error('Price comparison error:', error);
    res.status(500).json({ error: 'Failed to compare prices' });
  }
});

export default router;
