export { SHOPPING_CATEGORY_ORDER as CATEGORY_ORDER, STORAGE_LOCATIONS as STORAGE_OPTIONS, STORAGE_ICONS } from '../../constants/food';

export const KROGER_BANNERS = ['Kroger', "Mariano's", 'King Soopers', 'Fred Meyer', 'Ralphs', "Fry's", 'QFC', "Smith's", 'Dillons', "Pick 'n Save", 'Metro Market', 'Harris Teeter', 'Food 4 Less'];

export const KROGER_CART_URLS: Record<string, string> = {
  'Kroger': 'https://www.kroger.com/cart',
  "Mariano's": 'https://www.marianos.com/cart',
  'King Soopers': 'https://www.kingsoopers.com/cart',
  'Fred Meyer': 'https://www.fredmeyer.com/cart',
  'Ralphs': 'https://www.ralphs.com/cart',
  "Fry's": 'https://www.frysfood.com/cart',
  'QFC': 'https://www.qfc.com/cart',
  "Smith's": 'https://www.smithsfoodanddrug.com/cart',
  'Dillons': 'https://www.dillons.com/cart',
  "Pick 'n Save": 'https://www.picknsave.com/cart',
  'Metro Market': 'https://www.metromarket.net/cart',
  'Harris Teeter': 'https://www.harristeeter.com/cart',
  'Food 4 Less': 'https://www.food4less.com/cart',
};

// Suggest storage location based on item category
export function suggestStorage(category?: string, name?: string): string {
  const cat = (category || '').toLowerCase();
  const n = (name || '').toLowerCase();
  // Frozen items
  if (n.includes('frozen') || n.includes('ice cream')) return 'freezer';
  // Refrigerated categories
  if (['meat', 'dairy', 'produce'].includes(cat)) return 'fridge';
  // Pantry categories
  if (['grains', 'condiments', 'beverages', 'canned'].includes(cat)) return 'pantry';
  // Name-based heuristics
  if (n.includes('milk') || n.includes('cheese') || n.includes('yogurt') || n.includes('butter') || n.includes('egg')) return 'fridge';
  if (n.includes('chicken') || n.includes('beef') || n.includes('pork') || n.includes('salmon') || n.includes('shrimp')) return 'fridge';
  if (n.includes('lettuce') || n.includes('tomato') || n.includes('spinach') || n.includes('broccoli')) return 'fridge';
  return 'pantry';
}

// Simplify a verbose product name to a core search query
export function simplifyItemName(name: string): string {
  let s = name
    .replace(/[®™©Â\u2019\u2018]/g, "'")
    .replace(/['"]/g, '')
    .replace(/\d+\.?\d*\s*%/g, '')
    .replace(/\d+\.?\d*\s*(oz|lb|lbs|fl\s*oz|ct|count|pack|g|kg|ml|l|gal|qt|pt|slices?)\b/gi, '')
    .replace(/\b\d+\s*(\/\s*\d+)?\b/g, '')
    .split(/\s+/)
    .filter(w => !/^(simple|truth|kroger|private|selection|lauras?|lean|all|natural|organic|gluten|free|fat|low|non|gmo|artesano|original|instant|minute|sara|lee|singles|brand|style|classic|premium|value|pack|size|family)$/i.test(w))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = s.split(' ').filter(w => w.length > 1);
  if (words.length <= 1 && name.length > 10) {
    const origWords = name.replace(/[®™©Â\u2019\u2018'"]/g, '').split(/\s+/).filter(w => w.length > 1);
    return origWords.slice(-3).join(' ');
  }
  if (words.length > 4) return words.slice(-3).join(' ');
  return words.join(' ') || name;
}

// Parse natural speech into individual items
export function parseNaturalItems(text: string): string[] {
  let s = text.trim();
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(/^(let'?s?\s+(do|get|add|see|try|have)|how\s+about|i\s+(need|want|would like)|can\s+(we|you)\s+(add|get)|get\s+me|we\s+need|add|please)\s+/i, '');
  }
  s = s.replace(/\band\s+(also|then|some)\b/gi, ',');
  const parts = s.split(/,|\n|\band\b|\bsome\b|\balso\b|\bplus\b/i);
  return parts
    .map(p => p.trim())
    .map(p => p.replace(/^(a\s+|the\s+|of\s+)/i, '').trim())
    .filter(p => p.length >= 2);
}

// Re-export from shared utils so existing imports don't break
export { validateQuantity } from '../../utils/validation';
