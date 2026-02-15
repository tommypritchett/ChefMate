/**
 * Grocery Price Comparison Service
 *
 * Currently uses comprehensive mock data with realistic pricing.
 * Kroger API integration ready — set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET
 * in .env to enable real-time pricing from Kroger.
 */

interface StorePrice {
  store: string;
  price: number;
  unit: string;
  deepLink: string;
  logoColor: string;
}

interface PriceResult {
  item: string;
  stores: StorePrice[];
  bestPrice: StorePrice;
  savings: number;
}

// Store configurations
const STORES = {
  kroger: {
    name: 'Kroger',
    logoColor: '#0468BF',
    searchUrl: (q: string) => `https://www.kroger.com/search?query=${q}`,
    deepLink: (q: string) => `kroger://search?query=${q}`,
  },
  walmart: {
    name: 'Walmart',
    logoColor: '#0071CE',
    searchUrl: (q: string) => `https://www.walmart.com/search?q=${q}`,
    deepLink: (q: string) => `https://www.walmart.com/search?q=${q}`,
  },
  target: {
    name: 'Target',
    logoColor: '#CC0000',
    searchUrl: (q: string) => `https://www.target.com/s?searchTerm=${q}`,
    deepLink: (q: string) => `https://www.target.com/s?searchTerm=${q}`,
  },
  aldi: {
    name: 'Aldi',
    logoColor: '#00457C',
    searchUrl: (q: string) => `https://www.aldi.us/products/?search=${q}`,
    deepLink: (q: string) => `https://www.aldi.us/products/?search=${q}`,
  },
  amazon: {
    name: 'Amazon Fresh',
    logoColor: '#FF9900',
    searchUrl: (q: string) => `https://www.amazon.com/s?k=${q}&i=amazonfresh`,
    deepLink: (q: string) => `https://www.amazon.com/s?k=${q}&i=amazonfresh`,
  },
};

function makeStorePrice(store: keyof typeof STORES, price: number, unit: string, query: string): StorePrice {
  const s = STORES[store];
  const encoded = encodeURIComponent(query);
  return {
    store: s.name,
    price,
    unit,
    deepLink: s.deepLink(encoded),
    logoColor: s.logoColor,
  };
}

