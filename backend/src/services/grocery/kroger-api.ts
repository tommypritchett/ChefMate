import prisma from '../../lib/prisma';
import { STORES, round } from './mock-prices';
import type { StorePrice, PriceResult } from './mock-prices';

// Module-level token cache (Kroger tokens last 30 min, refresh at 25 min)
let _krogerToken: string | null = null;
let _krogerTokenExpiry = 0;

async function getKrogerToken(): Promise<string | null> {
  if (_krogerToken && Date.now() < _krogerTokenExpiry) return _krogerToken;

  const clientId = process.env.KROGER_CLIENT_ID;
  const clientSecret = process.env.KROGER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch('https://api.kroger.com/v1/connect/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials&scope=product.compact',
    });
    if (!res.ok) return null;
    const json = await res.json() as { access_token: string; expires_in: number };
    _krogerToken = json.access_token;
    _krogerTokenExpiry = Date.now() + (json.expires_in - 300) * 1000;
    return _krogerToken;
  } catch (err) {
    console.error('Kroger token error:', err);
    return null;
  }
}

export interface KrogerLocation {
  locationId: string;
  chain: string;
  address: string;
  lat: number;
  lng: number;
}

// Kroger-family banner websites for deep links
const KROGER_BANNERS: Record<string, { name: string; searchUrl: (q: string) => string }> = {
  KROGER:      { name: 'Kroger',        searchUrl: (q) => `https://www.kroger.com/search?query=${q}&searchType=default_search` },
  MARIANOS:    { name: "Mariano's",     searchUrl: (q) => `https://www.marianos.com/search?query=${q}&searchType=default_search` },
  KINGSOOPERS: { name: 'King Soopers',  searchUrl: (q) => `https://www.kingsoopers.com/search?query=${q}&searchType=default_search` },
  FRED:        { name: 'Fred Meyer',    searchUrl: (q) => `https://www.fredmeyer.com/search?query=${q}&searchType=default_search` },
  RALPHS:      { name: 'Ralphs',        searchUrl: (q) => `https://www.ralphs.com/search?query=${q}&searchType=default_search` },
  SMITHS:      { name: "Smith's",       searchUrl: (q) => `https://www.smithsfoodanddrug.com/search?query=${q}&searchType=default_search` },
  FRYS:        { name: "Fry's",         searchUrl: (q) => `https://www.frysfood.com/search?query=${q}&searchType=default_search` },
  QFC:         { name: 'QFC',           searchUrl: (q) => `https://www.qfc.com/search?query=${q}&searchType=default_search` },
  HARRISTEETER:{ name: 'Harris Teeter', searchUrl: (q) => `https://www.harristeeter.com/search?query=${q}&searchType=default_search` },
  DILLONS:     { name: "Dillons",       searchUrl: (q) => `https://www.dillons.com/search?query=${q}&searchType=default_search` },
};

export function getBannerInfo(chain: string): { name: string; searchUrl: (q: string) => string } {
  return KROGER_BANNERS[chain] || KROGER_BANNERS[normalizeChainKey(chain)] || KROGER_BANNERS['KROGER'];
}

/** Normalize chain strings from the Kroger API to match KROGER_BANNERS keys.
 *  e.g., "MARIANO'S" → "MARIANOS", "King Soopers" → "KINGSOOPERS" */
function normalizeChainKey(raw: string): string {
  const upper = raw.toUpperCase().replace(/[^A-Z]/g, '');
  // Direct match
  if (KROGER_BANNERS[upper]) return upper;
  // Try known prefixes
  for (const key of Object.keys(KROGER_BANNERS)) {
    if (upper.startsWith(key) || key.startsWith(upper)) return key;
  }
  return upper;
}

