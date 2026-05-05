import express from 'express';
import prisma from '../../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import {
  inferItemCategory,
  scoreSearchRelevance,
  isSearchDuplicate,
  GOAL_SEARCH_MODIFIERS,
  GROCERY_PRODUCTS,
  goalBoostScore,
  priceValueBonus,
  parseSizeToOz,
} from './helpers';

const router = express.Router();

// POST /api/shopping-lists/set-kroger-location — Save user's nearest Kroger store
router.post('/set-kroger-location', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const { findNearestKrogerLocationCached } = await import('../../services/grocery-prices');
    const location = await findNearestKrogerLocationCached(lat, lng);
    if (!location) {
      return res.status(404).json({ error: 'No nearby Kroger-family store found' });
    }

    // Save to user preferences JSON field
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { preferences: true },
    });

    let prefs: Record<string, any> = {};
    if (user?.preferences) {
      try { prefs = JSON.parse(user.preferences); } catch {}
    }

    prefs.krogerLocation = {
      locationId: location.locationId,
      chain: location.chain,
      address: location.address,
    };

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { preferences: JSON.stringify(prefs) },
    });

    res.json({ krogerLocation: prefs.krogerLocation });
  } catch (error) {
    console.error('Set Kroger location error:', error);
    res.status(500).json({ error: 'Failed to set Kroger location' });
  }
});

// POST /api/shopping-lists/parse-items — Use AI to parse natural language into grocery items
router.post('/parse-items', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length < 2) {
      return res.status(400).json({ error: 'text required' });
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (!process.env.OPENAI_API_KEY) {
      // Fallback: basic split for when no API key
      const items = text.split(/,|\n|\band\b|\bsome\b/i).map((s: string) => s.trim()).filter((s: string) => s.length >= 2);
      return res.json({ items });
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: 'Extract grocery/food item names from the user\'s message. Return ONLY a JSON array of strings, each being a single grocery item. Strip filler words, quantities, and conversational phrases. Examples:\n"I need chicken chocolate milk Greek yogurt and ground beef" → ["chicken", "chocolate milk", "Greek yogurt", "ground beef"]\n"let\'s get some eggs butter bread and orange juice" → ["eggs", "butter", "bread", "orange juice"]\n"how about rice beans and tortillas" → ["rice", "beans", "tortillas"]',
        },
        { role: 'user', content: text.trim() },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '[]';
    // Parse the JSON array from the response
    const match = raw.match(/\[[\s\S]*\]/);
    const items: string[] = match ? JSON.parse(match[0]) : [text.trim()];

    res.json({ items: items.filter((s: string) => typeof s === 'string' && s.length >= 2) });
  } catch (error) {
    console.error('Parse items error:', error);
    // Fallback: return the raw text as a single item
    res.json({ items: [req.body.text?.trim()].filter(Boolean) });
  }
});

