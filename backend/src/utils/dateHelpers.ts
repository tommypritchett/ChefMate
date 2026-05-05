/**
 * Date/Timezone Utilities
 *
 * All dates are stored in UTC in the database.
 * These helpers ensure consistent date handling across the application.
 */

/**
 * Converts a date string (YYYY-MM-DD) to UTC midnight
 * This ensures dates are stored consistently regardless of user timezone
 */
export function toUTCMidnight(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Converts a Date object to UTC midnight
 */
export function setUTCMidnight(date: Date): Date {
  const utcDate = new Date(date);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
}

/**
 * Gets today's date at UTC midnight
 */
export function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Formats a Date to YYYY-MM-DD in UTC
 */
export function formatDateUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a date parameter from request (handles both Date objects and strings)
 * Returns UTC midnight
 */
export function parseDateParam(dateParam: string | Date | undefined): Date | null {
  if (!dateParam) return null;

  if (dateParam instanceof Date) {
    return setUTCMidnight(dateParam);
  }

  if (typeof dateParam === 'string') {
    // Handle ISO string format (e.g., "2024-03-25T00:00:00.000Z")
    if (dateParam.includes('T')) {
      const date = new Date(dateParam);
      return setUTCMidnight(date);
    }

    // Handle simple date format (e.g., "2024-03-25")
    return toUTCMidnight(dateParam);
  }

  return null;
}

/**
 * Calculates expiry date from storage location, category, and item name
 */
export function calculateExpiryDate(
  storageLocation: string,
  category?: string,
  purchasedAt?: Date,
  itemName?: string,
): Date {
  const baseDate = purchasedAt || new Date();
  const days = getShelfLifeDays(storageLocation, category, itemName);

  const expiryDate = new Date(baseDate);
  expiryDate.setUTCDate(expiryDate.getUTCDate() + days);
  return setUTCMidnight(expiryDate);
}

// Item-name keyword → shelf life in days (checked before broad category)
const ITEM_SHELF_LIFE: Array<{ keywords: string[]; days: number }> = [
  // Seafood — most perishable
  { keywords: ['salmon', 'shrimp', 'fish', 'tuna fillet', 'cod', 'tilapia', 'crab', 'lobster', 'scallop', 'mussels', 'clams', 'sushi'], days: 2 },
  // Fresh meat/poultry
  { keywords: ['chicken', 'turkey', 'ground beef', 'ground pork', 'ground turkey', 'steak', 'pork chop', 'beef', 'pork', 'lamb', 'veal', 'sausage', 'brat'], days: 3 },
  { keywords: ['bacon'], days: 7 },
  // Deli / leftovers
  { keywords: ['deli', 'lunch meat', 'leftover', 'rotisserie', 'cooked'], days: 4 },
  // Eggs
  { keywords: ['egg'], days: 21 },
  // Dairy — specific before broad
  { keywords: ['milk', 'half and half', 'half & half', 'creamer'], days: 7 },
  { keywords: ['yogurt', 'greek yogurt', 'kefir'], days: 14 },
  { keywords: ['cream cheese', 'ricotta', 'cottage cheese', 'brie', 'feta', 'mozzarella', 'fresh cheese'], days: 7 },
  { keywords: ['cheddar', 'parmesan', 'swiss', 'gouda', 'provolone', 'gruyere', 'hard cheese'], days: 30 },
  { keywords: ['butter'], days: 30 },
  { keywords: ['sour cream', 'heavy cream', 'whipping cream'], days: 14 },
  // Produce — leafy
  { keywords: ['spinach', 'lettuce', 'kale', 'arugula', 'mixed greens', 'salad', 'basil', 'cilantro', 'parsley', 'dill', 'mint', 'herb'], days: 5 },
  // Produce — fruit
  { keywords: ['berry', 'berries', 'strawberry', 'blueberry', 'raspberry', 'grape', 'cherry', 'peach', 'plum', 'nectarine', 'mango', 'pineapple', 'melon', 'watermelon', 'banana', 'avocado', 'kiwi', 'pear'], days: 7 },
  // Produce — root/hardy
  { keywords: ['potato', 'sweet potato', 'onion', 'garlic', 'carrot', 'beet', 'turnip', 'squash', 'cabbage', 'ginger', 'celery root'], days: 14 },
  // Produce — other fresh
  { keywords: ['tomato', 'pepper', 'bell pepper', 'cucumber', 'zucchini', 'broccoli', 'cauliflower', 'celery', 'corn', 'mushroom', 'green bean', 'asparagus', 'eggplant'], days: 7 },
  // Bread
  { keywords: ['bread', 'bagel', 'muffin', 'roll', 'bun', 'tortilla', 'pita', 'naan'], days: 7 },
  // Condiments (opened)
  { keywords: ['ketchup', 'mustard', 'mayo', 'mayonnaise', 'hot sauce', 'sriracha', 'soy sauce', 'dressing', 'salsa', 'bbq sauce', 'teriyaki', 'vinegar', 'relish', 'hummus', 'pesto'], days: 30 },
  // Frozen
  { keywords: ['frozen', 'ice cream', 'popsicle', 'pizza rolls'], days: 90 },
  // Dry/pantry goods
  { keywords: ['rice', 'pasta', 'flour', 'sugar', 'oat', 'cereal', 'quinoa', 'lentil', 'bean', 'chickpea', 'canned', 'can of', 'nut', 'almond', 'peanut butter', 'honey', 'maple syrup', 'oil', 'olive oil', 'spice', 'seasoning', 'salt', 'baking'], days: 365 },
];

// Broad category fallback
const CATEGORY_SHELF_LIFE: Record<string, number> = {
  produce: 7,
  'meat/protein': 3,
  protein: 3,
  meat: 3,
  dairy: 10,
  grains: 180,
  frozen: 90,
  canned: 365,
  condiments: 30,
  snacks: 60,
  beverages: 30,
  bread: 7,
  other: 30,
};

/**
 * Gets shelf life in days — checks item name first, then category, then storage default
 */
function getShelfLifeDays(storageLocation: string, category?: string, itemName?: string): number {
  const loc = storageLocation.toLowerCase();

  if (loc === 'freezer') return 90;

  // 1) Item-name keyword match (most specific)
  if (itemName) {
    const lower = itemName.toLowerCase();
    for (const entry of ITEM_SHELF_LIFE) {
      if (entry.keywords.some(kw => lower.includes(kw))) {
        return entry.days;
      }
    }
  }

  // 2) Category fallback
  if (category && CATEGORY_SHELF_LIFE[category.toLowerCase()]) {
    return CATEGORY_SHELF_LIFE[category.toLowerCase()];
  }

  // 3) Storage-based default
  return loc === 'pantry' ? 90 : 7;
}
