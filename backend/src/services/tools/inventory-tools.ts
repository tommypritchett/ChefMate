import prisma from '../../lib/prisma';

export async function getInventory(args: Record<string, any>, userId: string) {
  const items = await prisma.inventoryItem.findMany({
    where: { userId },
    orderBy: { expiresAt: 'asc' },
  });

  const grouped: Record<string, any[]> = {
    fridge: [],
    freezer: [],
    pantry: [],
    other: [],
  };

  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const expiringSoon: any[] = [];

  for (const item of items) {
    const loc = (item.storageLocation || 'other').toLowerCase();
    const bucket = grouped[loc] || grouped.other;
    const entry = {
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiresAt: item.expiresAt,
    };
    bucket.push(entry);

    if (item.expiresAt && new Date(item.expiresAt) <= threeDays) {
      expiringSoon.push(entry);
    }
  }

  const allItemNames = items.map(i => i.name);
  console.log('[get_inventory] User inventory items:', allItemNames.join(', '));

  return {
    result: {
      inventory: grouped,
      totalItems: items.length,
      expiringSoon: args.includeExpiring !== false ? expiringSoon : undefined,
      ingredientList: allItemNames,
      note: `This is everything in the user's kitchen: ${allItemNames.join(', ')}. Only suggest recipes where they already have all ingredients needed. Basic pantry staples (water, salt, black pepper, cooking oil) can be assumed.`,
    },
  };
}

// Shared fuzzy inventory matching
export function buildInventoryMatcher(inventory: any[]) {
  const inventoryItems = inventory.map((i) => ({
    ...i,
    nameLower: i.name.toLowerCase(),
    nameWords: i.name.toLowerCase().split(/[\s,\-\/]+/).filter(Boolean),
  }));

  return function findInventoryMatch(neededName: string) {
    const neededLower = neededName.toLowerCase();
    const neededWords = neededLower.split(/[\s,\-\/]+/).filter(Boolean);

    const exact = inventoryItems.find(i => i.nameLower === neededLower);
    if (exact) return exact;

    const substring = inventoryItems.find(i =>
      i.nameLower.includes(neededLower) || neededLower.includes(i.nameLower)
    );
    if (substring) return substring;

    const skipWords = new Set(['of', 'the', 'a', 'an', 'to', 'for', 'and', 'or', 'with', 'fresh', 'dried', 'ground', 'whole', 'chopped', 'sliced', 'diced', 'minced', 'large', 'small', 'medium']);
    const significantNeeded = neededWords.filter(w => !skipWords.has(w) && w.length > 2);
    if (significantNeeded.length > 0) {
      const wordMatch = inventoryItems.find(i =>
        significantNeeded.some(nw =>
          i.nameWords.some((iw: string) => iw.includes(nw) || nw.includes(iw))
        )
      );
      if (wordMatch) return wordMatch;
    }

    return null;
  };
}

// Default expiry days and storage by category
const CATEGORY_DEFAULTS: Record<string, { storageLocation: string; expiresInDays: number }> = {
  produce: { storageLocation: 'fridge', expiresInDays: 7 },
  'meat/protein': { storageLocation: 'fridge', expiresInDays: 4 },
  dairy: { storageLocation: 'fridge', expiresInDays: 14 },
  grains: { storageLocation: 'pantry', expiresInDays: 180 },
  frozen: { storageLocation: 'freezer', expiresInDays: 120 },
  canned: { storageLocation: 'pantry', expiresInDays: 365 },
  condiments: { storageLocation: 'fridge', expiresInDays: 90 },
  snacks: { storageLocation: 'pantry', expiresInDays: 60 },
  beverages: { storageLocation: 'fridge', expiresInDays: 30 },
  other: { storageLocation: 'pantry', expiresInDays: 30 },
};

// Keyword-based category inference
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  produce: ['apple', 'banana', 'lettuce', 'tomato', 'onion', 'garlic', 'bell pepper', 'carrot', 'broccoli', 'spinach', 'avocado', 'lemon', 'lime', 'potato', 'celery', 'cucumber', 'mushroom', 'corn', 'berry', 'fruit', 'vegetable', 'herb', 'cilantro', 'basil', 'parsley'],
  'meat/protein': ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'turkey', 'steak', 'bacon', 'sausage', 'ground', 'meat', 'tofu', 'egg'],
  dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage', 'mozzarella', 'cheddar', 'parmesan'],
  grains: ['rice', 'pasta', 'bread', 'flour', 'oat', 'cereal', 'tortilla', 'noodle', 'quinoa'],
  frozen: ['frozen', 'ice cream', 'pizza rolls'],
  canned: ['canned', 'beans', 'soup', 'tuna can', 'tomato sauce', 'tomato paste'],
  condiments: ['sauce', 'ketchup', 'mustard', 'mayo', 'dressing', 'vinegar', 'oil', 'olive oil', 'soy sauce', 'hot sauce', 'sriracha', 'salsa', 'black pepper', 'peppercorn'],
  snacks: ['chips', 'crackers', 'nuts', 'granola', 'popcorn', 'cookie', 'bar'],
  beverages: ['juice', 'soda', 'water', 'coffee', 'tea', 'wine', 'beer'],
};