// POST /api/shopping-lists/smart-search — Goal-scored Kroger search for multiple items
// Uses saved Kroger location from preferences, returns top 3 per item
router.post('/smart-search', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }

    // Load user's Kroger location from preferences
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { preferences: true },
    });

    let krogerLocation: { locationId: string; chain: string; address: string } | null = null;
    if (user?.preferences) {
      try {
        const prefs = JSON.parse(user.preferences);
        krogerLocation = prefs.krogerLocation || null;
      } catch {}
    }

    if (!krogerLocation) {
      return res.status(400).json({ error: 'no_store_set', message: 'Visit the Shopping tab to set your Kroger store first.' });
    }

    // Load user's health goals
    let userGoalTypes: string[] = [];
    try {
      const goals = await prisma.healthGoal.findMany({
        where: { userId: req.user!.userId, isActive: true },
        select: { goalType: true },
      });
      userGoalTypes = goals.map(g => g.goalType);
    } catch {}

    const { searchKrogerProducts, getBannerInfo } = await import('../../services/grocery-prices');

    const results = await Promise.all(
      items.map(async (query: string) => {
        // Primary search — 15 results
        const allProducts = await searchKrogerProducts(query, krogerLocation!.locationId, 15);

        // Goal-modified secondary search
        if (userGoalTypes.length > 0) {
          const seenNames = new Set(allProducts.map(p => p.name));
          const seenMods = new Set<string>();
          for (const goal of userGoalTypes) {
            const mods = GOAL_SEARCH_MODIFIERS[goal.toLowerCase()];
            if (!mods) continue;
            for (const mod of mods) {
              if (seenMods.has(mod) || query.toLowerCase().includes(mod.toLowerCase())) continue;
              seenMods.add(mod);
              try {
                const goalResults = await searchKrogerProducts(`${mod} ${query}`, krogerLocation!.locationId, 5);
                for (const p of goalResults) {
                  if (!seenNames.has(p.name)) { allProducts.push(p); seenNames.add(p.name); }
                }
              } catch {}
              break;
            }
          }
        }

        // Score products
        const scored = allProducts.map(p => {
          const goalScore = goalBoostScore(p.name, userGoalTypes);
          const valueScore = priceValueBonus(p.price, p.size);
          const goalAligned = goalScore > 0;
          let goalReason: string | undefined;
          if (goalAligned) {
            for (const goal of userGoalTypes) {
              const kw = goal.toLowerCase();
              if (kw.includes('protein')) { goalReason = 'High protein'; break; }
              else if (kw.includes('carb') || kw === 'keto') { goalReason = 'Low carb'; break; }
              else if (kw.includes('calorie') || kw.includes('weight')) { goalReason = 'Lower calorie'; break; }
            }
          }
          const priceBonus = p.price > 0 ? Math.max(0, 10 - p.price) : 0;
          return {
            name: p.name, brand: p.brand, size: p.size,
            price: p.price, promoPrice: p.promoPrice, onSale: p.onSale || false,
            imageUrl: p.imageUrl,
            krogerProductId: p.krogerProductId,
            goalAligned, goalReason,
            _score: goalScore + valueScore + priceBonus + (p.onSale ? 8 : 0),
            _pricePerOz: parseSizeToOz(p.size) > 0 ? p.price / parseSizeToOz(p.size) : 999,
          };
        });

        scored.sort((a, b) => b._score - a._score || a.price - b.price);
        const top5 = scored.slice(0, 5);
        const byValue = [...top5].sort((a, b) => a._pricePerOz - b._pricePerOz);

        return {
          query,
          products: top5.map(p => ({
            name: p.name, brand: p.brand, size: p.size,
            price: p.price, promoPrice: p.promoPrice, onSale: p.onSale,
            imageUrl: p.imageUrl,
            goalAligned: p.goalAligned, goalReason: p.goalReason,
            valueRank: byValue.indexOf(p) + 1,
            krogerProductId: p.krogerProductId,
          })),
        };
      })
    );

    const banner = getBannerInfo(krogerLocation.chain);
    res.json({
      results,
      storeName: `${banner.name} (${krogerLocation.address})`,
    });
  } catch (error) {
    console.error('Smart search error:', error);
    res.status(500).json({ error: 'Smart search failed' });
  }
});

