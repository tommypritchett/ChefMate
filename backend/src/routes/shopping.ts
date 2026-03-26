import express from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { goalBoostScore, priceValueBonus, parseSizeToOz, GOAL_BOOST_KEYWORDS } from '../services/grocery-prices';

// Category inference for auto-detecting storage locations
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  produce: ['apple', 'banana', 'lettuce', 'tomato', 'onion', 'garlic', 'bell pepper', 'carrot', 'broccoli', 'spinach', 'avocado', 'lemon', 'lime', 'potato', 'celery', 'cucumber', 'mushroom', 'corn', 'berry', 'fruit', 'vegetable', 'herb', 'cilantro', 'basil', 'parsley', 'kale', 'zucchini', 'squash', 'green bean', 'pea'],
  protein: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'turkey', 'steak', 'bacon', 'sausage', 'ground', 'meat', 'tofu', 'egg'],
  dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage', 'mozzarella', 'cheddar', 'parmesan'],
  grains: ['rice', 'pasta', 'bread', 'flour', 'oat', 'cereal', 'tortilla', 'noodle', 'quinoa'],
  frozen: ['frozen', 'ice cream', 'pizza rolls'],
  canned: ['canned', 'beans', 'soup', 'tuna can', 'tomato sauce', 'tomato paste'],
  condiments: ['sauce', 'ketchup', 'mustard', 'mayo', 'dressing', 'vinegar', 'oil', 'olive oil', 'soy sauce', 'hot sauce', 'sriracha', 'salsa', 'seasoning', 'spice', 'salt', 'pepper', 'black pepper', 'peppercorn'],
  snacks: ['chips', 'crackers', 'nuts', 'granola', 'popcorn', 'cookie', 'bar'],
  beverages: ['juice', 'soda', 'water', 'coffee', 'tea', 'wine', 'beer'],
};

// Default expiry days by category (mirrors inventory.ts)
const CATEGORY_EXPIRY_DAYS: Record<string, number> = {
  produce: 7, 'meat/protein': 4, protein: 4, meat: 4, dairy: 14,
  grains: 180, frozen: 120, canned: 365, condiments: 90,
  snacks: 60, beverages: 30, other: 30,
};

const STORAGE_BY_CATEGORY: Record<string, string> = {
  produce: 'fridge',
  protein: 'fridge',
  dairy: 'fridge',
  grains: 'pantry',
  frozen: 'freezer',
  canned: 'pantry',
  condiments: 'pantry',
  snacks: 'pantry',
  beverages: 'fridge',
  other: 'pantry',
};

function inferStorageLocation(itemName: string): string {
  const lower = itemName.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return STORAGE_BY_CATEGORY[category] || 'pantry';
    }
  }
  return 'pantry';
}

function inferItemCategory(itemName: string): string {
  const lower = itemName.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return 'other';
}

// ─── Unit Conversion System ────────────────────────────────────────────────

const UNIT_ALIASES: Record<string, string> = {
  lb: 'pound', lbs: 'pound', pound: 'pound', pounds: 'pound',
  oz: 'ounce', ounce: 'ounce', ounces: 'ounce',
  g: 'gram', gram: 'gram', grams: 'gram',
  kg: 'kilogram', kilogram: 'kilogram', kilograms: 'kilogram',
  cup: 'cup', cups: 'cup',
  tbsp: 'tablespoon', tablespoon: 'tablespoon', tablespoons: 'tablespoon',
  tsp: 'teaspoon', teaspoon: 'teaspoon', teaspoons: 'teaspoon',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'liter', liter: 'liter', liters: 'liter',
  gal: 'gallon', gallon: 'gallon', gallons: 'gallon',
  pt: 'pint', pint: 'pint', pints: 'pint',
  qt: 'quart', quart: 'quart', quarts: 'quart',
  piece: 'piece', pieces: 'piece', whole: 'piece', count: 'piece', each: 'piece',
  can: 'can', cans: 'can',
  bag: 'bag', bags: 'bag',
  box: 'box', boxes: 'box',
  bunch: 'bunch', bunches: 'bunch',
  head: 'head', heads: 'head',
  clove: 'clove', cloves: 'clove',
  slice: 'slice', slices: 'slice',
  pack: 'pack', package: 'pack', packages: 'pack', packs: 'pack',
  bottle: 'bottle', bottles: 'bottle',
};

function normalizeUnit(unit: string): string {
  if (!unit) return 'piece';
  return UNIT_ALIASES[unit.toLowerCase().trim()] || unit.toLowerCase().trim();
}

// Conversion factors to a base unit within each measurement family
// Weight: base = gram
const WEIGHT_TO_GRAM: Record<string, number> = {
  gram: 1, kilogram: 1000, ounce: 28.3495, pound: 453.592,
};
// Volume: base = ml
const VOLUME_TO_ML: Record<string, number> = {
  ml: 1, liter: 1000, teaspoon: 4.929, tablespoon: 14.787,
  cup: 236.588, pint: 473.176, quart: 946.353, gallon: 3785.41,
};

function getUnitFamily(unit: string): 'weight' | 'volume' | 'count' {
  const n = normalizeUnit(unit);
  if (WEIGHT_TO_GRAM[n]) return 'weight';
  if (VOLUME_TO_ML[n]) return 'volume';
  return 'count';
}

