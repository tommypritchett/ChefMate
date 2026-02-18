import express from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getPricesForItem, getPricesForList, getNearestStores, scoreStores } from '../services/grocery-prices';

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
// Accepts optional lat/lng for distance-aware recommendations
router.post('/compare', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { items, lat, lng, preferredStores, maxDistance } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }

    const priceResult = getPricesForList(items);
    const maxMiles = maxDistance || 20;

    // If user provided location, add distance data and smart scoring
    let storeDistances: any[] = [];
    let rankedStores: any[] = [];
    if (lat && lng) {
      storeDistances = getNearestStores(lat, lng, maxMiles);
      rankedStores = scoreStores(
        priceResult.storeTotals,
        storeDistances,
        preferredStores || [],
      );

      // Filter out stores beyond max distance from price results
      const nearbyNames = new Set(storeDistances.map(s => s.chain));
      // Keep Amazon Fresh always (delivery)
      nearbyNames.add('Amazon Fresh');

      // Filter store totals to only nearby stores
      const filteredTotals: Record<string, number> = {};
      for (const [store, total] of Object.entries(priceResult.storeTotals)) {
        if (nearbyNames.has(store)) {
          filteredTotals[store] = total;
        }
      }

      // Recalculate best store from filtered
      const bestEntry = Object.entries(filteredTotals).reduce((best, [name, total]) =>
        total < best.total ? { name, total } : best,
        { name: '', total: Infinity }
      );

      return res.json({
        ...priceResult,
        storeTotals: filteredTotals,
        bestStore: bestEntry,
        storeDistances,
        rankedStores,
      });
    }

    res.json(priceResult);
  } catch (error) {
    console.error('Price comparison error:', error);
    res.status(500).json({ error: 'Failed to compare prices' });
  }
});

// GET /api/grocery/nearby?lat=x&lng=y — find nearest stores
router.get('/nearby', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng query parameters required' });
    }
    const maxMiles = parseFloat(req.query.maxDistance as string) || 20;
    const stores = getNearestStores(lat, lng, maxMiles);
    res.json({ stores });
  } catch (error) {
    console.error('Nearby stores error:', error);
    res.status(500).json({ error: 'Failed to find nearby stores' });
  }
});

export default router;