async function findNearestKrogerLocation(token: string, lat: number, lng: number): Promise<KrogerLocation | null> {
  try {
    const res = await fetch(
      `https://api.kroger.com/v1/locations?filter.latLong.near=${lat},${lng}&filter.limit=1`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const json = await res.json() as { data: any[] };
    const loc = json.data?.[0];
    if (!loc) return null;
    const rawChain = loc.chain || loc.name || 'Kroger';
    // Normalize chain to match KROGER_BANNERS keys (e.g., "MARIANO'S" → "MARIANOS")
    const chain = normalizeChainKey(rawChain);
    console.log(`[Kroger] Location found: raw chain="${rawChain}" → normalized="${chain}", id=${loc.locationId}`);
    return {
      locationId: loc.locationId,
      chain,
      address: [loc.address?.addressLine1, loc.address?.city, loc.address?.state].filter(Boolean).join(', '),
      lat: loc.geolocation?.latitude ?? lat,
      lng: loc.geolocation?.longitude ?? lng,
    };
  } catch (err) {
    console.error('Kroger location error:', err);
    return null;
  }
}

export async function getKrogerPrices(query: string, locationId?: string, chain?: string): Promise<StorePrice[] | null> {
  const token = await getKrogerToken();
  if (!token) return null;

  try {
    // Fetch multiple products to find the best price (not just the first result)
    let url = `https://api.kroger.com/v1/products?filter.term=${encodeURIComponent(query)}&filter.limit=5`;
    if (locationId) url += `&filter.locationId=${locationId}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json() as { data: any[] };
    if (!json.data || json.data.length === 0) return null;

    // Find the cheapest product (prefer promo/sale items)
    let bestProduct = json.data[0];
    let bestPrice = Infinity;
    for (const p of json.data) {
      const pi = p.items?.[0]?.price;
      if (!pi) continue;
      const price = pi.promo || pi.regular || Infinity;
      if (price > 0 && price < bestPrice) {
        bestPrice = price;
        bestProduct = p;
      }
    }

    const product = bestProduct;
    const priceInfo = product.items?.[0]?.price;
    const regularPrice = priceInfo?.regular || 0;
    const promoPrice = priceInfo?.promo || null;
    const displayPrice = promoPrice || regularPrice;
    if (displayPrice === 0) return null;

    console.log(`[Kroger price] "${query}" → $${displayPrice} (regular: $${regularPrice}, promo: ${promoPrice ?? 'none'}, size: ${product.items?.[0]?.size || 'each'})`);

    const frontImage = product.images?.find((img: any) => img.perspective === 'front');
    const thumbnail = frontImage?.sizes?.find((s: any) => s.size === 'thumbnail');
    const imageUrl = thumbnail?.url || frontImage?.sizes?.[0]?.url || undefined;

    const fulfillment = product.items?.[0]?.fulfillment;
    const fulfillmentTypes: string[] = [];
    let inStock = true;
    if (fulfillment) {
      if (fulfillment.inStore) fulfillmentTypes.push('inStore');
      if (fulfillment.delivery) fulfillmentTypes.push('delivery');
      if (fulfillment.shipToHome) fulfillmentTypes.push('shipToHome');
      if (fulfillment.curbside) fulfillmentTypes.push('pickup');
      inStock = fulfillmentTypes.length > 0;
    }

    const onSale = promoPrice != null && promoPrice < regularPrice;
    const saleSavings = onSale ? round(regularPrice - promoPrice!) : undefined;

    const banner = getBannerInfo(chain || 'KROGER');
    const size = product.items?.[0]?.size || 'each';

    // Fire-and-forget price history recording
    if (locationId) {
      recordPriceHistory(query, banner.name, displayPrice, promoPrice, locationId).catch(() => {});
    }

    return [{
      store: banner.name,
      price: round(displayPrice),
      unit: size,
      deepLink: banner.searchUrl(encodeURIComponent(query)),
      logoColor: STORES.kroger.logoColor,
      imageUrl,
      regularPrice: regularPrice > 0 ? round(regularPrice) : undefined,
      promoPrice: promoPrice ? round(promoPrice) : undefined,
      onSale,
      saleSavings,
      inStock,
      fulfillmentTypes: fulfillmentTypes.length > 0 ? fulfillmentTypes : undefined,
      krogerProductId: product.productId || product.upc || undefined,
    }];
  } catch (err) {
    console.error('Kroger API error:', err);
    return null;
  }
}

export async function enrichWithKrogerPrices(
  results: PriceResult[],
  lat: number,
  lng: number,
): Promise<PriceResult[]> {
  try {
    const token = await getKrogerToken();
    if (!token) return results;

    const location = await findNearestKrogerLocation(token, lat, lng);
    if (!location) return results;

    const banner = getBannerInfo(location.chain);
    console.log(`Kroger: using ${location.chain} (${banner.name}) store ${location.locationId} at ${location.address}`);

    const enriched = await Promise.all(
      results.map(async (result) => {
        try {
          const krogerPrices = await getKrogerPrices(result.item, location.locationId, location.chain);
          if (!krogerPrices || krogerPrices.length === 0) {
            // No live price found — rename mock "Kroger" entry to banner name so it matches storeTotals key
            const newStores = result.stores.map((s) =>
              s.store === 'Kroger' ? { ...s, store: banner.name } : s,
            );
            return { ...result, stores: newStores };
          }

          const realKroger = krogerPrices[0];
          const newStores = result.stores.map((s) =>
            s.store === 'Kroger' ? { ...realKroger } : s,
          );

          const sorted = [...newStores].sort((a, b) => a.price - b.price);
          const bestPrice = sorted[0];
          const worstPrice = sorted[sorted.length - 1];
          const savings = round(worstPrice.price - bestPrice.price);

          return { ...result, stores: newStores, bestPrice, savings };
        } catch {
          // Rename on error too
          const newStores = result.stores.map((s) =>
            s.store === 'Kroger' ? { ...s, store: banner.name } : s,
          );
          return { ...result, stores: newStores };
        }
      }),
    );

    return enriched;
  } catch (err) {
    console.error('Kroger enrichment error:', err);
    return results;
  }
}

// ─── Kroger Product Search ───────────────────────────────────────────────

export interface KrogerProductResult {
  krogerProductId: string;
  name: string;
  brand: string;
  size: string;
  price: number;
  regularPrice?: number;
  promoPrice?: number;
  onSale?: boolean;
  saleSavings?: number;
  imageUrl?: string;
  inStock?: boolean;
}

const _searchCache: Map<string, { data: KrogerProductResult[]; ts: number }> = new Map();
const SEARCH_CACHE_TTL = 10 * 60 * 1000;

const _locationCache: Map<string, { data: KrogerLocation; ts: number }> = new Map();
const LOCATION_CACHE_TTL = 60 * 60 * 1000;

export async function findNearestKrogerLocationCached(lat: number, lng: number): Promise<KrogerLocation | null> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = _locationCache.get(key);
  if (cached && Date.now() - cached.ts < LOCATION_CACHE_TTL) return cached.data;

  const token = await getKrogerToken();
  if (!token) return null;
  const loc = await findNearestKrogerLocation(token, lat, lng);
  if (loc) _locationCache.set(key, { data: loc, ts: Date.now() });
  return loc;
}

export async function searchKrogerProducts(query: string, locationId: string, limit = 5): Promise<KrogerProductResult[]> {
  const cacheKey = `${query.toLowerCase()}|${locationId}|${limit}`;
  const cached = _searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < SEARCH_CACHE_TTL) return cached.data;

  const token = await getKrogerToken();
  if (!token) return [];

  try {
    const url = `https://api.kroger.com/v1/products?filter.term=${encodeURIComponent(query)}&filter.locationId=${locationId}&filter.limit=${limit}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json() as { data: any[] };

    const results: KrogerProductResult[] = (json.data || []).map((product: any) => {
      const priceInfo = product.items?.[0]?.price;
      const regular = priceInfo?.regular || 0;
      const promo = priceInfo?.promo || null;
      const onSale = promo != null && promo < regular;

      const frontImage = product.images?.find((img: any) => img.perspective === 'front');
      const thumbnail = frontImage?.sizes?.find((s: any) => s.size === 'thumbnail');
      const imageUrl = thumbnail?.url || frontImage?.sizes?.[0]?.url || undefined;

      const fulfillment = product.items?.[0]?.fulfillment;
      const inStock = fulfillment ? (fulfillment.inStore || fulfillment.delivery || fulfillment.curbside) : undefined;

      return {
        krogerProductId: product.productId || product.upc || '',
        name: product.description || '',
        brand: product.brand || '',
        size: product.items?.[0]?.size || '',
        price: round(promo || regular),
        regularPrice: regular > 0 ? round(regular) : undefined,
        promoPrice: promo ? round(promo) : undefined,
        onSale,
        saleSavings: onSale ? round(regular - promo!) : undefined,
        imageUrl,
        inStock,
      };
    }).filter((p: KrogerProductResult) => p.price > 0);

    _searchCache.set(cacheKey, { data: results, ts: Date.now() });
    return results;
  } catch (err) {
    console.error('Kroger product search error:', err);
    return [];
  }
}

// ─── Price History ────────────────────────────────────────────────────────

export async function recordPriceHistory(
  item: string,
  store: string,
  price: number,
  promoPrice: number | null,
  locationId?: string,
): Promise<void> {
  try {
    await prisma.priceHistory.create({
      data: {
        item: item.toLowerCase().trim(),
        store,
        locationId: locationId || null,
        price,
        promoPrice: promoPrice || null,
      },
    });
  } catch (err) {
    console.error('Price history record error:', err);
  }
}

export async function getPriceHistory(
  item: string,
  days = 30,
): Promise<Array<{ store: string; price: number; promoPrice: number | null; fetchedAt: Date }>> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return prisma.priceHistory.findMany({
    where: {
      item: item.toLowerCase().trim(),
      fetchedAt: { gte: since },
    },
    orderBy: { fetchedAt: 'desc' },
    select: { store: true, price: true, promoPrice: true, fetchedAt: true },
  });
}