function convertAndAdd(qty1: number, unit1: string, qty2: number, unit2: string): { quantity: number; unit: string } {
  const n1 = normalizeUnit(unit1);
  const n2 = normalizeUnit(unit2);

  // Same normalized unit — just add
  if (n1 === n2) return { quantity: Math.round((qty1 + qty2) * 100) / 100, unit: unit1 };

  const family1 = getUnitFamily(unit1);
  const family2 = getUnitFamily(unit2);

  // Different families — can't convert, just add raw numbers and keep first unit
  if (family1 !== family2) return { quantity: Math.round((qty1 + qty2) * 100) / 100, unit: unit1 };

  if (family1 === 'weight') {
    const grams = qty1 * WEIGHT_TO_GRAM[n1] + qty2 * WEIGHT_TO_GRAM[n2];
    // Pick best unit for display
    if (grams >= 453.592) return { quantity: Math.round((grams / 453.592) * 100) / 100, unit: 'lbs' };
    if (grams >= 28.3495) return { quantity: Math.round((grams / 28.3495) * 100) / 100, unit: 'oz' };
    return { quantity: Math.round(grams * 100) / 100, unit: 'g' };
  }

  if (family1 === 'volume') {
    const mls = qty1 * VOLUME_TO_ML[n1] + qty2 * VOLUME_TO_ML[n2];
    if (mls >= 3785.41) return { quantity: Math.round((mls / 3785.41) * 100) / 100, unit: 'gallon' };
    if (mls >= 236.588) return { quantity: Math.round((mls / 236.588) * 100) / 100, unit: 'cups' };
    if (mls >= 14.787) return { quantity: Math.round((mls / 14.787) * 100) / 100, unit: 'tbsp' };
    return { quantity: Math.round((mls / 4.929) * 100) / 100, unit: 'tsp' };
  }

  // Count-type units (cans, bags, etc.) — just add
  return { quantity: Math.round((qty1 + qty2) * 100) / 100, unit: unit1 || unit2 };
}

// ─── Fuzzy Item Name Matching ──────────────────────────────────────────────

const ITEM_VARIATIONS: Record<string, string[]> = {
  'chicken breast': ['chicken breasts', 'boneless chicken', 'breast chicken', 'chicken breast boneless skinless'],
  'bell pepper': ['bell peppers', 'sweet pepper', 'sweet peppers', 'capsicum'],
  'ground beef': ['ground beef', 'beef ground', 'hamburger meat', 'minced beef'],
  'olive oil': ['olive oil', 'extra virgin olive oil', 'evoo'],
  'sour cream': ['sour cream', 'soured cream'],
  'cream cheese': ['cream cheese', 'philadelphia'],
  'green onion': ['green onions', 'scallion', 'scallions', 'spring onion', 'spring onions'],
  'heavy cream': ['heavy cream', 'heavy whipping cream', 'whipping cream'],
};

function normalizeItemName(name: string): string {
  return name.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(fresh|organic|large|small|medium|chopped|diced|sliced|minced)\b/g, '')
    .trim();
}

function findExistingItem(newName: string, existingItems: any[]): any | null {
  const normNew = normalizeItemName(newName);

  for (const item of existingItems) {
    const normExisting = normalizeItemName(item.name);

    // Exact normalized match
    if (normNew === normExisting) return item;

    // Substring match (one contains the other)
    if (normNew.includes(normExisting) || normExisting.includes(normNew)) return item;

    // Check variation groups
    for (const variants of Object.values(ITEM_VARIATIONS)) {
      const newMatchesGroup = variants.some(v => normNew.includes(v) || v.includes(normNew));
      const existingMatchesGroup = variants.some(v => normExisting.includes(v) || v.includes(normExisting));
      if (newMatchesGroup && existingMatchesGroup) return item;
    }

    // Word overlap: require majority of significant words to match
    // (previously too aggressive — "Item 1" matched "Item 2" on single word "item")
    const newWords = normNew.split(' ').filter(w => w.length > 2);
    const existingWords = normExisting.split(' ').filter(w => w.length > 2);
    if (newWords.length >= 2 && existingWords.length >= 2) {
      const commonWords = newWords.filter(w => existingWords.some(ew => ew === w));
      // Require at least 2 common words AND they cover the majority of both sets
      if (commonWords.length >= 2 && commonWords.length >= Math.max(newWords.length, existingWords.length) * 0.6) {
        return item;
      }
    }
  }

  return null;
}

// ─── Local Grocery Product Database ──────────────────────────────────────────
// Common grocery items with category and typical units for autocomplete

