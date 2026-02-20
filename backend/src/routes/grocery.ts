import express from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getPricesForItem, getPricesForList, getNearestStores, scoreStores, enrichWithKrogerPrices, findNearestKrogerLocationCached, getKrogerSaleItems, getPriceHistory, calculateTrend, getBannerInfo } from '../services/grocery-prices';

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

    let priceResult = getPricesForList(items);
    const maxMiles = maxDistance || 20;

    // If user provided location, add distance data and smart scoring
    let storeDistances: any[] = [];
    let rankedStores: any[] = [];
    if (lat && lng) {
      // Enrich with live Kroger prices if API is configured
      if (process.env.KROGER_CLIENT_ID) {
        try {
          const enrichedItems = await enrichWithKrogerPrices(priceResult.items, lat, lng);
          priceResult.items = enrichedItems;

          // Find the actual banner name (could be Mariano's, King Soopers, etc.)
          const bannerName = enrichedItems[0]?.stores.find(
            (s) => !['Walmart', 'Target', 'Aldi', 'Amazon Fresh'].includes(s.store),
          )?.store || 'Kroger';

          // Recalculate store total for the Kroger-family banner
          const krogerTotal = enrichedItems.reduce((sum, item) => {
            const krogerStore = item.stores.find((s) => s.store === bannerName);
            return sum + (krogerStore?.price ?? 0);
          }, 0);
          // Replace "Kroger" key with actual banner name
          delete priceResult.storeTotals['Kroger'];
          priceResult.storeTotals[bannerName] = Math.round(krogerTotal * 100) / 100;

          // Update storeLinks: replace "Kroger" entry with banner-specific URLs
          if (priceResult.storeLinks?.['Kroger'] && bannerName !== 'Kroger') {
            const bannerStore = enrichedItems[0]?.stores.find((s) => s.store === bannerName);
            if (bannerStore) {
              // Extract base URL from the first item's deep link
              const baseUrl = bannerStore.deepLink.split('/search')[0];
              priceResult.storeLinks[bannerName] = {
                homeUrl: baseUrl,
                searchUrl: `${baseUrl}/search?query=${encodeURIComponent(items.slice(0, 3).join(', '))}&searchType=default_search`,
              };
              delete priceResult.storeLinks['Kroger'];
            }
          }

          // Update itemSearchUrls: replace "Kroger" entry with banner-specific URLs
          if (priceResult.itemSearchUrls?.['Kroger'] && bannerName !== 'Kroger') {
            const bannerStore = enrichedItems[0]?.stores.find((s) => s.store === bannerName);
            if (bannerStore) {
              const baseUrl = bannerStore.deepLink.split('/search')[0];
              priceResult.itemSearchUrls[bannerName] = {};
              for (const item of items) {
                priceResult.itemSearchUrls[bannerName][item] = `${baseUrl}/search?query=${encodeURIComponent(item)}&searchType=default_search`;
              }
              delete priceResult.itemSearchUrls['Kroger'];
            }
          }

          // Recalculate overall best store
          const bestEntry = Object.entries(priceResult.storeTotals).reduce(
            (best, [name, total]) => (total < best.total ? { name, total } : best),
            { name: '', total: Infinity },
          );
          const worstTotal = Math.max(...Object.values(priceResult.storeTotals));
          priceResult.bestStore = bestEntry;
          priceResult.totalSavings = Math.round((worstTotal - bestEntry.total) * 100) / 100;
        } catch (err) {
          console.error('Kroger enrichment failed, using mock data:', err);
        }
      }

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
      // Keep Kroger-family banner if we have live prices (location came from Kroger API, not our hardcoded list)
      for (const storeName of Object.keys(priceResult.storeTotals)) {
        if (!['Walmart', 'Target', 'Aldi', 'Amazon Fresh'].includes(storeName)) {
          nearbyNames.add(storeName);
        }
      }

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

// GET /api/grocery/price-history?item=chicken+breast&days=30
router.get('/price-history', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const item = req.query.item as string;
    if (!item) return res.status(400).json({ error: 'item query parameter required' });
    const days = parseInt(req.query.days as string) || 30;
    const history = await getPriceHistory(item, days);
    const trend = calculateTrend(history);
    res.json({ item, days, history, trend });
  } catch (error) {
    console.error('Price history error:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

// GET /api/grocery/deals?lat=X&lng=Y&limit=20
router.get('/deals', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng query parameters required' });
    }
    const limit = parseInt(req.query.limit as string) || 20;

    const location = await findNearestKrogerLocationCached(lat, lng);
    if (!location) {
      return res.json({ storeName: null, deals: [], message: 'No nearby Kroger-family store found or API not configured' });
    }

    const deals = await getKrogerSaleItems(location.locationId, limit);
    const banner = getBannerInfo(location.chain);
    res.json({
      storeName: banner.name,
      storeAddress: location.address,
      locationId: location.locationId,
      deals,
    });
  } catch (error) {
    console.error('Deals error:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

export default router;