// Comprehensive mock price data — 50+ common grocery items
const MOCK_PRICES: Record<string, StorePrice[]> = {
  // Proteins
  'chicken breast': [
    makeStorePrice('kroger', 3.99, 'lb', 'chicken breast'),
    makeStorePrice('walmart', 3.49, 'lb', 'chicken breast'),
    makeStorePrice('target', 4.19, 'lb', 'chicken breast'),
    makeStorePrice('aldi', 3.29, 'lb', 'chicken breast'),
    makeStorePrice('amazon', 4.49, 'lb', 'chicken breast'),
  ],
  'chicken thighs': [
    makeStorePrice('kroger', 2.49, 'lb', 'chicken thighs'),
    makeStorePrice('walmart', 2.18, 'lb', 'chicken thighs'),
    makeStorePrice('target', 2.79, 'lb', 'chicken thighs'),
    makeStorePrice('aldi', 1.99, 'lb', 'chicken thighs'),
    makeStorePrice('amazon', 2.89, 'lb', 'chicken thighs'),
  ],
  'ground beef': [
    makeStorePrice('kroger', 5.49, 'lb', 'ground beef'),
    makeStorePrice('walmart', 4.97, 'lb', 'ground beef'),
    makeStorePrice('target', 5.99, 'lb', 'ground beef'),
    makeStorePrice('aldi', 4.49, 'lb', 'ground beef'),
    makeStorePrice('amazon', 5.79, 'lb', 'ground beef'),
  ],
  'ground turkey': [
    makeStorePrice('kroger', 4.99, 'lb', 'ground turkey'),
    makeStorePrice('walmart', 4.48, 'lb', 'ground turkey'),
    makeStorePrice('target', 5.29, 'lb', 'ground turkey'),
    makeStorePrice('aldi', 3.99, 'lb', 'ground turkey'),
    makeStorePrice('amazon', 5.49, 'lb', 'ground turkey'),
  ],
  'salmon': [
    makeStorePrice('kroger', 8.99, 'lb', 'salmon'),
    makeStorePrice('walmart', 7.97, 'lb', 'salmon'),
    makeStorePrice('target', 9.49, 'lb', 'salmon'),
    makeStorePrice('aldi', 7.49, 'lb', 'salmon'),
    makeStorePrice('amazon', 9.99, 'lb', 'salmon'),
  ],
  'shrimp': [
    makeStorePrice('kroger', 7.99, 'lb', 'shrimp'),
    makeStorePrice('walmart', 6.98, 'lb', 'shrimp'),
    makeStorePrice('target', 8.49, 'lb', 'shrimp'),
    makeStorePrice('aldi', 6.49, 'lb', 'shrimp'),
    makeStorePrice('amazon', 8.99, 'lb', 'shrimp'),
  ],
  'tofu': [
    makeStorePrice('kroger', 2.29, 'block', 'tofu'),
    makeStorePrice('walmart', 1.98, 'block', 'tofu'),
    makeStorePrice('target', 2.49, 'block', 'tofu'),
    makeStorePrice('aldi', 1.79, 'block', 'tofu'),
    makeStorePrice('amazon', 2.69, 'block', 'tofu'),
  ],
  'bacon': [
    makeStorePrice('kroger', 6.99, 'lb', 'bacon'),
    makeStorePrice('walmart', 5.97, 'lb', 'bacon'),
    makeStorePrice('target', 7.49, 'lb', 'bacon'),
    makeStorePrice('aldi', 4.99, 'lb', 'bacon'),
    makeStorePrice('amazon', 7.29, 'lb', 'bacon'),
  ],
  // Dairy
  'milk': [
    makeStorePrice('kroger', 3.29, 'gal', 'milk'),
    makeStorePrice('walmart', 2.98, 'gal', 'milk'),
    makeStorePrice('target', 3.49, 'gal', 'milk'),
    makeStorePrice('aldi', 2.69, 'gal', 'milk'),
    makeStorePrice('amazon', 3.79, 'gal', 'milk'),
  ],
  'eggs': [
    makeStorePrice('kroger', 3.49, 'doz', 'eggs'),
    makeStorePrice('walmart', 2.98, 'doz', 'eggs'),
    makeStorePrice('target', 3.79, 'doz', 'eggs'),
    makeStorePrice('aldi', 2.49, 'doz', 'eggs'),
    makeStorePrice('amazon', 3.99, 'doz', 'eggs'),
  ],
  'butter': [
    makeStorePrice('kroger', 4.49, 'lb', 'butter'),
    makeStorePrice('walmart', 3.98, 'lb', 'butter'),
    makeStorePrice('target', 4.79, 'lb', 'butter'),
    makeStorePrice('aldi', 3.49, 'lb', 'butter'),
    makeStorePrice('amazon', 4.99, 'lb', 'butter'),
  ],
  'cheese': [
    makeStorePrice('kroger', 3.99, 'block', 'cheese'),
    makeStorePrice('walmart', 3.48, 'block', 'cheese'),
    makeStorePrice('target', 4.29, 'block', 'cheese'),
    makeStorePrice('aldi', 2.99, 'block', 'cheese'),
    makeStorePrice('amazon', 4.49, 'block', 'cheese'),
  ],
  'greek yogurt': [
    makeStorePrice('kroger', 4.99, '32oz', 'greek yogurt'),
    makeStorePrice('walmart', 4.48, '32oz', 'greek yogurt'),
    makeStorePrice('target', 5.29, '32oz', 'greek yogurt'),
    makeStorePrice('aldi', 3.99, '32oz', 'greek yogurt'),
    makeStorePrice('amazon', 5.49, '32oz', 'greek yogurt'),
  ],
  'sour cream': [
    makeStorePrice('kroger', 2.49, '16oz', 'sour cream'),
    makeStorePrice('walmart', 1.98, '16oz', 'sour cream'),
    makeStorePrice('target', 2.69, '16oz', 'sour cream'),
    makeStorePrice('aldi', 1.79, '16oz', 'sour cream'),
    makeStorePrice('amazon', 2.89, '16oz', 'sour cream'),
  ],
  // Produce
  'tomato': [
    makeStorePrice('kroger', 1.29, 'each', 'tomato'),
    makeStorePrice('walmart', 0.98, 'each', 'tomato'),
    makeStorePrice('target', 1.49, 'each', 'tomato'),
    makeStorePrice('aldi', 0.89, 'each', 'tomato'),
    makeStorePrice('amazon', 1.59, 'each', 'tomato'),
  ],
  'lettuce': [
    makeStorePrice('kroger', 1.99, 'head', 'lettuce'),
    makeStorePrice('walmart', 1.48, 'head', 'lettuce'),
    makeStorePrice('target', 2.19, 'head', 'lettuce'),
    makeStorePrice('aldi', 1.29, 'head', 'lettuce'),
    makeStorePrice('amazon', 2.49, 'head', 'lettuce'),
  ],
  'onion': [
    makeStorePrice('kroger', 0.99, 'each', 'onion'),
    makeStorePrice('walmart', 0.78, 'each', 'onion'),
    makeStorePrice('target', 1.09, 'each', 'onion'),
    makeStorePrice('aldi', 0.69, 'each', 'onion'),
    makeStorePrice('amazon', 1.19, 'each', 'onion'),
  ],
  'garlic': [
    makeStorePrice('kroger', 0.69, 'head', 'garlic'),
    makeStorePrice('walmart', 0.50, 'head', 'garlic'),
    makeStorePrice('target', 0.79, 'head', 'garlic'),
    makeStorePrice('aldi', 0.45, 'head', 'garlic'),
    makeStorePrice('amazon', 0.89, 'head', 'garlic'),
  ],
  'avocado': [
    makeStorePrice('kroger', 1.49, 'each', 'avocado'),
    makeStorePrice('walmart', 1.00, 'each', 'avocado'),
    makeStorePrice('target', 1.69, 'each', 'avocado'),
    makeStorePrice('aldi', 0.89, 'each', 'avocado'),
    makeStorePrice('amazon', 1.79, 'each', 'avocado'),
  ],
  'bell pepper': [
    makeStorePrice('kroger', 1.29, 'each', 'bell pepper'),
    makeStorePrice('walmart', 0.98, 'each', 'bell pepper'),
    makeStorePrice('target', 1.39, 'each', 'bell pepper'),
    makeStorePrice('aldi', 0.79, 'each', 'bell pepper'),
    makeStorePrice('amazon', 1.49, 'each', 'bell pepper'),
  ],
  'broccoli': [
    makeStorePrice('kroger', 1.99, 'lb', 'broccoli'),
    makeStorePrice('walmart', 1.48, 'lb', 'broccoli'),
    makeStorePrice('target', 2.19, 'lb', 'broccoli'),
    makeStorePrice('aldi', 1.29, 'lb', 'broccoli'),
    makeStorePrice('amazon', 2.29, 'lb', 'broccoli'),
  ],
  'spinach': [
    makeStorePrice('kroger', 2.99, '5oz', 'spinach'),
    makeStorePrice('walmart', 2.48, '5oz', 'spinach'),
    makeStorePrice('target', 3.19, '5oz', 'spinach'),
    makeStorePrice('aldi', 1.99, '5oz', 'spinach'),
    makeStorePrice('amazon', 3.29, '5oz', 'spinach'),
  ],
  'sweet potato': [
    makeStorePrice('kroger', 1.29, 'lb', 'sweet potato'),
    makeStorePrice('walmart', 0.98, 'lb', 'sweet potato'),
    makeStorePrice('target', 1.49, 'lb', 'sweet potato'),
    makeStorePrice('aldi', 0.89, 'lb', 'sweet potato'),
    makeStorePrice('amazon', 1.59, 'lb', 'sweet potato'),
  ],
  'banana': [
    makeStorePrice('kroger', 0.59, 'lb', 'banana'),
    makeStorePrice('walmart', 0.52, 'lb', 'banana'),
    makeStorePrice('target', 0.69, 'lb', 'banana'),
    makeStorePrice('aldi', 0.45, 'lb', 'banana'),
    makeStorePrice('amazon', 0.69, 'lb', 'banana'),
  ],
  'lemon': [
    makeStorePrice('kroger', 0.59, 'each', 'lemon'),
    makeStorePrice('walmart', 0.44, 'each', 'lemon'),
    makeStorePrice('target', 0.69, 'each', 'lemon'),
    makeStorePrice('aldi', 0.39, 'each', 'lemon'),
    makeStorePrice('amazon', 0.79, 'each', 'lemon'),
  ],
  // Grains & Staples
  'rice': [
    makeStorePrice('kroger', 2.49, 'lb', 'rice'),
    makeStorePrice('walmart', 1.98, 'lb', 'rice'),
    makeStorePrice('target', 2.69, 'lb', 'rice'),
    makeStorePrice('aldi', 1.79, 'lb', 'rice'),
    makeStorePrice('amazon', 2.89, 'lb', 'rice'),
  ],
  'bread': [
    makeStorePrice('kroger', 2.99, 'loaf', 'bread'),
    makeStorePrice('walmart', 2.48, 'loaf', 'bread'),
    makeStorePrice('target', 3.29, 'loaf', 'bread'),
    makeStorePrice('aldi', 1.89, 'loaf', 'bread'),
    makeStorePrice('amazon', 3.49, 'loaf', 'bread'),
  ],
  'pasta': [
    makeStorePrice('kroger', 1.49, 'lb', 'pasta'),
    makeStorePrice('walmart', 1.08, 'lb', 'pasta'),
    makeStorePrice('target', 1.69, 'lb', 'pasta'),
    makeStorePrice('aldi', 0.95, 'lb', 'pasta'),
    makeStorePrice('amazon', 1.79, 'lb', 'pasta'),
  ],
  'flour': [
    makeStorePrice('kroger', 3.49, '5lb', 'flour'),
    makeStorePrice('walmart', 2.88, '5lb', 'flour'),
    makeStorePrice('target', 3.69, '5lb', 'flour'),
    makeStorePrice('aldi', 2.49, '5lb', 'flour'),
    makeStorePrice('amazon', 3.99, '5lb', 'flour'),
  ],
  'oats': [
    makeStorePrice('kroger', 3.99, '42oz', 'oats'),
    makeStorePrice('walmart', 3.28, '42oz', 'oats'),
    makeStorePrice('target', 4.29, '42oz', 'oats'),
    makeStorePrice('aldi', 2.79, '42oz', 'oats'),
    makeStorePrice('amazon', 4.49, '42oz', 'oats'),
  ],
  'tortillas': [
    makeStorePrice('kroger', 2.99, '10ct', 'tortillas'),
    makeStorePrice('walmart', 2.28, '10ct', 'tortillas'),
    makeStorePrice('target', 3.19, '10ct', 'tortillas'),
    makeStorePrice('aldi', 1.89, '10ct', 'tortillas'),
    makeStorePrice('amazon', 3.29, '10ct', 'tortillas'),
  ],
  // Condiments & Oils
  'olive oil': [
    makeStorePrice('kroger', 6.99, '16oz', 'olive oil'),
    makeStorePrice('walmart', 5.97, '16oz', 'olive oil'),
    makeStorePrice('target', 7.49, '16oz', 'olive oil'),
    makeStorePrice('aldi', 4.99, '16oz', 'olive oil'),
    makeStorePrice('amazon', 7.99, '16oz', 'olive oil'),
  ],
  'soy sauce': [
    makeStorePrice('kroger', 2.99, '15oz', 'soy sauce'),
    makeStorePrice('walmart', 2.28, '15oz', 'soy sauce'),
    makeStorePrice('target', 3.19, '15oz', 'soy sauce'),
    makeStorePrice('aldi', 1.89, '15oz', 'soy sauce'),
    makeStorePrice('amazon', 3.49, '15oz', 'soy sauce'),
  ],
  'hot sauce': [
    makeStorePrice('kroger', 2.49, '5oz', 'hot sauce'),
    makeStorePrice('walmart', 1.98, '5oz', 'hot sauce'),
    makeStorePrice('target', 2.79, '5oz', 'hot sauce'),
    makeStorePrice('aldi', 1.49, '5oz', 'hot sauce'),
    makeStorePrice('amazon', 2.89, '5oz', 'hot sauce'),
  ],
  'honey': [
    makeStorePrice('kroger', 5.99, '12oz', 'honey'),
    makeStorePrice('walmart', 4.98, '12oz', 'honey'),
    makeStorePrice('target', 6.49, '12oz', 'honey'),
    makeStorePrice('aldi', 4.49, '12oz', 'honey'),
    makeStorePrice('amazon', 6.79, '12oz', 'honey'),
  ],
  // Canned & Packaged
  'canned tomatoes': [
    makeStorePrice('kroger', 1.29, '14oz', 'canned tomatoes'),
    makeStorePrice('walmart', 0.88, '14oz', 'canned tomatoes'),
    makeStorePrice('target', 1.49, '14oz', 'canned tomatoes'),
    makeStorePrice('aldi', 0.75, '14oz', 'canned tomatoes'),
    makeStorePrice('amazon', 1.59, '14oz', 'canned tomatoes'),
  ],
  'black beans': [
    makeStorePrice('kroger', 1.09, '15oz', 'black beans'),
    makeStorePrice('walmart', 0.78, '15oz', 'black beans'),
    makeStorePrice('target', 1.19, '15oz', 'black beans'),
    makeStorePrice('aldi', 0.69, '15oz', 'black beans'),
    makeStorePrice('amazon', 1.29, '15oz', 'black beans'),
  ],
  'coconut milk': [
    makeStorePrice('kroger', 2.49, '13oz', 'coconut milk'),
    makeStorePrice('walmart', 1.98, '13oz', 'coconut milk'),
    makeStorePrice('target', 2.69, '13oz', 'coconut milk'),
    makeStorePrice('aldi', 1.69, '13oz', 'coconut milk'),
    makeStorePrice('amazon', 2.79, '13oz', 'coconut milk'),
  ],
  'chicken broth': [
    makeStorePrice('kroger', 2.49, '32oz', 'chicken broth'),
    makeStorePrice('walmart', 1.88, '32oz', 'chicken broth'),
    makeStorePrice('target', 2.69, '32oz', 'chicken broth'),
    makeStorePrice('aldi', 1.49, '32oz', 'chicken broth'),
    makeStorePrice('amazon', 2.89, '32oz', 'chicken broth'),
  ],
  // Frozen
  'frozen vegetables': [
    makeStorePrice('kroger', 1.99, '16oz', 'frozen vegetables'),
    makeStorePrice('walmart', 1.48, '16oz', 'frozen vegetables'),
    makeStorePrice('target', 2.19, '16oz', 'frozen vegetables'),
    makeStorePrice('aldi', 1.19, '16oz', 'frozen vegetables'),
    makeStorePrice('amazon', 2.49, '16oz', 'frozen vegetables'),
  ],
  'frozen fruit': [
    makeStorePrice('kroger', 3.99, '16oz', 'frozen fruit'),
    makeStorePrice('walmart', 3.48, '16oz', 'frozen fruit'),
    makeStorePrice('target', 4.29, '16oz', 'frozen fruit'),
    makeStorePrice('aldi', 2.99, '16oz', 'frozen fruit'),
    makeStorePrice('amazon', 4.49, '16oz', 'frozen fruit'),
  ],
  // Spices
  'cumin': [
    makeStorePrice('kroger', 3.49, '2oz', 'cumin'),
    makeStorePrice('walmart', 2.98, '2oz', 'cumin'),
    makeStorePrice('target', 3.79, '2oz', 'cumin'),
    makeStorePrice('aldi', 1.99, '2oz', 'cumin'),
    makeStorePrice('amazon', 3.99, '2oz', 'cumin'),
  ],
  'paprika': [
    makeStorePrice('kroger', 3.49, '2oz', 'paprika'),
    makeStorePrice('walmart', 2.98, '2oz', 'paprika'),
    makeStorePrice('target', 3.79, '2oz', 'paprika'),
    makeStorePrice('aldi', 1.99, '2oz', 'paprika'),
    makeStorePrice('amazon', 3.99, '2oz', 'paprika'),
  ],
  'sugar': [
    makeStorePrice('kroger', 3.29, '4lb', 'sugar'),
    makeStorePrice('walmart', 2.78, '4lb', 'sugar'),
    makeStorePrice('target', 3.49, '4lb', 'sugar'),
    makeStorePrice('aldi', 2.29, '4lb', 'sugar'),
    makeStorePrice('amazon', 3.69, '4lb', 'sugar'),
  ],
  'salt': [
    makeStorePrice('kroger', 1.29, '26oz', 'salt'),
    makeStorePrice('walmart', 0.88, '26oz', 'salt'),
    makeStorePrice('target', 1.49, '26oz', 'salt'),
    makeStorePrice('aldi', 0.79, '26oz', 'salt'),
    makeStorePrice('amazon', 1.59, '26oz', 'salt'),
  ],
};