const GROCERY_PRODUCTS: Array<{ name: string; category: string; unit: string; commonUnits: string[] }> = [
  // Produce
  { name: 'Apples', category: 'produce', unit: 'count', commonUnits: ['count', 'lb', 'bag'] },
  { name: 'Avocado', category: 'produce', unit: 'count', commonUnits: ['count'] },
  { name: 'Bananas', category: 'produce', unit: 'bunch', commonUnits: ['bunch', 'count', 'lb'] },
  { name: 'Bell Pepper', category: 'produce', unit: 'count', commonUnits: ['count'] },
  { name: 'Broccoli', category: 'produce', unit: 'head', commonUnits: ['head', 'bunch', 'lb'] },
  { name: 'Carrots', category: 'produce', unit: 'lb', commonUnits: ['lb', 'bag', 'count'] },
  { name: 'Celery', category: 'produce', unit: 'bunch', commonUnits: ['bunch', 'count'] },
  { name: 'Cilantro', category: 'produce', unit: 'bunch', commonUnits: ['bunch'] },
  { name: 'Corn on the Cob', category: 'produce', unit: 'count', commonUnits: ['count'] },
  { name: 'Cucumber', category: 'produce', unit: 'count', commonUnits: ['count'] },
  { name: 'Garlic', category: 'produce', unit: 'head', commonUnits: ['head', 'clove'] },
  { name: 'Ginger', category: 'produce', unit: 'piece', commonUnits: ['piece', 'oz'] },
  { name: 'Green Beans', category: 'produce', unit: 'lb', commonUnits: ['lb', 'bag'] },
  { name: 'Green Onions', category: 'produce', unit: 'bunch', commonUnits: ['bunch'] },
  { name: 'Jalapeño', category: 'produce', unit: 'count', commonUnits: ['count'] },
  { name: 'Kale', category: 'produce', unit: 'bunch', commonUnits: ['bunch', 'bag'] },
  { name: 'Lemons', category: 'produce', unit: 'count', commonUnits: ['count', 'bag'] },
  { name: 'Lettuce', category: 'produce', unit: 'head', commonUnits: ['head', 'bag'] },
  { name: 'Limes', category: 'produce', unit: 'count', commonUnits: ['count', 'bag'] },
  { name: 'Mushrooms', category: 'produce', unit: 'oz', commonUnits: ['oz', 'lb', 'package'] },
  { name: 'Onion', category: 'produce', unit: 'count', commonUnits: ['count', 'lb'] },
  { name: 'Parsley', category: 'produce', unit: 'bunch', commonUnits: ['bunch'] },
  { name: 'Potatoes', category: 'produce', unit: 'lb', commonUnits: ['lb', 'bag', 'count'] },
  { name: 'Spinach', category: 'produce', unit: 'bag', commonUnits: ['bag', 'bunch', 'oz'] },
  { name: 'Sweet Potatoes', category: 'produce', unit: 'lb', commonUnits: ['lb', 'count'] },
  { name: 'Tomatoes', category: 'produce', unit: 'lb', commonUnits: ['lb', 'count'] },
  { name: 'Zucchini', category: 'produce', unit: 'count', commonUnits: ['count', 'lb'] },
  // Protein
  { name: 'Chicken Breast', category: 'protein', unit: 'lb', commonUnits: ['lb', 'oz', 'package'] },
  { name: 'Chicken Thighs', category: 'protein', unit: 'lb', commonUnits: ['lb', 'package'] },
  { name: 'Ground Beef', category: 'protein', unit: 'lb', commonUnits: ['lb'] },
  { name: 'Ground Turkey', category: 'protein', unit: 'lb', commonUnits: ['lb'] },
  { name: 'Salmon Fillet', category: 'protein', unit: 'lb', commonUnits: ['lb', 'oz', 'fillet'] },
  { name: 'Shrimp', category: 'protein', unit: 'lb', commonUnits: ['lb', 'bag'] },
  { name: 'Steak', category: 'protein', unit: 'lb', commonUnits: ['lb', 'oz'] },
  { name: 'Bacon', category: 'protein', unit: 'package', commonUnits: ['package', 'lb'] },
  { name: 'Eggs', category: 'protein', unit: 'dozen', commonUnits: ['dozen', 'count'] },
  { name: 'Tofu', category: 'protein', unit: 'package', commonUnits: ['package', 'oz'] },
  { name: 'Pork Chops', category: 'protein', unit: 'lb', commonUnits: ['lb', 'count'] },
  { name: 'Italian Sausage', category: 'protein', unit: 'lb', commonUnits: ['lb', 'package'] },
  // Dairy
  { name: 'Milk', category: 'dairy', unit: 'gallon', commonUnits: ['gallon', 'half gallon', 'quart'] },
  { name: 'Butter', category: 'dairy', unit: 'stick', commonUnits: ['stick', 'lb', 'tablespoon'] },
  { name: 'Cheddar Cheese', category: 'dairy', unit: 'oz', commonUnits: ['oz', 'lb', 'cup'] },
  { name: 'Cream Cheese', category: 'dairy', unit: 'oz', commonUnits: ['oz', 'package'] },
  { name: 'Greek Yogurt', category: 'dairy', unit: 'oz', commonUnits: ['oz', 'cup', 'container'] },
  { name: 'Heavy Cream', category: 'dairy', unit: 'pint', commonUnits: ['pint', 'cup', 'quart'] },
  { name: 'Mozzarella Cheese', category: 'dairy', unit: 'oz', commonUnits: ['oz', 'lb', 'bag'] },
  { name: 'Parmesan Cheese', category: 'dairy', unit: 'oz', commonUnits: ['oz', 'cup'] },
  { name: 'Sour Cream', category: 'dairy', unit: 'oz', commonUnits: ['oz', 'cup', 'container'] },
  // Grains & Baking
  { name: 'White Rice', category: 'grains', unit: 'lb', commonUnits: ['lb', 'cup', 'bag'] },
  { name: 'Brown Rice', category: 'grains', unit: 'lb', commonUnits: ['lb', 'cup', 'bag'] },
  { name: 'Pasta', category: 'grains', unit: 'lb', commonUnits: ['lb', 'box', 'oz'] },
  { name: 'Bread', category: 'grains', unit: 'loaf', commonUnits: ['loaf'] },
  { name: 'Tortillas', category: 'grains', unit: 'package', commonUnits: ['package', 'count'] },
  { name: 'All-Purpose Flour', category: 'grains', unit: 'lb', commonUnits: ['lb', 'cup', 'bag'] },
  { name: 'Quinoa', category: 'grains', unit: 'lb', commonUnits: ['lb', 'cup', 'bag'] },
  { name: 'Oats', category: 'grains', unit: 'oz', commonUnits: ['oz', 'cup', 'container'] },
  { name: 'Panko Breadcrumbs', category: 'grains', unit: 'oz', commonUnits: ['oz', 'cup'] },
  // Canned & Pantry
  { name: 'Black Beans', category: 'canned', unit: 'can', commonUnits: ['can', 'oz'] },
  { name: 'Chickpeas', category: 'canned', unit: 'can', commonUnits: ['can', 'oz'] },
  { name: 'Crushed Tomatoes', category: 'canned', unit: 'can', commonUnits: ['can', 'oz'] },
  { name: 'Diced Tomatoes', category: 'canned', unit: 'can', commonUnits: ['can', 'oz'] },
  { name: 'Tomato Paste', category: 'canned', unit: 'can', commonUnits: ['can', 'oz', 'tablespoon'] },
  { name: 'Coconut Milk', category: 'canned', unit: 'can', commonUnits: ['can', 'oz'] },
  { name: 'Chicken Broth', category: 'canned', unit: 'can', commonUnits: ['can', 'cup', 'oz'] },
  { name: 'Vegetable Broth', category: 'canned', unit: 'can', commonUnits: ['can', 'cup', 'oz'] },
  { name: 'Tuna', category: 'canned', unit: 'can', commonUnits: ['can'] },
  // Condiments & Oils
  { name: 'Olive Oil', category: 'condiments', unit: 'bottle', commonUnits: ['bottle', 'tablespoon', 'cup'] },
  { name: 'Vegetable Oil', category: 'condiments', unit: 'bottle', commonUnits: ['bottle', 'cup'] },
  { name: 'Soy Sauce', category: 'condiments', unit: 'bottle', commonUnits: ['bottle', 'tablespoon'] },
  { name: 'Hot Sauce', category: 'condiments', unit: 'bottle', commonUnits: ['bottle'] },
  { name: 'Ketchup', category: 'condiments', unit: 'bottle', commonUnits: ['bottle'] },
  { name: 'Mustard', category: 'condiments', unit: 'bottle', commonUnits: ['bottle', 'tablespoon'] },
  { name: 'Mayonnaise', category: 'condiments', unit: 'jar', commonUnits: ['jar', 'tablespoon'] },
  { name: 'Apple Cider Vinegar', category: 'condiments', unit: 'bottle', commonUnits: ['bottle', 'tablespoon'] },
  { name: 'Honey', category: 'condiments', unit: 'bottle', commonUnits: ['bottle', 'tablespoon'] },
  { name: 'Maple Syrup', category: 'condiments', unit: 'bottle', commonUnits: ['bottle', 'tablespoon'] },
  { name: 'Salsa', category: 'condiments', unit: 'jar', commonUnits: ['jar', 'oz'] },
  { name: 'Ranch Dressing', category: 'condiments', unit: 'bottle', commonUnits: ['bottle'] },
  // Spices
  { name: 'Salt', category: 'condiments', unit: 'container', commonUnits: ['container', 'teaspoon'] },
  { name: 'Black Pepper', category: 'condiments', unit: 'container', commonUnits: ['container', 'teaspoon'] },
  { name: 'Garlic Powder', category: 'condiments', unit: 'container', commonUnits: ['container', 'teaspoon'] },
  { name: 'Onion Powder', category: 'condiments', unit: 'container', commonUnits: ['container', 'teaspoon'] },
  { name: 'Paprika', category: 'condiments', unit: 'container', commonUnits: ['container', 'teaspoon'] },
  { name: 'Cumin', category: 'condiments', unit: 'container', commonUnits: ['container', 'teaspoon'] },
  { name: 'Chili Powder', category: 'condiments', unit: 'container', commonUnits: ['container', 'teaspoon'] },
  { name: 'Italian Seasoning', category: 'condiments', unit: 'container', commonUnits: ['container', 'teaspoon'] },
  { name: 'Cinnamon', category: 'condiments', unit: 'container', commonUnits: ['container', 'teaspoon'] },
  // Snacks
  { name: 'Tortilla Chips', category: 'snacks', unit: 'bag', commonUnits: ['bag', 'oz'] },
  { name: 'Crackers', category: 'snacks', unit: 'box', commonUnits: ['box'] },
  { name: 'Peanut Butter', category: 'snacks', unit: 'jar', commonUnits: ['jar', 'oz'] },
  { name: 'Almonds', category: 'snacks', unit: 'bag', commonUnits: ['bag', 'oz', 'cup'] },
  { name: 'Granola', category: 'snacks', unit: 'bag', commonUnits: ['bag', 'oz'] },
  // Beverages
  { name: 'Orange Juice', category: 'beverages', unit: 'bottle', commonUnits: ['bottle', 'gallon', 'oz'] },
  { name: 'Coffee', category: 'beverages', unit: 'bag', commonUnits: ['bag', 'oz', 'can'] },
  { name: 'Sparkling Water', category: 'beverages', unit: 'pack', commonUnits: ['pack', 'can', 'bottle'] },
  // Frozen
  { name: 'Frozen Berries', category: 'frozen', unit: 'bag', commonUnits: ['bag', 'oz'] },
  { name: 'Frozen Vegetables', category: 'frozen', unit: 'bag', commonUnits: ['bag', 'oz'] },
  { name: 'Ice Cream', category: 'frozen', unit: 'pint', commonUnits: ['pint', 'quart'] },
];

