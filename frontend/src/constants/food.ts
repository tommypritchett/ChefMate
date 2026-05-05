// Shared food-related constants used across inventory, shopping, and recipes

export const STORAGE_LOCATIONS = ['fridge', 'freezer', 'pantry'] as const;

export const STORAGE_ICONS: Record<string, string> = {
  fridge: 'snow-outline',
  freezer: 'cube-outline',
  pantry: 'file-tray-stacked-outline',
};

// Inventory uses 'meat/protein', shopping uses 'meat' — keep both
export const INVENTORY_CATEGORIES = ['produce', 'dairy', 'meat/protein', 'grains', 'condiments', 'beverages', 'other'];
export const SHOPPING_CATEGORY_ORDER = ['produce', 'dairy', 'meat', 'grains', 'condiments', 'beverages', 'other'];

// ─── Item-Aware Expiration Defaults (days) ───────────────────────────────
// Used by backend getShelfLifeDays() and frontend for display hints.
// Item-name keywords → days. Checked before broad category fallback.
export const EXPIRY_BY_ITEM_KEYWORD: Array<{ keywords: string[]; days: number; label: string }> = [
  // Seafood — most perishable
  { keywords: ['salmon', 'shrimp', 'fish', 'tuna fillet', 'cod', 'tilapia', 'crab', 'lobster', 'scallop', 'mussels', 'clams', 'sushi'], days: 2, label: 'Seafood' },
  // Fresh meat/poultry
  { keywords: ['chicken', 'turkey', 'ground beef', 'ground pork', 'ground turkey', 'steak', 'pork chop', 'beef', 'pork', 'lamb', 'veal', 'sausage', 'brat'], days: 3, label: 'Fresh meat' },
  { keywords: ['bacon'], days: 7, label: 'Cured meat' },
  // Deli / leftovers
  { keywords: ['deli', 'lunch meat', 'leftover', 'rotisserie', 'cooked'], days: 4, label: 'Deli/leftovers' },
  // Eggs
  { keywords: ['egg'], days: 21, label: 'Eggs' },
  // Dairy — specific before broad
  { keywords: ['milk', 'half and half', 'half & half', 'creamer'], days: 7, label: 'Milk' },
  { keywords: ['yogurt', 'greek yogurt', 'kefir'], days: 14, label: 'Yogurt' },
  { keywords: ['cream cheese', 'ricotta', 'cottage cheese', 'brie', 'feta', 'mozzarella', 'fresh cheese'], days: 7, label: 'Soft cheese' },
  { keywords: ['cheddar', 'parmesan', 'swiss', 'gouda', 'provolone', 'gruyere', 'hard cheese'], days: 30, label: 'Hard cheese' },
  { keywords: ['butter'], days: 30, label: 'Butter' },
  { keywords: ['sour cream', 'heavy cream', 'whipping cream'], days: 14, label: 'Cream' },
  // Produce — leafy
  { keywords: ['spinach', 'lettuce', 'kale', 'arugula', 'mixed greens', 'salad', 'basil', 'cilantro', 'parsley', 'dill', 'mint', 'herb'], days: 5, label: 'Leafy greens' },
  // Produce — fruit
  { keywords: ['berry', 'berries', 'strawberry', 'blueberry', 'raspberry', 'grape', 'cherry', 'peach', 'plum', 'nectarine', 'mango', 'pineapple', 'melon', 'watermelon', 'banana', 'avocado', 'kiwi', 'pear'], days: 7, label: 'Fresh fruit' },
  // Produce — root/hardy
  { keywords: ['potato', 'sweet potato', 'onion', 'garlic', 'carrot', 'beet', 'turnip', 'squash', 'cabbage', 'ginger', 'celery root'], days: 14, label: 'Root vegetables' },
  // Produce — other fresh
  { keywords: ['tomato', 'pepper', 'bell pepper', 'cucumber', 'zucchini', 'broccoli', 'cauliflower', 'celery', 'corn', 'mushroom', 'green bean', 'asparagus', 'eggplant'], days: 7, label: 'Fresh vegetables' },
  // Bread
  { keywords: ['bread', 'bagel', 'muffin', 'roll', 'bun', 'tortilla', 'pita', 'naan'], days: 7, label: 'Bread' },
  // Condiments (opened)
  { keywords: ['ketchup', 'mustard', 'mayo', 'mayonnaise', 'hot sauce', 'sriracha', 'soy sauce', 'dressing', 'salsa', 'bbq sauce', 'teriyaki', 'vinegar', 'relish', 'hummus', 'pesto'], days: 30, label: 'Condiments' },
  // Frozen
  { keywords: ['frozen', 'ice cream', 'popsicle', 'pizza rolls'], days: 90, label: 'Frozen' },
  // Dry/pantry goods
  { keywords: ['rice', 'pasta', 'flour', 'sugar', 'oat', 'cereal', 'quinoa', 'lentil', 'bean', 'chickpea', 'canned', 'can of', 'nut', 'almond', 'peanut butter', 'honey', 'maple syrup', 'oil', 'olive oil', 'vinegar', 'spice', 'seasoning', 'salt', 'pepper', 'baking'], days: 365, label: 'Dry/pantry' },
];

// Broad category fallback (when no item keyword matches)
export const EXPIRY_BY_CATEGORY: Record<string, number> = {
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

/** Look up shelf life in days for an item by name, then category fallback */
export function getShelfLifeDaysForItem(itemName: string, category?: string, storageLocation?: string): number {
  if (storageLocation?.toLowerCase() === 'freezer') return 90;

  const lower = itemName.toLowerCase();
  for (const entry of EXPIRY_BY_ITEM_KEYWORD) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.days;
    }
  }

  // Category fallback
  if (category) {
    const catDays = EXPIRY_BY_CATEGORY[category.toLowerCase()];
    if (catDays) return catDays;
  }

  return storageLocation?.toLowerCase() === 'pantry' ? 90 : 7;
}
