export interface StorePrice {
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
  krogerProductId?: string;
}

export interface PriceResult {
  item: string;
  stores: StorePrice[];
  bestPrice: StorePrice;
  savings: number;
}

// Store configurations — all use web URLs (works on web + mobile via Linking.openURL)
export const STORES = {
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
    makeStorePrice('target', 4.29, 'lb', 'chicken breast'),
    makeStorePrice('aldi', 2.99, 'lb', 'chicken breast'),
    makeStorePrice('amazon', 4.49, 'lb', 'chicken breast'),
  ],
  'chicken thighs': [
    makeStorePrice('kroger', 2.49, 'lb', 'chicken thighs'),
    makeStorePrice('walmart', 2.29, 'lb', 'chicken thighs'),
    makeStorePrice('target', 2.79, 'lb', 'chicken thighs'),
    makeStorePrice('aldi', 1.99, 'lb', 'chicken thighs'),
    makeStorePrice('amazon', 2.99, 'lb', 'chicken thighs'),
  ],
  'ground beef': [
    makeStorePrice('kroger', 5.49, 'lb', 'ground beef'),
    makeStorePrice('walmart', 4.98, 'lb', 'ground beef'),
    makeStorePrice('target', 5.99, 'lb', 'ground beef'),
    makeStorePrice('aldi', 4.49, 'lb', 'ground beef'),
    makeStorePrice('amazon', 5.79, 'lb', 'ground beef'),
  ],
  'ground turkey': [
    makeStorePrice('kroger', 4.49, 'lb', 'ground turkey'),
    makeStorePrice('walmart', 3.98, 'lb', 'ground turkey'),
    makeStorePrice('target', 4.79, 'lb', 'ground turkey'),
    makeStorePrice('aldi', 3.49, 'lb', 'ground turkey'),
    makeStorePrice('amazon', 4.99, 'lb', 'ground turkey'),
  ],
  'salmon': [
    makeStorePrice('kroger', 8.99, 'lb', 'salmon'),
    makeStorePrice('walmart', 7.98, 'lb', 'salmon'),
    makeStorePrice('target', 9.49, 'lb', 'salmon'),
    makeStorePrice('aldi', 6.99, 'lb', 'salmon'),
    makeStorePrice('amazon', 9.99, 'lb', 'salmon'),
  ],
  'shrimp': [
    makeStorePrice('kroger', 7.99, 'lb', 'shrimp'),
    makeStorePrice('walmart', 6.98, 'lb', 'shrimp'),
    makeStorePrice('target', 8.49, 'lb', 'shrimp'),
    makeStorePrice('aldi', 5.99, 'lb', 'shrimp'),
    makeStorePrice('amazon', 8.99, 'lb', 'shrimp'),
  ],
  'eggs': [
    makeStorePrice('kroger', 3.49, 'dozen', 'eggs'),
    makeStorePrice('walmart', 2.98, 'dozen', 'eggs'),
    makeStorePrice('target', 3.79, 'dozen', 'eggs'),
    makeStorePrice('aldi', 2.49, 'dozen', 'eggs'),
    makeStorePrice('amazon', 3.99, 'dozen', 'eggs'),
  ],
  'bacon': [
    makeStorePrice('kroger', 5.99, '16oz', 'bacon'),
    makeStorePrice('walmart', 4.98, '16oz', 'bacon'),
    makeStorePrice('target', 5.49, '16oz', 'bacon'),
    makeStorePrice('aldi', 3.99, '16oz', 'bacon'),
    makeStorePrice('amazon', 6.49, '16oz', 'bacon'),
  ],
  // Dairy
  'milk': [
    makeStorePrice('kroger', 3.49, 'gallon', 'milk'),
    makeStorePrice('walmart', 2.98, 'gallon', 'milk'),
    makeStorePrice('target', 3.79, 'gallon', 'milk'),
    makeStorePrice('aldi', 2.69, 'gallon', 'milk'),
    makeStorePrice('amazon', 3.99, 'gallon', 'milk'),
  ],
  'greek yogurt': [
    makeStorePrice('kroger', 4.99, '32oz', 'greek yogurt'),
    makeStorePrice('walmart', 4.48, '32oz', 'greek yogurt'),
    makeStorePrice('target', 5.29, '32oz', 'greek yogurt'),
    makeStorePrice('aldi', 3.99, '32oz', 'greek yogurt'),
    makeStorePrice('amazon', 5.49, '32oz', 'greek yogurt'),
  ],
  'cheese': [
    makeStorePrice('kroger', 3.49, '8oz', 'cheese'),
    makeStorePrice('walmart', 2.98, '8oz', 'cheese'),
    makeStorePrice('target', 3.79, '8oz', 'cheese'),
    makeStorePrice('aldi', 2.49, '8oz', 'cheese'),
    makeStorePrice('amazon', 3.99, '8oz', 'cheese'),
  ],
  'butter': [
    makeStorePrice('kroger', 4.49, '16oz', 'butter'),
    makeStorePrice('walmart', 3.98, '16oz', 'butter'),
    makeStorePrice('target', 4.79, '16oz', 'butter'),
    makeStorePrice('aldi', 3.49, '16oz', 'butter'),
    makeStorePrice('amazon', 4.99, '16oz', 'butter'),
  ],
  'cream cheese': [
    makeStorePrice('kroger', 2.49, '8oz', 'cream cheese'),
    makeStorePrice('walmart', 1.98, '8oz', 'cream cheese'),
    makeStorePrice('target', 2.79, '8oz', 'cream cheese'),
    makeStorePrice('aldi', 1.69, '8oz', 'cream cheese'),
    makeStorePrice('amazon', 2.99, '8oz', 'cream cheese'),
  ],
  'sour cream': [
    makeStorePrice('kroger', 2.29, '16oz', 'sour cream'),
    makeStorePrice('walmart', 1.88, '16oz', 'sour cream'),
    makeStorePrice('target', 2.49, '16oz', 'sour cream'),
    makeStorePrice('aldi', 1.49, '16oz', 'sour cream'),
    makeStorePrice('amazon', 2.59, '16oz', 'sour cream'),
  ],
  // Produce
  'avocado': [
    makeStorePrice('kroger', 1.25, 'each', 'avocado'),
    makeStorePrice('walmart', 0.98, 'each', 'avocado'),
    makeStorePrice('target', 1.49, 'each', 'avocado'),
    makeStorePrice('aldi', 0.79, 'each', 'avocado'),
    makeStorePrice('amazon', 1.50, 'each', 'avocado'),
  ],
  'banana': [
    makeStorePrice('kroger', 0.59, 'lb', 'banana'),
    makeStorePrice('walmart', 0.52, 'lb', 'banana'),
    makeStorePrice('target', 0.69, 'lb', 'banana'),
    makeStorePrice('aldi', 0.44, 'lb', 'banana'),
    makeStorePrice('amazon', 0.65, 'lb', 'banana'),
  ],
  'broccoli': [
    makeStorePrice('kroger', 1.99, 'lb', 'broccoli'),
    makeStorePrice('walmart', 1.48, 'lb', 'broccoli'),
    makeStorePrice('target', 2.29, 'lb', 'broccoli'),
    makeStorePrice('aldi', 1.29, 'lb', 'broccoli'),
    makeStorePrice('amazon', 2.49, 'lb', 'broccoli'),
  ],
  'spinach': [
    makeStorePrice('kroger', 2.99, '5oz', 'spinach'),
    makeStorePrice('walmart', 2.48, '5oz', 'spinach'),
    makeStorePrice('target', 3.29, '5oz', 'spinach'),
    makeStorePrice('aldi', 1.99, '5oz', 'spinach'),
    makeStorePrice('amazon', 3.49, '5oz', 'spinach'),
  ],
  'tomato': [
    makeStorePrice('kroger', 1.69, 'lb', 'tomato'),
    makeStorePrice('walmart', 1.28, 'lb', 'tomato'),
    makeStorePrice('target', 1.99, 'lb', 'tomato'),
    makeStorePrice('aldi', 0.99, 'lb', 'tomato'),
    makeStorePrice('amazon', 1.89, 'lb', 'tomato'),
  ],
  'onion': [
    makeStorePrice('kroger', 1.29, 'lb', 'onion'),
    makeStorePrice('walmart', 0.98, 'lb', 'onion'),
    makeStorePrice('target', 1.49, 'lb', 'onion'),
    makeStorePrice('aldi', 0.79, 'lb', 'onion'),
    makeStorePrice('amazon', 1.39, 'lb', 'onion'),
  ],
  'garlic': [
    makeStorePrice('kroger', 0.69, 'head', 'garlic'),
    makeStorePrice('walmart', 0.50, 'head', 'garlic'),
    makeStorePrice('target', 0.79, 'head', 'garlic'),
    makeStorePrice('aldi', 0.45, 'head', 'garlic'),
    makeStorePrice('amazon', 0.89, 'head', 'garlic'),
  ],
  'bell pepper': [
    makeStorePrice('kroger', 1.49, 'each', 'bell pepper'),
    makeStorePrice('walmart', 0.98, 'each', 'bell pepper'),
    makeStorePrice('target', 1.29, 'each', 'bell pepper'),
    makeStorePrice('aldi', 0.89, 'each', 'bell pepper'),
    makeStorePrice('amazon', 1.59, 'each', 'bell pepper'),
  ],
  'sweet potato': [
    makeStorePrice('kroger', 1.29, 'lb', 'sweet potato'),
    makeStorePrice('walmart', 0.98, 'lb', 'sweet potato'),
    makeStorePrice('target', 1.49, 'lb', 'sweet potato'),
    makeStorePrice('aldi', 0.79, 'lb', 'sweet potato'),
    makeStorePrice('amazon', 1.59, 'lb', 'sweet potato'),
  ],
  'lemon': [
    makeStorePrice('kroger', 0.59, 'each', 'lemon'),
    makeStorePrice('walmart', 0.48, 'each', 'lemon'),
    makeStorePrice('target', 0.69, 'each', 'lemon'),
    makeStorePrice('aldi', 0.35, 'each', 'lemon'),
    makeStorePrice('amazon', 0.79, 'each', 'lemon'),
  ],
  'lettuce': [
    makeStorePrice('kroger', 1.99, 'head', 'lettuce'),
    makeStorePrice('walmart', 1.48, 'head', 'lettuce'),
    makeStorePrice('target', 2.29, 'head', 'lettuce'),
    makeStorePrice('aldi', 1.19, 'head', 'lettuce'),
    makeStorePrice('amazon', 2.49, 'head', 'lettuce'),
  ],
  // Grains & Pantry
  'rice': [
    makeStorePrice('kroger', 2.99, '2lb', 'rice'),
    makeStorePrice('walmart', 2.48, '2lb', 'rice'),
    makeStorePrice('target', 3.29, '2lb', 'rice'),
    makeStorePrice('aldi', 1.99, '2lb', 'rice'),
    makeStorePrice('amazon', 3.49, '2lb', 'rice'),
  ],
  'pasta': [
    makeStorePrice('kroger', 1.49, '16oz', 'pasta'),
    makeStorePrice('walmart', 0.98, '16oz', 'pasta'),
    makeStorePrice('target', 1.59, '16oz', 'pasta'),
    makeStorePrice('aldi', 0.89, '16oz', 'pasta'),
    makeStorePrice('amazon', 1.79, '16oz', 'pasta'),
  ],
  'bread': [
    makeStorePrice('kroger', 2.99, 'loaf', 'bread'),
    makeStorePrice('walmart', 2.48, 'loaf', 'bread'),
    makeStorePrice('target', 3.29, 'loaf', 'bread'),
    makeStorePrice('aldi', 1.49, 'loaf', 'bread'),
    makeStorePrice('amazon', 3.49, 'loaf', 'bread'),
  ],
  'tortillas': [
    makeStorePrice('kroger', 2.99, '10ct', 'tortillas'),
    makeStorePrice('walmart', 2.28, '10ct', 'tortillas'),
    makeStorePrice('target', 3.29, '10ct', 'tortillas'),
    makeStorePrice('aldi', 1.89, '10ct', 'tortillas'),
    makeStorePrice('amazon', 3.49, '10ct', 'tortillas'),
  ],
  'oats': [
    makeStorePrice('kroger', 3.49, '42oz', 'oats'),
    makeStorePrice('walmart', 2.98, '42oz', 'oats'),
    makeStorePrice('target', 3.99, '42oz', 'oats'),
    makeStorePrice('aldi', 2.49, '42oz', 'oats'),
    makeStorePrice('amazon', 4.29, '42oz', 'oats'),
  ],
  'flour': [
    makeStorePrice('kroger', 3.29, '5lb', 'flour'),
    makeStorePrice('walmart', 2.68, '5lb', 'flour'),
    makeStorePrice('target', 3.59, '5lb', 'flour'),
    makeStorePrice('aldi', 1.99, '5lb', 'flour'),
    makeStorePrice('amazon', 3.79, '5lb', 'flour'),
  ],
  // Canned & Jarred
  'canned tomatoes': [
    makeStorePrice('kroger', 1.29, '14.5oz', 'canned tomatoes'),
    makeStorePrice('walmart', 0.88, '14.5oz', 'canned tomatoes'),
    makeStorePrice('target', 1.49, '14.5oz', 'canned tomatoes'),
    makeStorePrice('aldi', 0.69, '14.5oz', 'canned tomatoes'),
    makeStorePrice('amazon', 1.59, '14.5oz', 'canned tomatoes'),
  ],
  'black beans': [
    makeStorePrice('kroger', 1.19, '15oz', 'black beans'),
    makeStorePrice('walmart', 0.78, '15oz', 'black beans'),
    makeStorePrice('target', 1.29, '15oz', 'black beans'),
    makeStorePrice('aldi', 0.65, '15oz', 'black beans'),
    makeStorePrice('amazon', 1.39, '15oz', 'black beans'),
  ],
  'chicken broth': [
    makeStorePrice('kroger', 2.49, '32oz', 'chicken broth'),
    makeStorePrice('walmart', 1.98, '32oz', 'chicken broth'),
    makeStorePrice('target', 2.79, '32oz', 'chicken broth'),
    makeStorePrice('aldi', 1.49, '32oz', 'chicken broth'),
    makeStorePrice('amazon', 2.99, '32oz', 'chicken broth'),
  ],
  'coconut milk': [
    makeStorePrice('kroger', 2.29, '13.5oz', 'coconut milk'),
    makeStorePrice('walmart', 1.68, '13.5oz', 'coconut milk'),
    makeStorePrice('target', 2.49, '13.5oz', 'coconut milk'),
    makeStorePrice('aldi', 1.39, '13.5oz', 'coconut milk'),
    makeStorePrice('amazon', 2.59, '13.5oz', 'coconut milk'),
  ],
  // Condiments & Oils
  'olive oil': [
    makeStorePrice('kroger', 5.99, '16oz', 'olive oil'),
    makeStorePrice('walmart', 4.98, '16oz', 'olive oil'),
    makeStorePrice('target', 6.49, '16oz', 'olive oil'),
    makeStorePrice('aldi', 3.99, '16oz', 'olive oil'),
    makeStorePrice('amazon', 6.99, '16oz', 'olive oil'),
  ],
  'soy sauce': [
    makeStorePrice('kroger', 2.99, '15oz', 'soy sauce'),
    makeStorePrice('walmart', 2.48, '15oz', 'soy sauce'),
    makeStorePrice('target', 3.29, '15oz', 'soy sauce'),
    makeStorePrice('aldi', 1.89, '15oz', 'soy sauce'),
    makeStorePrice('amazon', 3.49, '15oz', 'soy sauce'),
  ],
  'hot sauce': [
    makeStorePrice('kroger', 2.49, '5oz', 'hot sauce'),
    makeStorePrice('walmart', 1.98, '5oz', 'hot sauce'),
    makeStorePrice('target', 2.79, '5oz', 'hot sauce'),
    makeStorePrice('aldi', 1.49, '5oz', 'hot sauce'),
    makeStorePrice('amazon', 2.99, '5oz', 'hot sauce'),
  ],
  'honey': [
    makeStorePrice('kroger', 5.99, '12oz', 'honey'),
    makeStorePrice('walmart', 4.98, '12oz', 'honey'),
    makeStorePrice('target', 6.49, '12oz', 'honey'),
    makeStorePrice('aldi', 3.99, '12oz', 'honey'),
    makeStorePrice('amazon', 6.29, '12oz', 'honey'),
  ],
  // Spices & Seasonings
  'black pepper': [
    makeStorePrice('kroger', 4.49, '4oz', 'black pepper'),
    makeStorePrice('walmart', 3.48, '4oz', 'black pepper'),
    makeStorePrice('target', 4.99, '4oz', 'black pepper'),
    makeStorePrice('aldi', 2.49, '4oz', 'black pepper'),
    makeStorePrice('amazon', 5.29, '4oz', 'black pepper'),
  ],
  'cumin': [
    makeStorePrice('kroger', 3.49, '1.5oz', 'cumin'),
    makeStorePrice('walmart', 2.98, '1.5oz', 'cumin'),
    makeStorePrice('target', 3.79, '1.5oz', 'cumin'),
    makeStorePrice('aldi', 1.99, '1.5oz', 'cumin'),
    makeStorePrice('amazon', 3.99, '1.5oz', 'cumin'),
  ],
  'paprika': [
    makeStorePrice('kroger', 3.29, '2oz', 'paprika'),
    makeStorePrice('walmart', 2.68, '2oz', 'paprika'),
    makeStorePrice('target', 3.59, '2oz', 'paprika'),
    makeStorePrice('aldi', 1.79, '2oz', 'paprika'),
    makeStorePrice('amazon', 3.79, '2oz', 'paprika'),
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
  const hash = Math.abs(hashCode(itemName));
  const basePrice = 2.50 + (hash % 450) / 100;

  const endings = [0.29, 0.49, 0.79, 0.99];
  function toRetailPrice(raw: number): number {
    const whole = Math.floor(raw);
    const frac = raw - whole;
    const ending = endings.reduce((best, e) => Math.abs(frac - e) < Math.abs(frac - best) ? e : best);
    return whole + ending;
  }

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

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// Common adjectives that shouldn't be sole matchers in word overlap
const FILLER_WORDS = new Set(['frozen', 'organic', 'fresh', 'canned', 'dried', 'raw', 'whole', 'sliced', 'diced', 'chopped', 'ground', 'crushed', 'large', 'small', 'medium']);

function findMockPrices(key: string): StorePrice[] | null {
  if (MOCK_PRICES[key]) return MOCK_PRICES[key];
  if (SYNONYMS[key] && MOCK_PRICES[SYNONYMS[key]]) return MOCK_PRICES[SYNONYMS[key]];

  for (const [mockKey, mockStores] of Object.entries(MOCK_PRICES)) {
    if (key.includes(mockKey) && mockKey.length >= key.length * 0.6) {
      return mockStores;
    }
    if (mockKey.includes(key) && key.length >= 4 && !key.includes(' ')) {
      return mockStores;
    }
  }

  const words = key.split(/\s+/).filter(w => w.length > 2);
  const meaningfulWords = words.filter(w => !FILLER_WORDS.has(w));

  for (const [mockKey, mockStores] of Object.entries(MOCK_PRICES)) {
    const mockWords = mockKey.split(/\s+/).filter(w => w.length > 2);
    const meaningfulMockWords = mockWords.filter(w => !FILLER_WORDS.has(w));
    const overlapping = meaningfulWords.filter(w => meaningfulMockWords.includes(w));
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

  for (const store in storeTotals) {
    storeTotals[store] = round(storeTotals[store]);
  }

  const storeLinks: Record<string, { homeUrl: string; searchUrl: string }> = {};
  for (const [key, cfg] of Object.entries(STORES)) {
    const itemList = items.join(', ');
    storeLinks[cfg.name] = {
      homeUrl: cfg.homeUrl,
      searchUrl: cfg.searchUrl(encodeURIComponent(itemList.slice(0, 100))),
    };
  }

  const itemSearchUrls: Record<string, Record<string, string>> = {};
  for (const [key, cfg] of Object.entries(STORES)) {
    itemSearchUrls[cfg.name] = {};
    for (const item of items) {
      itemSearchUrls[cfg.name][item] = cfg.searchUrl(encodeURIComponent(item));
    }
  }

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