// ─── Input Sanitization ──────────────────────────────────────────────────
const MAX_NAME_LENGTH = 200;

function sanitizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')  // Strip HTML tags
    .slice(0, MAX_NAME_LENGTH)
    .trim();
}

const router = express.Router();

// ─── Search Relevance Helpers ─────────────────────────────────────────────

// Score how well a product name matches the search query (higher = better)
function scoreSearchRelevance(productName: string, query: string): number {
  const name = productName.toLowerCase();
  const q = query.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 85;
  if (name.includes(q)) return 70;
  // All query words present in name
  const words = q.split(/\s+/).filter(w => w.length > 1);
  if (words.length > 0 && words.every(w => name.includes(w))) return 55;
  // Partial word match — score by ratio of matched words
  const matched = words.filter(w => name.includes(w)).length;
  if (matched > 0) return 10 + Math.round((matched / words.length) * 30);
  return 0;
}

// Smart dedup: two names are duplicates only if they normalize to the same item
function isSearchDuplicate(newName: string, existingNames: Set<string>): boolean {
  const norm = newName.toLowerCase().trim();
  for (const existing of existingNames) {
    if (norm === existing) return true;
    // Only count as dupe if the shorter string is ≥50% of the longer string length
    // This prevents "milk" from blocking "tru moo chocolate milk"
    const shorter = norm.length < existing.length ? norm : existing;
    const longer = norm.length < existing.length ? existing : norm;
    if (longer.includes(shorter) && shorter.length >= longer.length * 0.5) return true;
  }
  return false;
}

