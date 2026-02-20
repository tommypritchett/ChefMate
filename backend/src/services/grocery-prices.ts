/**
 * Grocery Price Comparison Service
 *
 * Currently uses comprehensive mock data with realistic pricing.
 * Kroger API integration ready — set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET
 * in .env to enable real-time pricing from Kroger.
 */

import prisma from '../lib/prisma';

interface StorePrice {
  store: string;
  price: number;
  unit: string;
  deepLink: string;
  logoColor: string;
  imageUrl?: string;
  regularPrice?: number;
  promoPrice?: number;
  onSale?: boolean;
  saleSavings?: number;
  inStock?: boolean;
  fulfillmentTypes?: string[];
}

interface PriceResult {
  item: string;
  stores: StorePrice[];
  bestPrice: StorePrice;
  savings: number;
}

// Store configurations — all use web URLs (works on web + mobile via Linking.openURL)
const STORES = {
  kroger: {
    name: 'Kroger',
    logoColor: '#0468BF',
    homeUrl: 'https://www.kroger.com',
    searchUrl: (q: string) => `https://www.kroger.com/search?query=${q}&searchType=default_search`,
    deepLink: (q: string) => `https://www.kroger.com/search?query=${q}&searchType=default_search`,
  },
  walmart: {
    name: 'Walmart',
    logoColor: '#0071CE',
    homeUrl: 'https://www.walmart.com',
    searchUrl: (q: string) => `https://www.walmart.com/search?q=${q}`,
    deepLink: (q: string) => `https://www.walmart.com/search?q=${q}`,
  },
  target: {
    name: 'Target',
    logoColor: '#CC0000',
    homeUrl: 'https://www.target.com',
    searchUrl: (q: string) => `https://www.target.com/s?searchTerm=${q}`,
    deepLink: (q: string) => `https://www.target.com/s?searchTerm=${q}`,
  },
  aldi: {
    name: 'Aldi',
    logoColor: '#00457C',
    homeUrl: 'https://www.aldi.us',
    searchUrl: (q: string) => `https://www.instacart.com/store/aldi/search_v3/${q}`,
    deepLink: (q: string) => `https://www.instacart.com/store/aldi/search_v3/${q}`,
  },
  amazon: {
    name: 'Amazon Fresh',
    logoColor: '#FF9900',
    homeUrl: 'https://www.amazon.com/alm/storefront?almBrandId=QW1hem9uIEZyZXNo',
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
  'boneless chicken': 'chicken breast',
  'skinless chicken': 'chicken breast',
  'chicken breast boneless': 'chicken breast',
  'chicken thigh': 'chicken thighs',
  'beef': 'ground beef',
  'ground beef 80/20': 'ground beef',
  'lean ground beef': 'ground beef',
  'hamburger': 'ground beef',
  'turkey': 'ground turkey',
  'fish': 'salmon',
  'salmon fillet': 'salmon',
  'yogurt': 'greek yogurt',
  'plain yogurt': 'greek yogurt',
  'peppers': 'bell pepper',
  'pepper': 'bell pepper',
  'green pepper': 'bell pepper',
  'red pepper': 'bell pepper',
  'potatoes': 'sweet potato',
  'potato': 'sweet potato',
  'yam': 'sweet potato',
  'noodles': 'pasta',
  'spaghetti': 'pasta',
  'penne': 'pasta',
  'linguine': 'pasta',
  'macaroni': 'pasta',
  'oil': 'olive oil',
  'cooking oil': 'olive oil',
  'vegetable oil': 'olive oil',
  'beans': 'black beans',
  'kidney beans': 'black beans',
  'pinto beans': 'black beans',
  'broth': 'chicken broth',
  'stock': 'chicken broth',
  'vegetable broth': 'chicken broth',
  'tomatoes': 'tomato',
  'roma tomato': 'tomato',
  'cherry tomatoes': 'tomato',
  'onions': 'onion',
  'yellow onion': 'onion',
  'red onion': 'onion',
  'white onion': 'onion',
  'lemons': 'lemon',
  'lime': 'lemon',
  'limes': 'lemon',
  'bananas': 'banana',
  'avocados': 'avocado',
  'whole milk': 'milk',
  'skim milk': 'milk',
  '2% milk': 'milk',
  'almond milk': 'milk',
  'brown rice': 'rice',
  'white rice': 'rice',
  'jasmine rice': 'rice',
  'basmati rice': 'rice',
  'wheat bread': 'bread',
  'white bread': 'bread',
  'whole wheat bread': 'bread',
  'cheddar cheese': 'cheese',
  'mozzarella': 'cheese',
  'parmesan': 'cheese',
  'shredded cheese': 'cheese',
  'salted butter': 'butter',
  'unsalted butter': 'butter',
  'all purpose flour': 'flour',
  'ap flour': 'flour',
  'whole wheat flour': 'flour',
  'rolled oats': 'oats',
  'oatmeal': 'oats',
  'diced tomatoes': 'canned tomatoes',
  'crushed tomatoes': 'canned tomatoes',
  'tomato sauce': 'canned tomatoes',
  'tomato paste': 'canned tomatoes',
  'extra virgin olive oil': 'olive oil',
  'evoo': 'olive oil',
};

// Generate a reasonable fallback price for items not in our mock DB
function generateFallbackPrice(itemName: string): StorePrice[] {
  const encoded = encodeURIComponent(itemName);
  // Narrower range: $2.50 - $6.99 (more realistic grocery spread)
  const hash = Math.abs(hashCode(itemName));
  const basePrice = 2.50 + (hash % 450) / 100; // $2.50 - $6.99

  // Round to common price endings (.29, .49, .79, .99)
  const endings = [0.29, 0.49, 0.79, 0.99];
  function toRetailPrice(raw: number): number {
    const whole = Math.floor(raw);
    const frac = raw - whole;
    const ending = endings.reduce((best, e) => Math.abs(frac - e) < Math.abs(frac - best) ? e : best);
    return whole + ending;
  }

  // Store-specific multipliers (Aldi cheapest, Target priciest)
  return [
    { store: 'Kroger', price: toRetailPrice(basePrice * 1.02), unit: 'each', deepLink: STORES.kroger.deepLink(encoded), logoColor: STORES.kroger.logoColor },
    { store: 'Walmart', price: toRetailPrice(basePrice * 0.96), unit: 'each', deepLink: STORES.walmart.deepLink(encoded), logoColor: STORES.walmart.logoColor },
    { store: 'Target', price: toRetailPrice(basePrice * 1.10), unit: 'each', deepLink: STORES.target.deepLink(encoded), logoColor: STORES.target.logoColor },
    { store: 'Aldi', price: toRetailPrice(basePrice * 0.88), unit: 'each', deepLink: STORES.aldi.deepLink(encoded), logoColor: STORES.aldi.logoColor },
    { store: 'Amazon Fresh', price: toRetailPrice(basePrice * 1.08), unit: 'each', deepLink: STORES.amazon.deepLink(encoded), logoColor: STORES.amazon.logoColor },
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

// Common adjectives that shouldn't be sole matchers in word overlap
const FILLER_WORDS = new Set(['frozen', 'organic', 'fresh', 'canned', 'dried', 'raw', 'whole', 'sliced', 'diced', 'chopped', 'ground', 'crushed', 'large', 'small', 'medium']);

function findMockPrices(key: string): StorePrice[] | null {
  // Tier 1: Exact match
  if (MOCK_PRICES[key]) return MOCK_PRICES[key];

  // Tier 2: Synonym match
  if (SYNONYMS[key] && MOCK_PRICES[SYNONYMS[key]]) return MOCK_PRICES[SYNONYMS[key]];

  // Tier 3: Partial match — mock key is contained in search key (not reverse unless short)
  // Require mock key to be at least 60% the length of the search key
  for (const [mockKey, mockStores] of Object.entries(MOCK_PRICES)) {
    if (key.includes(mockKey) && mockKey.length >= key.length * 0.6) {
      return mockStores;
    }
    // Only allow reverse (search inside mock) for short single-word searches
    if (mockKey.includes(key) && key.length >= 4 && !key.includes(' ')) {
      return mockStores;
    }
  }

  // Tier 4: Word overlap — require all words of the shorter side to match the longer side
  // Filter out common filler words from being sole matchers
  const words = key.split(/\s+/).filter(w => w.length > 2);
  const meaningfulWords = words.filter(w => !FILLER_WORDS.has(w));

  for (const [mockKey, mockStores] of Object.entries(MOCK_PRICES)) {
    const mockWords = mockKey.split(/\s+/).filter(w => w.length > 2);
    const meaningfulMockWords = mockWords.filter(w => !FILLER_WORDS.has(w));

    // Count how many meaningful words overlap
    const overlapping = meaningfulWords.filter(w => meaningfulMockWords.includes(w));

    // Require ALL meaningful words of the shorter side to match
    const shorter = Math.min(meaningfulWords.length, meaningfulMockWords.length);
    if (shorter > 0 && overlapping.length >= shorter) {
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
  storeLinks: Record<string, { homeUrl: string; searchUrl: string }>;
  itemSearchUrls: Record<string, Record<string, string>>;
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

  // Build store links (home URLs + multi-item search)
  const storeLinks: Record<string, { homeUrl: string; searchUrl: string }> = {};
  for (const [key, cfg] of Object.entries(STORES)) {
    const itemList = items.join(', ');
    storeLinks[cfg.name] = {
      homeUrl: cfg.homeUrl,
      searchUrl: cfg.searchUrl(encodeURIComponent(itemList.slice(0, 100))),
    };
  }

  // Build per-item search URLs: storeName → itemName → searchUrl
  const itemSearchUrls: Record<string, Record<string, string>> = {};
  for (const [key, cfg] of Object.entries(STORES)) {
    itemSearchUrls[cfg.name] = {};
    for (const item of items) {
      itemSearchUrls[cfg.name][item] = cfg.searchUrl(encodeURIComponent(item));
    }
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
    storeLinks,
    itemSearchUrls,
    bestStore: bestEntry,
    totalSavings: round(worstTotal - bestEntry.total),
  };
}

// ─── Kroger API Integration ────────────────────────────────────────────
// Set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET in .env to enable.
// Kroger API docs: https://developer.kroger.com

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
    // Refresh 5 min before expiry
    _krogerTokenExpiry = Date.now() + (json.expires_in - 300) * 1000;
    return _krogerToken;
  } catch (err) {
    console.error('Kroger token error:', err);
    return null;
  }
}

interface KrogerLocation {
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
  return KROGER_BANNERS[chain] || KROGER_BANNERS['KROGER'];
}

async function findNearestKrogerLocation(token: string, lat: number, lng: number): Promise<KrogerLocation | null> {
  try {
    // No chain filter — picks up all Kroger-family banners (Mariano's, Fred Meyer, King Soopers, Ralphs, etc.)
    const res = await fetch(
      `https://api.kroger.com/v1/locations?filter.latLong.near=${lat},${lng}&filter.limit=1`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const json = await res.json() as { data: any[] };
    const loc = json.data?.[0];
    if (!loc) return null;
    const chain = loc.chain || loc.name || 'Kroger';
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
    let url = `https://api.kroger.com/v1/products?filter.term=${encodeURIComponent(query)}&filter.limit=1`;
    if (locationId) url += `&filter.locationId=${locationId}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json() as { data: any[] };
    const product = json.data?.[0];
    if (!product) return null;

    const priceInfo = product.items?.[0]?.price;
    const regularPrice = priceInfo?.regular || 0;
    const promoPrice = priceInfo?.promo || null;
    const displayPrice = promoPrice || regularPrice;
    if (displayPrice === 0) return null;

    // Extract image URL (front perspective, thumbnail size)
    const frontImage = product.images?.find((img: any) => img.perspective === 'front');
    const thumbnail = frontImage?.sizes?.find((s: any) => s.size === 'thumbnail');
    const imageUrl = thumbnail?.url || frontImage?.sizes?.[0]?.url || undefined;

    // Extract fulfillment/stock info
    const fulfillment = product.items?.[0]?.fulfillment;
    const fulfillmentTypes: string[] = [];
    let inStock = true;
    if (fulfillment) {
      if (fulfillment.inStore) fulfillmentTypes.push('inStore');
      if (fulfillment.delivery) fulfillmentTypes.push('delivery');
      if (fulfillment.shipToHome) fulfillmentTypes.push('shipToHome');
      if (fulfillment.curbside) fulfillmentTypes.push('pickup');
      // If no fulfillment options, it's out of stock
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
    }];
  } catch (err) {
    console.error('Kroger API error:', err);
    return null;
  }
}

/**
 * Enrich price results with live Kroger pricing for the user's nearest store.
 * Replaces mock Kroger entries with real data; falls back silently on error.
 */
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

    // Fetch real prices for each item in parallel
    const enriched = await Promise.all(
      results.map(async (result) => {
        try {
          const krogerPrices = await getKrogerPrices(result.item, location.locationId, location.chain);
          if (!krogerPrices || krogerPrices.length === 0) return result;

          const realKroger = krogerPrices[0];
          // Replace the mock Kroger entry with real banner-specific data
          const newStores = result.stores.map((s) =>
            s.store === 'Kroger' ? { ...realKroger } : s,
          );

          // Recalculate best price and savings
          const sorted = [...newStores].sort((a, b) => a.price - b.price);
          const bestPrice = sorted[0];
          const worstPrice = sorted[sorted.length - 1];
          const savings = round(worstPrice.price - bestPrice.price);

          return { ...result, stores: newStores, bestPrice, savings };
        } catch {
          return result; // Keep mock data for this item on error
        }
      }),
    );

    return enriched;
  } catch (err) {
    console.error('Kroger enrichment error:', err);
    return results; // Graceful fallback
  }
}

// ─── Store Locations & Distance ──────────────────────────────────────────

interface StoreLocation {
  chain: string;
  lat: number;
  lng: number;
  address: string;
}

// Sample store locations (Nashville, TN area — expand per deployment region)
// In production, use a store locator API (Google Places, etc.)
const STORE_LOCATIONS: StoreLocation[] = [
  // Kroger
  { chain: 'Kroger', lat: 36.1627, lng: -86.7816, address: '2601 Charlotte Ave, Nashville, TN' },
  { chain: 'Kroger', lat: 36.1184, lng: -86.8383, address: '4560 Harding Pike, Nashville, TN' },
  { chain: 'Kroger', lat: 36.1062, lng: -86.7459, address: '2131 Abbott Martin Rd, Nashville, TN' },
  { chain: 'Kroger', lat: 36.0846, lng: -86.7137, address: '2601 Nolensville Pike, Nashville, TN' },
  // Walmart
  { chain: 'Walmart', lat: 36.1092, lng: -86.8884, address: '7044 Charlotte Pike, Nashville, TN' },
  { chain: 'Walmart', lat: 36.0413, lng: -86.7023, address: '5824 Nolensville Pike, Antioch, TN' },
  { chain: 'Walmart', lat: 36.2309, lng: -86.8151, address: '3458 Dickerson Pike, Nashville, TN' },
  // Target
  { chain: 'Target', lat: 36.1282, lng: -86.8422, address: '32 White Bridge Rd, Nashville, TN' },
  { chain: 'Target', lat: 36.1107, lng: -86.8169, address: '3790 Charlotte Ave, Nashville, TN' },
  { chain: 'Target', lat: 36.1527, lng: -86.7927, address: '2566 W End Ave, Nashville, TN' },
  // Aldi
  { chain: 'Aldi', lat: 36.1369, lng: -86.8757, address: '6826 Charlotte Pike, Nashville, TN' },
  { chain: 'Aldi', lat: 36.0738, lng: -86.7029, address: '5305 Nolensville Pike, Nashville, TN' },
  { chain: 'Aldi', lat: 36.2151, lng: -86.7256, address: '2421 Gallatin Pike, Nashville, TN' },
  // Amazon Fresh — delivery only, no physical distance
  { chain: 'Amazon Fresh', lat: 0, lng: 0, address: 'Delivery only' },
];

// Haversine formula: distance between two lat/lng points in miles
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface StoreDistance {
  chain: string;
  distance: number; // miles
  address: string;
  logoColor: string;
  homeUrl: string;
}

export function getNearestStores(userLat: number, userLng: number, maxMiles: number = 20): StoreDistance[] {
  const chainDistances: Record<string, StoreDistance> = {};

  for (const loc of STORE_LOCATIONS) {
    // Amazon Fresh = delivery, always 0 distance
    if (loc.chain === 'Amazon Fresh') {
      chainDistances[loc.chain] = {
        chain: loc.chain,
        distance: 0,
        address: 'Delivery to your area',
        logoColor: STORES.amazon.logoColor,
        homeUrl: STORES.amazon.homeUrl,
      };
      continue;
    }

    const dist = haversineDistance(userLat, userLng, loc.lat, loc.lng);
    if (!chainDistances[loc.chain] || dist < chainDistances[loc.chain].distance) {
      const storeKey = Object.entries(STORES).find(([, v]) => v.name === loc.chain)?.[0] as keyof typeof STORES;
      chainDistances[loc.chain] = {
        chain: loc.chain,
        distance: round(dist),
        address: loc.address,
        logoColor: storeKey ? STORES[storeKey].logoColor : '#6b7280',
        homeUrl: storeKey ? STORES[storeKey].homeUrl : '',
      };
    }
  }

  return Object.values(chainDistances)
    .filter(s => s.distance <= maxMiles || s.chain === 'Amazon Fresh')
    .sort((a, b) => a.distance - b.distance);
}

// Score stores considering price and distance (80/20 weighting)
// Returns sorted by score, with cheapest and closest flagged
export function scoreStores(
  storeTotals: Record<string, number>,
  distances: StoreDistance[],
  _preferredStores?: string[],
): Array<{ store: string; total: number; distance: number; score: number; recommended: boolean; cheapest?: boolean; closest?: boolean }> {
  const distMap: Record<string, number> = {};
  for (const d of distances) {
    distMap[d.chain] = d.distance;
  }

  const entries = Object.entries(storeTotals).map(([store, total]) => {
    const distance = distMap[store] ?? 99;

    // Score: lower is better — 80% price, 20% distance
    const maxTotal = Math.max(...Object.values(storeTotals));
    const priceScore = (total / maxTotal) * 80;
    const distScore = (Math.min(distance, 20) / 20) * 20;
    const score = round(priceScore + distScore);

    return { store, total, distance, score, recommended: false, cheapest: false, closest: false };
  });

  // Sort by score (80% price + 20% distance)
  entries.sort((a, b) => a.score - b.score);
  if (entries.length > 0) entries[0].recommended = true;

  // Flag cheapest store
  const cheapest = [...entries].sort((a, b) => a.total - b.total);
  if (cheapest.length > 0) cheapest[0].cheapest = true;

  // Flag closest physical store (exclude Amazon Fresh / delivery)
  const closestPhysical = [...entries]
    .filter(e => e.store !== 'Amazon Fresh' && e.distance > 0)
    .sort((a, b) => a.distance - b.distance);
  // If all have 0 distance (e.g. exact location match), just pick first non-Amazon
  const physicalStores = entries.filter(e => e.store !== 'Amazon Fresh');
  const closestStore = closestPhysical.length > 0 ? closestPhysical[0]
    : physicalStores.length > 0 ? physicalStores.sort((a, b) => a.distance - b.distance)[0]
    : null;
  if (closestStore) closestStore.closest = true;

  return entries;
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

// 10-minute in-memory cache for product search
const _searchCache: Map<string, { data: KrogerProductResult[]; ts: number }> = new Map();
const SEARCH_CACHE_TTL = 10 * 60 * 1000;

// 1-hour location cache
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
    // Silently fail — don't block price responses
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

// 4-hour cache for sale items
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

  // Search common categories and filter for sale items
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

  // Sort by savings descending
  allDeals.sort((a, b) => (b.saleSavings || 0) - (a.saleSavings || 0));

  _saleCache.set(locationId, { data: allDeals, ts: Date.now() });
  return allDeals.slice(0, limit);
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