export function calculateTrend(
  history: Array<{ price: number; fetchedAt: Date }>,
): { direction: 'up' | 'down' | 'stable'; percentChange: number; avgPrice: number } {
  if (history.length < 2) {
    const avg = history.length === 1 ? history[0].price : 0;
    return { direction: 'stable', percentChange: 0, avgPrice: round(avg) };
  }

  const sorted = [...history].sort((a, b) => a.fetchedAt.getTime() - b.fetchedAt.getTime());
  const mid = Math.floor(sorted.length / 2);
  const olderHalf = sorted.slice(0, mid);
  const recentHalf = sorted.slice(mid);

  const olderAvg = olderHalf.reduce((s, h) => s + h.price, 0) / olderHalf.length;
  const recentAvg = recentHalf.reduce((s, h) => s + h.price, 0) / recentHalf.length;
  const totalAvg = sorted.reduce((s, h) => s + h.price, 0) / sorted.length;

  const pctChange = olderAvg > 0 ? round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;
  const direction = pctChange > 2 ? 'up' : pctChange < -2 ? 'down' : 'stable';

  return { direction, percentChange: Math.abs(pctChange), avgPrice: round(totalAvg) };
}

// ─── Sale Items / Deals ──────────────────────────────────────────────────

const _saleCache: Map<string, { data: KrogerProductResult[]; ts: number }> = new Map();
const SALE_CACHE_TTL = 4 * 60 * 60 * 1000;