// ─── Goal-Aware Search Boost ─────────────────────────────────────────────

// Search modifiers: when user has a goal, we fire a secondary Kroger search
// e.g. "chocolate milk" + high-protein → also search "protein chocolate milk"
const GOAL_SEARCH_MODIFIERS: Record<string, string[]> = {
  'high-protein': ['protein', 'fairlife', 'high protein'],
  'protein': ['protein', 'fairlife', 'high protein'],
  'low-carb': ['low carb', 'keto', 'sugar free'],
  'keto': ['keto', 'low carb', 'sugar free'],
  'low-calorie': ['light', 'low fat', 'zero sugar'],
  'weight-loss': ['light', 'lean', 'low calorie'],
  'vegetarian': ['plant based', 'veggie'],
  'vegan': ['plant based', 'vegan', 'dairy free'],
  'gluten-free': ['gluten free'],
  'dairy-free': ['dairy free', 'oat', 'almond'],
};

// GOAL_BOOST_KEYWORDS, goalBoostScore, parseSizeToOz, priceValueBonus
// imported from '../services/grocery-prices'

// POST /api/shopping-lists/set-kroger-location — Save user's nearest Kroger store
router.post('/set-kroger-location', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const { findNearestKrogerLocationCached } = await import('../services/grocery-prices');
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

    const { searchKrogerProducts, getBannerInfo } = await import('../services/grocery-prices');

    const results = await Promise.all(
      items.slice(0, 10).map(async (query: string) => {
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
        const top3 = scored.slice(0, 3);
        const byValue = [...top3].sort((a, b) => a._pricePerOz - b._pricePerOz);

        return {
          query,
          products: top3.map(p => ({
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
        const { findNearestKrogerLocationCached, searchKrogerProducts } = await import('../services/grocery-prices');
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

// GET /api/shopping-lists
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const lists = await prisma.shoppingList.findMany({
      where: { userId: req.user!.userId },
      include: {
        items: true,
        _count: {
          select: { items: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ lists });
  } catch (error) {
    console.error('Get shopping lists error:', error);
    res.status(500).json({ error: 'Failed to fetch shopping lists' });
  }
});

// POST /api/shopping-lists
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { name: rawName, description, sourceType, sourceRecipeId, items } = req.body;
    const name = rawName ? sanitizeText(rawName) : rawName;

    // Handle mock recipes by not setting sourceRecipeId foreign key
    const listData: any = {
      userId: req.user!.userId,
      name,
      description: description ? sanitizeText(description) : description,
      sourceType
    };
    
    // Only set sourceRecipeId for real recipes (not mock ones)
    if (sourceRecipeId && !sourceRecipeId.startsWith('mock-')) {
      listData.sourceRecipeId = sourceRecipeId;
    }
    
    const list = await prisma.shoppingList.create({
      data: listData
    });
    
    // Auto-populate items from recipe if sourceRecipeId provided
    if (sourceRecipeId && !sourceRecipeId.startsWith('mock-')) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: sourceRecipeId }
      });
      
      if (recipe && recipe.ingredients) {
        const ingredients = typeof recipe.ingredients === 'string' 
          ? JSON.parse(recipe.ingredients) 
          : recipe.ingredients;
        
        if (Array.isArray(ingredients) && ingredients.length > 0) {
          await prisma.shoppingListItem.createMany({
            data: ingredients.map((ing: any) => ({
              shoppingListId: list.id,
              name: ing.name,
              quantity: ing.amount || null,
              unit: ing.unit || null,
              category: null
            }))
          });
        }
      }
    }
    
    // Also handle manually passed items array
    if (items && Array.isArray(items) && items.length > 0) {
      await prisma.shoppingListItem.createMany({
        data: items.map((item: any) => ({
          shoppingListId: list.id,
          name: item.name,
          quantity: item.quantity || null,
          unit: item.unit || null,
          category: item.category || null
        }))
      });
    }
    
    // Fetch the complete list with items
    const completeList = await prisma.shoppingList.findUnique({
      where: { id: list.id },
      include: { items: true }
    });
    
    res.status(201).json({ list: completeList });
  } catch (error) {
    console.error('Create shopping list error:', error);
    res.status(500).json({ error: 'Failed to create shopping list' });
  }
});

// DELETE /api/shopping-lists/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const list = await prisma.shoppingList.findFirst({
      where: { id, userId: req.user!.userId }
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    await prisma.shoppingList.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete shopping list error:', error);
    res.status(500).json({ error: 'Failed to delete shopping list' });
  }
});