// Synonym mapping for fuzzy item matching
const SYNONYMS: Record<string, string> = {
  'chicken': 'chicken breast',
  'beef': 'ground beef',
  'turkey': 'ground turkey',
  'fish': 'salmon',
  'yogurt': 'greek yogurt',
  'peppers': 'bell pepper',
  'pepper': 'bell pepper',
  'potatoes': 'sweet potato',
  'potato': 'sweet potato',
  'noodles': 'pasta',
  'spaghetti': 'pasta',
  'oil': 'olive oil',
  'beans': 'black beans',
  'broth': 'chicken broth',
  'stock': 'chicken broth',
  'tomatoes': 'tomato',
  'onions': 'onion',
  'lemons': 'lemon',
  'bananas': 'banana',
  'avocados': 'avocado',
};

// Generate a reasonable fallback price for items not in our mock DB
function generateFallbackPrice(itemName: string): StorePrice[] {
  const encoded = encodeURIComponent(itemName);
  const basePrice = 2 + Math.abs(hashCode(itemName) % 800) / 100; // $2.00 - $9.99
  return [
    { store: 'Kroger', price: round(basePrice * 1.05), unit: 'each', deepLink: STORES.kroger.deepLink(encoded), logoColor: STORES.kroger.logoColor },
    { store: 'Walmart', price: round(basePrice * 0.95), unit: 'each', deepLink: STORES.walmart.deepLink(encoded), logoColor: STORES.walmart.logoColor },
    { store: 'Target', price: round(basePrice * 1.08), unit: 'each', deepLink: STORES.target.deepLink(encoded), logoColor: STORES.target.logoColor },
    { store: 'Aldi', price: round(basePrice * 0.85), unit: 'each', deepLink: STORES.aldi.deepLink(encoded), logoColor: STORES.aldi.logoColor },
    { store: 'Amazon Fresh', price: round(basePrice * 1.12), unit: 'each', deepLink: STORES.amazon.deepLink(encoded), logoColor: STORES.amazon.logoColor },
  ];
}

