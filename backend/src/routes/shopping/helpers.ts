import { goalBoostScore, priceValueBonus, parseSizeToOz, GOAL_BOOST_KEYWORDS } from '../../services/grocery-prices';

// Re-export grocery-prices imports so search.ts and lists.ts can use them
export { goalBoostScore, priceValueBonus, parseSizeToOz, GOAL_BOOST_KEYWORDS };

// Category inference for auto-detecting storage locations
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
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
export const CATEGORY_EXPIRY_DAYS: Record<string, number> = {
  produce: 7, 'meat/protein': 4, protein: 4, meat: 4, dairy: 14,
  grains: 180, frozen: 120, canned: 365, condiments: 90,
  snacks: 60, beverages: 30, other: 30,
};

export const STORAGE_BY_CATEGORY: Record<string, string> = {
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

export function inferStorageLocation(itemName: string): string {
  const lower = itemName.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return STORAGE_BY_CATEGORY[category] || 'pantry';
    }
  }
  return 'pantry';
}

export function inferItemCategory(itemName: string): string {
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

export function convertAndAdd(qty1: number, unit1: string, qty2: number, unit2: string): { quantity: number; unit: string } {
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

export function findExistingItem(newName: string, existingItems: any[]): any | null {
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

export const GROCERY_PRODUCTS: Array<{ name: string; category: string; unit: string; commonUnits: string[] }> = [
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

export function sanitizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')  // Strip HTML tags
    .slice(0, MAX_NAME_LENGTH)
    .trim();
}

// ─── Search Relevance Helpers ─────────────────────────────────────────────

// Score how well a product name matches the search query (higher = better)
export function scoreSearchRelevance(productName: string, query: string): number {
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
export function isSearchDuplicate(newName: string, existingNames: Set<string>): boolean {
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
export const GOAL_SEARCH_MODIFIERS: Record<string, string[]> = {
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