// POST /api/shopping-lists/:id/items
// Smart aggregation: if a matching item exists, update quantity instead of duplicating
router.post('/:id/items', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name: rawItemName, quantity, unit, category, krogerProductId } = req.body;
    const name = rawItemName ? sanitizeText(rawItemName) : rawItemName;

    // Verify ownership and get existing items
    const list = await prisma.shoppingList.findFirst({
      where: { id, userId: req.user!.userId },
      include: { items: { where: { isChecked: false } } }
    });

    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Check for existing matching item (fuzzy match)
    const existing = findExistingItem(name, list.items);

    if (existing) {
      // Aggregate quantities
      const existingQty = existing.quantity || 0;
      const existingUnit = existing.unit || '';
      const newQty = quantity || 0;
      const newUnit = unit || existingUnit;

      let finalQty = existingQty;
      let finalUnit = existingUnit || newUnit;

      if (newQty > 0 && existingQty > 0) {
        const converted = convertAndAdd(existingQty, existingUnit, newQty, newUnit);
        finalQty = converted.quantity;
        finalUnit = converted.unit;
      } else if (newQty > 0) {
        finalQty = newQty;
        finalUnit = newUnit;
      }

      // Build notes showing aggregation history
      const prevNotes = existing.notes || '';
      const historyEntry = `${existingQty || '?'} ${existingUnit} + ${newQty || '?'} ${newUnit}`;
      const newNotes = prevNotes
        ? `${prevNotes} + ${newQty || '?'} ${newUnit}`
        : historyEntry;

      const item = await prisma.shoppingListItem.update({
        where: { id: existing.id },
        data: {
          quantity: finalQty,
          unit: finalUnit,
          notes: newNotes,
          // Upgrade krogerProductId if the new item has one and the existing doesn't
          ...(krogerProductId && !existing.krogerProductId ? { krogerProductId } : {}),
        },
      });

      res.status(200).json({
        item,
        action: 'aggregated',
        message: `Updated "${existing.name}" to ${finalQty} ${finalUnit} (was ${existingQty} ${existingUnit})`,
      });
    } else {
      // No match — create new item
      const item = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: id,
          name,
          quantity,
          unit,
          category,
          krogerProductId,
        }
      });

      res.status(201).json({ item, action: 'created' });
    }
  } catch (error) {
    console.error('Add shopping list item error:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// PATCH /api/shopping-lists/:listId/items/:itemId
// Supports editing name, quantity, unit, AND toggling isChecked
router.patch('/:listId/items/:itemId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId, itemId } = req.params;
    const { isChecked, name: rawEditName, quantity, unit, notes, krogerProductId } = req.body;
    const name = rawEditName !== undefined ? sanitizeText(rawEditName) : undefined;

    // Verify ownership
    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId }
    });

    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const updateData: any = {};
    if (isChecked !== undefined) {
      updateData.isChecked = isChecked;
      updateData.checkedAt = isChecked ? new Date() : null;
    }
    if (name !== undefined) updateData.name = name;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (unit !== undefined) updateData.unit = unit;
    if (notes !== undefined) updateData.notes = notes;
    if (krogerProductId !== undefined) updateData.krogerProductId = krogerProductId;

    // Only clear cart tracking when name truly changes (different product).
    // Quantity-only edits preserve krogerCartQuantity for partial-add support.
    if (name !== undefined && krogerProductId === undefined) {
      const existing = await prisma.shoppingListItem.findUnique({
        where: { id: itemId },
        select: { name: true },
      });
      if (existing && existing.name.toLowerCase() !== name.toLowerCase()) {
        updateData.addedToKrogerCartAt = null;
        updateData.krogerCartQuantity = null;
        updateData.krogerProductId = null;
      }
    }

    const item = await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: updateData
    });

    // Check if all items are now checked (for auto-archive)
    if (isChecked === true) {
      const allItems = await prisma.shoppingListItem.findMany({
        where: { shoppingListId: listId }
      });
      const allChecked = allItems.every(i => i.isChecked);
      const listAge = Date.now() - list.createdAt.getTime();
      const oneHour = 60 * 60 * 1000;

      if (allChecked && listAge > oneHour) {
        await prisma.shoppingList.update({
          where: { id: listId },
          data: { isActive: false, completedAt: new Date() }
        });
        return res.json({ item, listCompleted: true, message: 'Shopping list completed and archived' });
      }
    }

    res.json({ item });
  } catch (error) {
    console.error('Update shopping list item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// POST /api/shopping-lists/:listId/mark-carted — Bulk-mark items as added to Kroger cart
router.post('/:listId/mark-carted', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId } = req.params;
    const { itemIds, itemQuantities } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'itemIds array required' });
    }

    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId },
    });

    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Track per-item quantity if provided
    const qtyMap: Record<string, number> = itemQuantities || {};
    let count = 0;
    for (const itemId of itemIds) {
      const addedQty = qtyMap[itemId] || 0;
      const existing = await prisma.shoppingListItem.findUnique({
        where: { id: itemId },
        select: { krogerCartQuantity: true },
      });
      const prevQty = existing?.krogerCartQuantity || 0;
      await prisma.shoppingListItem.update({
        where: { id: itemId },
        data: {
          addedToKrogerCartAt: new Date(),
          krogerCartQuantity: prevQty + addedQty,
        },
      });
      count++;
    }
    const result = { count };

    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Mark carted error:', error);
    res.status(500).json({ error: 'Failed to mark items as carted' });
  }
});