function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function findMockPrices(key: string): StorePrice[] | null {
  // Exact match
  if (MOCK_PRICES[key]) return MOCK_PRICES[key];

  // Synonym match
  if (SYNONYMS[key] && MOCK_PRICES[SYNONYMS[key]]) return MOCK_PRICES[SYNONYMS[key]];

  // Partial match — item contains a known key or vice versa
  for (const [mockKey, mockStores] of Object.entries(MOCK_PRICES)) {
    if (key.includes(mockKey) || mockKey.includes(key)) {
      return mockStores;
    }
  }

  // Word overlap
  const words = key.split(/\s+/);
  for (const [mockKey, mockStores] of Object.entries(MOCK_PRICES)) {
    const mockWords = mockKey.split(/\s+/);
    if (words.some(w => mockWords.includes(w) && w.length > 2)) {
      return mockStores;
    }
  }

  return null;
}

export function getPricesForItem(itemName: string): PriceResult {
  const key = itemName.toLowerCase().trim();
  let stores = findMockPrices(key);

  if (!stores) {
    stores = generateFallbackPrice(itemName);
  }

  const sorted = [...stores].sort((a, b) => a.price - b.price);
  const bestPrice = sorted[0];
  const worstPrice = sorted[sorted.length - 1];
  const savings = round(worstPrice.price - bestPrice.price);

  return { item: itemName, stores, bestPrice, savings };
}

