/**
 * Grocery Price Comparison Service
 * Uses mock data for now. When Kroger/Walmart APIs are available,
 * swap the implementation in getPricesForItem().
 */

interface StorePrice {
  store: string;
  price: number;
  unit: string;
  deepLink: string;
}

interface PriceResult {
  item: string;
  stores: StorePrice[];
  bestPrice: StorePrice;
}

// Mock price data for common grocery items
const MOCK_PRICES: Record<string, StorePrice[]> = {
  'chicken breast': [
    { store: 'Kroger', price: 3.99, unit: 'lb', deepLink: 'kroger://search?query=chicken+breast' },
    { store: 'Walmart', price: 3.49, unit: 'lb', deepLink: 'https://www.walmart.com/search?q=chicken+breast' },
    { store: 'Meijer', price: 4.29, unit: 'lb', deepLink: 'https://www.meijer.com/shopping/search.html?text=chicken+breast' },
  ],
  'ground beef': [
    { store: 'Kroger', price: 5.49, unit: 'lb', deepLink: 'kroger://search?query=ground+beef' },
    { store: 'Walmart', price: 4.97, unit: 'lb', deepLink: 'https://www.walmart.com/search?q=ground+beef' },
    { store: 'Meijer', price: 5.79, unit: 'lb', deepLink: 'https://www.meijer.com/shopping/search.html?text=ground+beef' },
  ],
  'milk': [
    { store: 'Kroger', price: 3.29, unit: 'gal', deepLink: 'kroger://search?query=milk' },
    { store: 'Walmart', price: 2.98, unit: 'gal', deepLink: 'https://www.walmart.com/search?q=milk' },
    { store: 'Meijer', price: 3.49, unit: 'gal', deepLink: 'https://www.meijer.com/shopping/search.html?text=milk' },
  ],
  'eggs': [
    { store: 'Kroger', price: 3.49, unit: 'doz', deepLink: 'kroger://search?query=eggs' },
    { store: 'Walmart', price: 2.98, unit: 'doz', deepLink: 'https://www.walmart.com/search?q=eggs' },
    { store: 'Meijer', price: 3.79, unit: 'doz', deepLink: 'https://www.meijer.com/shopping/search.html?text=eggs' },
  ],
  'rice': [
    { store: 'Kroger', price: 2.49, unit: 'lb', deepLink: 'kroger://search?query=rice' },
    { store: 'Walmart', price: 1.98, unit: 'lb', deepLink: 'https://www.walmart.com/search?q=rice' },
    { store: 'Meijer', price: 2.69, unit: 'lb', deepLink: 'https://www.meijer.com/shopping/search.html?text=rice' },
  ],
  'bread': [
    { store: 'Kroger', price: 2.99, unit: 'loaf', deepLink: 'kroger://search?query=bread' },
    { store: 'Walmart', price: 2.48, unit: 'loaf', deepLink: 'https://www.walmart.com/search?q=bread' },
    { store: 'Meijer', price: 3.19, unit: 'loaf', deepLink: 'https://www.meijer.com/shopping/search.html?text=bread' },
  ],
  'butter': [
    { store: 'Kroger', price: 4.49, unit: 'lb', deepLink: 'kroger://search?query=butter' },
    { store: 'Walmart', price: 3.98, unit: 'lb', deepLink: 'https://www.walmart.com/search?q=butter' },
    { store: 'Meijer', price: 4.79, unit: 'lb', deepLink: 'https://www.meijer.com/shopping/search.html?text=butter' },
  ],
  'cheese': [
    { store: 'Kroger', price: 3.99, unit: 'block', deepLink: 'kroger://search?query=cheese' },
    { store: 'Walmart', price: 3.48, unit: 'block', deepLink: 'https://www.walmart.com/search?q=cheese' },
    { store: 'Meijer', price: 4.29, unit: 'block', deepLink: 'https://www.meijer.com/shopping/search.html?text=cheese' },
  ],
  'tomato': [
    { store: 'Kroger', price: 1.29, unit: 'each', deepLink: 'kroger://search?query=tomato' },
    { store: 'Walmart', price: 0.98, unit: 'each', deepLink: 'https://www.walmart.com/search?q=tomato' },
    { store: 'Meijer', price: 1.49, unit: 'each', deepLink: 'https://www.meijer.com/shopping/search.html?text=tomato' },
  ],
  'lettuce': [
    { store: 'Kroger', price: 1.99, unit: 'head', deepLink: 'kroger://search?query=lettuce' },
    { store: 'Walmart', price: 1.48, unit: 'head', deepLink: 'https://www.walmart.com/search?q=lettuce' },
    { store: 'Meijer', price: 2.19, unit: 'head', deepLink: 'https://www.meijer.com/shopping/search.html?text=lettuce' },
  ],
  'onion': [
    { store: 'Kroger', price: 0.99, unit: 'each', deepLink: 'kroger://search?query=onion' },
    { store: 'Walmart', price: 0.78, unit: 'each', deepLink: 'https://www.walmart.com/search?q=onion' },
    { store: 'Meijer', price: 1.09, unit: 'each', deepLink: 'https://www.meijer.com/shopping/search.html?text=onion' },
  ],
};

// Generate a reasonable fallback price for items not in our mock DB
function generateFallbackPrice(itemName: string): StorePrice[] {
  const encoded = encodeURIComponent(itemName);
  const basePrice = 2 + Math.abs(hashCode(itemName) % 800) / 100; // $2.00 - $9.99
  return [
    { store: 'Kroger', price: round(basePrice * 1.05), unit: 'each', deepLink: `kroger://search?query=${encoded}` },
    { store: 'Walmart', price: round(basePrice * 0.95), unit: 'each', deepLink: `https://www.walmart.com/search?q=${encoded}` },
    { store: 'Meijer', price: round(basePrice * 1.10), unit: 'each', deepLink: `https://www.meijer.com/shopping/search.html?text=${encoded}` },
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

export function getPricesForItem(itemName: string): PriceResult {
  const key = itemName.toLowerCase().trim();
  // Check exact match first, then partial
  let stores = MOCK_PRICES[key];
  if (!stores) {
    for (const [mockKey, mockStores] of Object.entries(MOCK_PRICES)) {
      if (key.includes(mockKey) || mockKey.includes(key)) {
        stores = mockStores;
        break;
      }
    }
  }
  if (!stores) {
    stores = generateFallbackPrice(itemName);
  }

  const bestPrice = stores.reduce((min, s) => s.price < min.price ? s : min, stores[0]);
  return { item: itemName, stores, bestPrice };
}

export function getPricesForList(items: string[]): { items: PriceResult[]; storeTotals: Record<string, number> } {
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
  return { items: results, storeTotals };
}