// PATCH /api/shopping-lists/:listId — Update list (name, archive, etc.)
router.patch('/:listId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId } = req.params;
    const { name, isActive } = req.body;

    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId }
    });

    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) {
      updateData.isActive = isActive;
      if (!isActive) updateData.completedAt = new Date();
    }

    const updated = await prisma.shoppingList.update({
      where: { id: listId },
      data: updateData,
      include: { items: true }
    });

    res.json({ list: updated });
  } catch (error) {
    console.error('Update shopping list error:', error);
    res.status(500).json({ error: 'Failed to update shopping list' });
  }
});

// DELETE /api/shopping-lists/:listId/items/:itemId
router.delete('/:listId/items/:itemId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId, itemId } = req.params;
    
    // Verify ownership
    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId }
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    await prisma.shoppingListItem.delete({ where: { id: itemId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete shopping list item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// POST /api/shopping-lists/:listId/items/:itemId/purchase
// Mark item as purchased AND add to inventory
router.post('/:listId/items/:itemId/purchase', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId, itemId } = req.params;
    const { storageLocation, category } = req.body;
    
    // Verify ownership
    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId }
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    // Get the item
    const item = await prisma.shoppingListItem.findUnique({
      where: { id: itemId }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Mark as checked
    await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: { 
        isChecked: true,
        checkedAt: new Date()
      }
    });
    
    // Add to inventory — auto-infer storage location if not provided
    const inferredStorage = storageLocation || inferStorageLocation(item.name);
    const inferredCategory = category || item.category || inferItemCategory(item.name);

    // Compute expiry date based on category/storage
    const expiryDays = inferredStorage === 'freezer' ? 120
      : CATEGORY_EXPIRY_DAYS[inferredCategory] || CATEGORY_EXPIRY_DAYS.other;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Check for existing inventory item (case-insensitive) to avoid duplicates
    const existingInventory = await prisma.inventoryItem.findFirst({
      where: {
        userId: req.user!.userId,
        name: { equals: item.name },
      },
    });

    let inventoryItem;
    if (existingInventory && existingInventory.name.toLowerCase() === item.name.toLowerCase()) {
      inventoryItem = await prisma.inventoryItem.update({
        where: { id: existingInventory.id },
        data: {
          quantity: (existingInventory.quantity || 0) + (item.quantity || 1),
          purchasedAt: new Date(),
          expiresAt,
        },
      });
    } else {
      inventoryItem = await prisma.inventoryItem.create({
        data: {
          userId: req.user!.userId,
          name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || 'pieces',
          category: inferredCategory,
          storageLocation: inferredStorage,
          purchasedAt: new Date(),
          expiresAt,
        }
      });
    }
    
    res.json({ 
      success: true, 
      message: `${item.name} added to inventory`,
      inventoryItem 
    });
  } catch (error) {
    console.error('Purchase item error:', error);
    res.status(500).json({ error: 'Failed to purchase item' });
  }
});