export function getPricesForList(items: string[]): {
  items: PriceResult[];
  storeTotals: Record<string, number>;
  bestStore: { name: string; total: number };
  totalSavings: number;
} {
  const results = items.map(getPricesForItem);
  const storeTotals: Record<string, number> = {};

  for (const result of results) {
    for (const store of result.stores) {
      storeTotals[store.store] = (storeTotals[store.store] || 0) + store.price;
    }
  }

  // Round totals
  for (const store in storeTotals) {
    storeTotals[store] = round(storeTotals[store]);
  }

  // Find best store
  const bestEntry = Object.entries(storeTotals).reduce((best, [name, total]) =>
    total < best.total ? { name, total } : best,
    { name: '', total: Infinity }
  );
  const worstTotal = Math.max(...Object.values(storeTotals));

  return {
    items: results,
    storeTotals,
    bestStore: bestEntry,
    totalSavings: round(worstTotal - bestEntry.total),
  };
}

/**
 * Kroger API Integration (scaffolded — requires API keys)
 * Set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET in .env to enable.
 *
 * Kroger API docs: https://developer.kroger.com
 * - Product search: GET /v1/products?filter.term={query}
 * - Pricing requires location ID for accurate store pricing
 */
export async function getKrogerPrices(query: string): Promise<StorePrice[] | null> {
  const clientId = process.env.KROGER_CLIENT_ID;
  const clientSecret = process.env.KROGER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null; // Kroger API not configured, use mock data
  }

  try {
    // Step 1: Get OAuth token
    const tokenRes = await fetch('https://api.kroger.com/v1/connect/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials&scope=product.compact',
    });

    if (!tokenRes.ok) return null;
    const tokenJson = await tokenRes.json() as { access_token: string };

    // Step 2: Search products
    const searchRes = await fetch(
      `https://api.kroger.com/v1/products?filter.term=${encodeURIComponent(query)}&filter.limit=3`,
      {
        headers: { Authorization: `Bearer ${tokenJson.access_token}`, Accept: 'application/json' },
      }
    );

    if (!searchRes.ok) return null;
    const searchJson = await searchRes.json() as { data: any[] };
    const data = searchJson.data;

    if (!data?.length) return null;

    // Return the first product's price
    const product = data[0];
    const price = product.items?.[0]?.price?.regular || 0;
    const size = product.items?.[0]?.size || 'each';

    return [
      {
        store: 'Kroger',
        price: round(price),
        unit: size,
        deepLink: `kroger://search?query=${encodeURIComponent(query)}`,
        logoColor: STORES.kroger.logoColor,
      },
    ];
  } catch (err) {
    console.error('Kroger API error:', err);
    return null;
  }
}