const DEAL_SEARCH_TERMS = ['produce', 'chicken', 'beef', 'milk', 'eggs', 'bread', 'cheese', 'pasta', 'rice', 'yogurt'];

export async function getKrogerSaleItems(locationId: string, limit = 20): Promise<KrogerProductResult[]> {
  const cached = _saleCache.get(locationId);
  if (cached && Date.now() - cached.ts < SALE_CACHE_TTL) return cached.data.slice(0, limit);

  const token = await getKrogerToken();
  if (!token) return [];

  const allDeals: KrogerProductResult[] = [];
  const seen = new Set<string>();

  for (const term of DEAL_SEARCH_TERMS) {
    if (allDeals.length >= limit * 2) break;
    try {
      const url = `https://api.kroger.com/v1/products?filter.term=${encodeURIComponent(term)}&filter.locationId=${locationId}&filter.limit=5`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!res.ok) continue;
      const json = await res.json() as { data: any[] };

      for (const product of json.data || []) {
        const priceInfo = product.items?.[0]?.price;
        const regular = priceInfo?.regular || 0;
        const promo = priceInfo?.promo || null;
        if (!promo || promo >= regular || regular === 0) continue;

        const id = product.productId || product.upc || product.description;
        if (seen.has(id)) continue;
        seen.add(id);

        const frontImage = product.images?.find((img: any) => img.perspective === 'front');
        const thumbnail = frontImage?.sizes?.find((s: any) => s.size === 'thumbnail');

        allDeals.push({
          krogerProductId: id,
          name: product.description || '',
          brand: product.brand || '',
          size: product.items?.[0]?.size || '',
          price: round(promo),
          regularPrice: round(regular),
          promoPrice: round(promo),
          onSale: true,
          saleSavings: round(regular - promo),
          imageUrl: thumbnail?.url || frontImage?.sizes?.[0]?.url || undefined,
          inStock: true,
        });
      }
    } catch {
      // Continue with next category
    }
  }

  allDeals.sort((a, b) => (b.saleSavings || 0) - (a.saleSavings || 0));
  _saleCache.set(locationId, { data: allDeals, ts: Date.now() });
  return allDeals.slice(0, limit);
}

// ─── Goal-Aware Scoring Helpers ────────────────────────────────────────