// GET /api/shopping-lists/:listId/purchase-preview
// Preview storage locations for all unchecked items (auto-inferred)
router.get('/:listId/purchase-preview', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId } = req.params;

    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId },
      include: { items: true }
    });

    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const uncheckedItems = list.items.filter(item => !item.isChecked);

    const preview = uncheckedItems.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: inferItemCategory(item.name),
      storageLocation: inferStorageLocation(item.name),
    }));

    res.json({ items: preview });
  } catch (error) {
    console.error('Purchase preview error:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// POST /api/shopping-lists/:listId/purchase-all
// Mark all checked items as purchased AND add to inventory
// Accepts optional itemLocations array for per-item storage overrides
router.post('/:listId/purchase-all', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { listId } = req.params;
    // itemLocations: [{itemId, storageLocation}] — per-item overrides
    const { itemLocations } = req.body;

    // Verify ownership and get list with items
    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId: req.user!.userId },
      include: { items: true }
    });

    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Purchase checked items (or all unchecked if no checked items)
    const checkedItems = list.items.filter(item => item.isChecked);
    const itemsToPurchase = checkedItems.length > 0 ? checkedItems : list.items.filter(item => !item.isChecked);

    if (itemsToPurchase.length === 0) {
      return res.json({ success: true, message: 'No items to purchase', count: 0 });
    }

    // Build location map from overrides
    const locationMap: Record<string, string> = {};
    if (Array.isArray(itemLocations)) {
      for (const loc of itemLocations) {
        if (loc.itemId && loc.storageLocation) {
          locationMap[loc.itemId] = loc.storageLocation;
        }
      }
    }

    // Mark all as checked
    await prisma.shoppingListItem.updateMany({
      where: {
        id: { in: itemsToPurchase.map(i => i.id) },
      },
      data: {
        isChecked: true,
        checkedAt: new Date()
      }
    });

    // Add all to inventory with per-item storage inference + dedup + expiry
    const inventoryItems = await Promise.all(
      itemsToPurchase.map(async item => {
        const storage = locationMap[item.id] || inferStorageLocation(item.name);
        const category = inferItemCategory(item.name);
        const expiryDays = storage === 'freezer' ? 120
          : CATEGORY_EXPIRY_DAYS[category] || CATEGORY_EXPIRY_DAYS.other;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        // Check for existing inventory item to avoid duplicates
        const existingInventory = await prisma.inventoryItem.findFirst({
          where: {
            userId: req.user!.userId,
            name: { equals: item.name },
          },
        });

        if (existingInventory && existingInventory.name.toLowerCase() === item.name.toLowerCase()) {
          return prisma.inventoryItem.update({
            where: { id: existingInventory.id },
            data: {
              quantity: (existingInventory.quantity || 0) + (item.quantity || 1),
              purchasedAt: new Date(),
              expiresAt,
            },
          });
        }

        return prisma.inventoryItem.create({
          data: {
            userId: req.user!.userId,
            name: item.name,
            quantity: item.quantity || 1,
            unit: item.unit || 'pieces',
            category,
            storageLocation: storage,
            purchasedAt: new Date(),
            expiresAt,
          }
        });
      })
    );

    // Auto-archive if all items now checked and list is old enough
    const allItems = await prisma.shoppingListItem.findMany({
      where: { shoppingListId: listId }
    });
    const allChecked = allItems.every(i => i.isChecked);
    let listArchived = false;
    if (allChecked) {
      const listAge = Date.now() - list.createdAt.getTime();
      if (listAge > 60 * 60 * 1000) { // >1 hour old
        await prisma.shoppingList.update({
          where: { id: listId },
          data: { isActive: false, completedAt: new Date() }
        });
        listArchived = true;
      }
    }

    res.json({
      success: true,
      message: `${inventoryItems.length} items added to inventory`,
      count: inventoryItems.length,
      inventoryItems,
      listArchived,
    });
  } catch (error) {
    console.error('Purchase all items error:', error);
    res.status(500).json({ error: 'Failed to purchase items' });
  }
});

// POST /api/shopping-lists/:id/items/bulk
// Parse raw text (one item per line or comma-separated) and add all items at once
router.post('/:id/items/bulk', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { items: rawText } = req.body;

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ error: 'Items text is required' });
    }

    // Verify ownership
    const list = await prisma.shoppingList.findFirst({
      where: { id, userId: req.user!.userId }
    });

    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Split by newlines or commas, trim each line
    const lines = rawText.split(/[\n,]+/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);

    if (lines.length === 0) {
      return res.status(400).json({ error: 'No items found in text' });
    }

    // Parse each line: "chicken breast 3 lbs" → name, qty, unit
    // Regex: optional leading quantity + unit at the end, rest is name
    const parsedItems = lines.map((line: string) => {
      // Try pattern: "name qty unit" e.g. "chicken breast 3 lbs"
      const trailingMatch = line.match(/^(.+?)\s+(\d+\.?\d*)\s*([a-zA-Z]+)$/);
      if (trailingMatch) {
        return {
          name: trailingMatch[1].trim(),
          quantity: parseFloat(trailingMatch[2]),
          unit: trailingMatch[3],
          category: inferItemCategory(trailingMatch[1].trim()),
        };
      }

      // Try pattern: "qty unit name" e.g. "3 lbs chicken breast"
      const leadingMatch = line.match(/^(\d+\.?\d*)\s*([a-zA-Z]+)\s+(.+)$/);
      if (leadingMatch) {
        return {
          name: leadingMatch[3].trim(),
          quantity: parseFloat(leadingMatch[1]),
          unit: leadingMatch[2],
          category: inferItemCategory(leadingMatch[3].trim()),
        };
      }

      // Try pattern: "qty name" e.g. "3 chicken breasts"
      const qtyOnlyMatch = line.match(/^(\d+\.?\d*)\s+(.+)$/);
      if (qtyOnlyMatch) {
        return {
          name: qtyOnlyMatch[2].trim(),
          quantity: parseFloat(qtyOnlyMatch[1]),
          unit: null,
          category: inferItemCategory(qtyOnlyMatch[2].trim()),
        };
      }

      // Just a name
      return {
        name: line,
        quantity: null,
        unit: null,
        category: inferItemCategory(line),
      };
    });

    // Create all items
    await prisma.shoppingListItem.createMany({
      data: parsedItems.map((item: any) => ({
        shoppingListId: id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
      })),
    });

    // Fetch updated list
    const updatedList = await prisma.shoppingList.findUnique({
      where: { id },
      include: { items: true },
    });

    res.status(201).json({
      count: parsedItems.length,
      items: parsedItems,
      list: updatedList,
    });
  } catch (error) {
    console.error('Bulk add items error:', error);
    res.status(500).json({ error: 'Failed to add items' });
  }
});

export default router;