function inferCategory(name: string): string {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return 'other';
}

export async function parseNaturalInventoryInput(args: Record<string, any>, _userId: string) {
  const { text } = args;
  if (!text) return { result: { error: 'No text provided.' } };

  const segments = text
    .split(/[,\n]|\band\b/i)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);

  const parsedItems: Array<{
    name: string;
    quantity: number;
    unit: string;
    category: string;
    storageLocation: string;
    expiresInDays: number;
    needsClarification: boolean;
    clarificationReason?: string;
  }> = [];

  const ambiguities: Array<{ item: string; reason: string }> = [];

  for (const segment of segments) {
    let quantity = 1;
    let unit = 'count';
    let name = segment;

    const qtyMatch = segment.match(
      /^(\d+\.?\d*|a|an|some|few|couple)\s*(lbs?|pounds?|oz|ounces?|gallons?|gal|liters?|bags?|boxes?|cans?|bottles?|packs?|packages?|bunches?|heads?|dozens?|cups?|pints?|quarts?|count|each|pcs?)?\s*(?:of\s+)?(.+)/i
    );

    if (qtyMatch) {
      const qtyStr = qtyMatch[1].toLowerCase();
      quantity = qtyStr === 'a' || qtyStr === 'an' ? 1 :
                 qtyStr === 'some' || qtyStr === 'few' ? 3 :
                 qtyStr === 'couple' ? 2 :
                 parseFloat(qtyStr) || 1;

      if (qtyStr === 'some') {
        ambiguities.push({ item: segment, reason: `How many/much "${qtyMatch[3].trim()}" did you mean by "some"?` });
      }

      unit = qtyMatch[2]?.toLowerCase().replace(/s$/, '') || 'count';
      if (unit === 'pound' || unit === 'lb') unit = 'lbs';
      if (unit === 'ounce' || unit === 'oz') unit = 'oz';
      if (unit === 'gallon' || unit === 'gal') unit = 'gallon';
      if (unit === 'dozen') { quantity = quantity * 12; unit = 'count'; }

      name = qtyMatch[3].trim();
    }

    const category = inferCategory(name);
    const defaults = CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.other;

    const needsClarification = ambiguities.some(a => a.item === segment);

    parsedItems.push({
      name,
      quantity,
      unit,
      category,
      storageLocation: defaults.storageLocation,
      expiresInDays: defaults.expiresInDays,
      needsClarification,
      clarificationReason: needsClarification ? ambiguities.find(a => a.item === segment)?.reason : undefined,
    });
  }

  return {
    result: {
      parsedItems,
      totalItems: parsedItems.length,
      ambiguities,
      hasAmbiguities: ambiguities.length > 0,
      message: ambiguities.length > 0
        ? `I parsed ${parsedItems.length} item(s) but have ${ambiguities.length} question(s) to clarify before adding them.`
        : `I parsed ${parsedItems.length} item(s) and they're ready to add to your inventory.`,
    },
  };
}

export async function bulkAddInventory(args: Record<string, any>, userId: string) {
  const { items } = args;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { result: { error: 'No items provided.' } };
  }

  const added: Array<{ id: string; name: string; quantity: number; unit: string; category: string; storageLocation: string; expiresAt: string | null }> = [];

  for (const item of items) {
    const category = item.category || inferCategory(item.name);
    const defaults = CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.other;
    const storageLocation = item.storageLocation || defaults.storageLocation;
    const expiresInDays = item.expiresInDays || (storageLocation === 'freezer' ? 120 : defaults.expiresInDays);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const created = await prisma.inventoryItem.create({
      data: {
        userId,
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || 'count',
        category,
        storageLocation,
        expiresAt,
      },
    });

    added.push({
      id: created.id,
      name: created.name,
      quantity: created.quantity || 1,
      unit: created.unit || 'count',
      category: created.category || category,
      storageLocation: created.storageLocation || storageLocation,
      expiresAt: created.expiresAt?.toISOString() || null,
    });
  }

  const byLocation: Record<string, string[]> = {};
  for (const item of added) {
    const loc = item.storageLocation;
    if (!byLocation[loc]) byLocation[loc] = [];
    byLocation[loc].push(item.name);
  }

  const locationSummary = Object.entries(byLocation)
    .map(([loc, names]) => `${loc}: ${names.join(', ')}`)
    .join(' | ');

  return {
    result: {
      addedItems: added,
      totalAdded: added.length,
      byLocation,
      message: `Added ${added.length} item(s) to your inventory! ${locationSummary}`,
    },
    metadata: { type: 'inventory_bulk_add' },
  };
}