export const GOAL_BOOST_KEYWORDS: Record<string, string[]> = {
  'high-protein': ['protein', 'greek', 'fairlife', 'chicken breast', 'eggs', 'egg', 'turkey', 'salmon', 'tuna', 'tofu', 'cottage cheese', 'whey', 'jerky', 'cottage', 'lean', '93/7', '93%', '90/10', '90%', '96/4', '96%', 'sirloin', 'tenderloin', 'pork loin', 'shrimp', 'tilapia', 'cod'],
  'protein': ['protein', 'greek', 'fairlife', 'chicken breast', 'eggs', 'egg', 'turkey', 'salmon', 'tuna', 'tofu', 'cottage cheese', 'whey', 'jerky', 'cottage', 'lean', '93/7', '93%', '90/10', '90%', '96/4', '96%', 'sirloin', 'tenderloin', 'pork loin', 'shrimp', 'tilapia', 'cod'],
  'low-carb': ['cauliflower', 'almond flour', 'coconut flour', 'sugar-free', 'keto', 'zucchini noodle', 'coconut', 'avocado', 'cheese', 'butter'],
  'keto': ['cauliflower', 'almond flour', 'coconut flour', 'sugar-free', 'keto', 'coconut', 'avocado', 'butter', 'cream cheese', 'bacon'],
  'low-calorie': ['light', 'low-fat', 'skim', 'lean', 'turkey', 'spinach', 'broccoli', 'zucchini'],
  'weight-loss': ['light', 'low-fat', 'lean', 'turkey', 'spinach', 'broccoli', 'cauliflower'],
};

export function goalBoostScore(productName: string, goalTypes: string[]): number {
  const lower = productName.toLowerCase();
  for (const goal of goalTypes) {
    const keywords = GOAL_BOOST_KEYWORDS[goal.toLowerCase()];
    if (keywords && keywords.some(kw => lower.includes(kw))) {
      return 15;
    }
  }
  return 0;
}

export function parseSizeToOz(size: string | undefined): number {
  if (!size) return 0;
  const s = size.toLowerCase().trim();

  let m = s.match(/([\d.]+)\s*(?:lb|lbs|pound|pounds)/);
  if (m) return parseFloat(m[1]) * 16;

  m = s.match(/([\d.]+)\s*(?:gal|gallon|gallons)/);
  if (m) return parseFloat(m[1]) * 128;

  m = s.match(/([\d.]+)\s*(?:qt|quart|quarts)/);
  if (m) return parseFloat(m[1]) * 32;

  m = s.match(/([\d.]+)\s*(?:fl\s*oz|oz|ounce|ounces)/);
  if (m) return parseFloat(m[1]);

  m = s.match(/([\d.]+)\s*(?:kg|kilogram)/);
  if (m) return parseFloat(m[1]) * 35.274;

  m = s.match(/([\d.]+)\s*g\b/);
  if (m) return parseFloat(m[1]) / 28.3495;

  return 0;
}

export function priceValueBonus(price: number | undefined, size: string | undefined): number {
  if (!price || price <= 0) return 0;
  const oz = parseSizeToOz(size);
  if (oz <= 0) return 0;
  const pricePerOz = price / oz;
  if (pricePerOz >= 1) return 0;
  return Math.round(Math.max(0, 8 - pricePerOz * 16));
}

// ─── Kroger User OAuth (Cart Integration) ────────────────────────────────

export function getKrogerAuthUrl(state?: string): string | null {
  const clientId = process.env.KROGER_CLIENT_ID;
  if (!clientId) return null;
  const redirectUri = process.env.KROGER_REDIRECT_URI || 'http://localhost:3001/api/kroger/callback';
  const scope = 'cart.basic:write profile.compact';
  let url = `https://api.kroger.com/v1/connect/oauth2/authorize?scope=${encodeURIComponent(scope)}&response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  if (state) url += `&state=${encodeURIComponent(state)}`;
  return url;
}

export async function exchangeKrogerAuthCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  const clientId = process.env.KROGER_CLIENT_ID;
  const clientSecret = process.env.KROGER_CLIENT_SECRET;
  const redirectUri = process.env.KROGER_REDIRECT_URI || 'http://localhost:3001/api/kroger/callback';
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch('https://api.kroger.com/v1/connect/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
    });
    if (!res.ok) return null;
    const json = await res.json() as any;
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in,
    };
  } catch (err) {
    console.error('Kroger auth code exchange error:', err);
    return null;
  }
}

export async function refreshKrogerUserToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  const clientId = process.env.KROGER_CLIENT_ID;
  const clientSecret = process.env.KROGER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch('https://api.kroger.com/v1/connect/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    });
    if (!res.ok) return null;
    const json = await res.json() as any;
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in,
    };
  } catch (err) {
    console.error('Kroger token refresh error:', err);
    return null;
  }
}

export async function addToKrogerCart(
  accessToken: string,
  items: Array<{ upc: string; quantity: number }>,
): Promise<boolean> {
  try {
    const res = await fetch('https://api.kroger.com/v1/cart/add', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ items }),
    });
    return res.ok;
  } catch (err) {
    console.error('Kroger add to cart error:', err);
    return false;
  }
}