// GET /api/shopping-lists/search-products — Autocomplete product search
// Accepts optional ?kroger=true&lat=X&lng=Y for live Kroger product search
router.get('/search-products', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const q = (req.query.q as string || '').toLowerCase().trim();
    if (!q || q.length < 1) {
      return res.json({ products: [] });
    }

    // Load user's active health goals for search boosting
    let userGoalTypes: string[] = [];
    try {
      const goals = await prisma.healthGoal.findMany({
        where: { userId: req.user!.userId, isActive: true },
        select: { goalType: true },
      });
      userGoalTypes = goals.map(g => g.goalType);
    } catch {}

    // Collect all candidates with relevance scores
    type Candidate = {
      name: string; category: string; defaultUnit: string;
      source: string; score: number;
      commonUnits?: string[]; imageUrl?: string;
      price?: number; promoPrice?: number; size?: string;
      goalAligned?: boolean;
      krogerProductId?: string;
    };
    const candidates: Candidate[] = [];

    // 1) Kroger API results FIRST — real product data is the primary source
    const useKroger = req.query.kroger === 'true';
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    let krogerReturned = 0;

    if (useKroger && !isNaN(lat) && !isNaN(lng) && q.length >= 2 && process.env.KROGER_CLIENT_ID) {
      try {
        const { findNearestKrogerLocationCached, searchKrogerProducts } = await import('../../services/grocery-prices');
        const location = await findNearestKrogerLocationCached(lat, lng);
        if (location) {
          // Primary Kroger search with the user's exact query
          const krogerResults = await searchKrogerProducts(q, location.locationId, 15);
          krogerReturned = krogerResults.length;
          const addKrogerResults = (results: typeof krogerResults, scoreBase: number) => {
            for (const kr of results) {
              const relevance = scoreSearchRelevance(kr.name, q);
              const valueBonus = priceValueBonus(kr.price, kr.size);
              candidates.push({
                name: kr.name,
                category: inferItemCategory(kr.name),
                defaultUnit: kr.size || 'each',
                source: 'kroger', score: scoreBase + relevance + valueBonus,
                imageUrl: kr.imageUrl,
                price: kr.price,
                promoPrice: kr.promoPrice,
                size: kr.size,
                krogerProductId: kr.krogerProductId,
              });
            }
          };
          addKrogerResults(krogerResults, 200);

          // Goal-aware secondary search: surface goal-aligned alternatives
          // e.g. "chocolate milk" + high-protein → also search "protein chocolate milk"
          if (userGoalTypes.length > 0) {
            const seenModifiers = new Set<string>();
            for (const goal of userGoalTypes) {
              const modifiers = GOAL_SEARCH_MODIFIERS[goal.toLowerCase()];
              if (!modifiers) continue;
              for (const mod of modifiers) {
                if (seenModifiers.has(mod)) continue;
                // Skip if the user already typed this modifier
                if (q.includes(mod.toLowerCase())) continue;
                seenModifiers.add(mod);
                const goalQuery = `${mod} ${q}`;
                try {
                  const goalResults = await searchKrogerProducts(goalQuery, location.locationId, 5);
                  // Score slightly below primary results (190+) so they appear after direct matches
                  addKrogerResults(goalResults, 190);
                } catch {}
                // Only do one secondary search to keep it fast
                break;
              }
              break; // One goal modifier search is enough
            }
          }
        }
      } catch (err) {
        console.error('Kroger product search in autocomplete failed:', err);
      }
    }

    // 2) Search user's previous shopping list items
    const userItems = await prisma.shoppingListItem.findMany({
      where: {
        shoppingList: { userId: req.user!.userId },
        name: { contains: q },
      },
      distinct: ['name'],
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: { name: true, unit: true, category: true },
    });
    for (const item of userItems) {
      const score = scoreSearchRelevance(item.name, q) + 5; // small history bonus
      candidates.push({
        name: item.name,
        category: item.category || inferItemCategory(item.name),
        defaultUnit: item.unit || 'count',
        source: 'history', score,
      });
    }

    // 3) Local product database — fallback / supplement when Kroger doesn't cover it
    for (const p of GROCERY_PRODUCTS) {
      const name = p.name.toLowerCase();
      const score = scoreSearchRelevance(name, q);
      if (score > 0) {
        candidates.push({
          name: p.name, category: p.category, defaultUnit: p.unit,
          commonUnits: p.commonUnits, source: 'database', score,
        });
      }
    }

    // Apply goal-aware boost
    if (userGoalTypes.length > 0) {
      for (const c of candidates) {
        const boost = goalBoostScore(c.name, userGoalTypes);
        if (boost > 0) {
          c.score += boost;
          c.goalAligned = true;
        }
      }
    }

    // Sort by score descending, then deduplicate
    // Kroger results (score 200+) naturally float to top
    // Local DB items are deduped against Kroger items but not vice versa
    candidates.sort((a, b) => b.score - a.score);
    const seenNames = new Set<string>();
    const products: any[] = [];
    for (const c of candidates) {
      const normName = c.name.toLowerCase().trim();
      // Exact dupe check for all sources
      if (seenNames.has(normName)) continue;
      // Kroger results are never suppressed by substring dedup
      // Non-kroger items can be deduped if they overlap with an already-seen name
      if (c.source !== 'kroger' && isSearchDuplicate(c.name, seenNames)) continue;
      seenNames.add(normName);
      const { score, ...product } = c;
      products.push(product);
      if (products.length >= 15) break;
    }

    res.json({ products });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

export default router;
