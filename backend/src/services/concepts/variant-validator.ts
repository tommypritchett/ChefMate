/**
 * Comprehensive validator for published RecipeVariants.
 *
 * Layers two checks per variant:
 *   1. Macro rules — calorie sanity + per-variant macro thresholds (extends macro-validator).
 *   2. Ingredient rules — keyword scan for forbidden items (meat, dairy, gluten, etc.).
 *
 * Returns a structured Failure list so the caller can decide to regenerate.
 */

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
}

export interface Ingredient {
  name: string;
  amount?: string | number;
  unit?: string;
  notes?: string;
}

export interface VariantFailure {
  rule: string; // e.g. "high-protein:min-protein"
  detail: string; // human-readable message
  category: 'macro' | 'ingredient' | 'sanity';
}

export interface VariantValidationResult {
  valid: boolean;
  failures: VariantFailure[];
}

// ---------- Ingredient keyword lists ----------
// Lowercased substring matches against ingredient.name + ingredient.notes.

const MEAT_KEYWORDS = [
  'chicken', 'beef', 'pork', 'turkey', 'lamb', 'veal', 'duck',
  'bacon', 'sausage', 'ham', 'pepperoni', 'salami', 'prosciutto', 'chorizo',
  'ground meat', 'ground beef', 'ground turkey', 'ground pork', 'ground chicken',
  'steak', 'ribs', 'brisket', 'pancetta', 'hot dog', 'meatball',
  // seafood (treated as meat for vegetarian/vegan)
  'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'trout', 'halibut', 'mackerel',
  'shrimp', 'prawn', 'crab', 'lobster', 'scallop', 'oyster', 'clam', 'mussel',
  'anchovy', 'anchovies', 'sardine', 'squid', 'calamari', 'octopus',
];

const ANIMAL_PRODUCT_KEYWORDS = [
  // dairy
  'milk', 'cheese', 'butter', 'yogurt', 'yoghurt', 'cream', 'ghee',
  'whey', 'casein', 'kefir', 'sour cream', 'cottage cheese', 'ricotta',
  'mozzarella', 'cheddar', 'parmesan', 'feta', 'gouda', 'brie', 'mascarpone',
  'half-and-half', 'half and half', 'buttermilk', 'condensed milk', 'evaporated milk',
  // eggs
  'egg', 'eggs', 'egg white', 'egg yolk', 'mayo', 'mayonnaise', 'aioli',
  // honey, gelatin
  'honey', 'gelatin', 'gelatine', 'lard',
];

const DAIRY_KEYWORDS = [
  'milk', 'cheese', 'butter', 'yogurt', 'yoghurt', 'cream', 'ghee',
  'whey', 'casein', 'kefir', 'sour cream', 'cottage cheese', 'ricotta',
  'mozzarella', 'cheddar', 'parmesan', 'feta', 'gouda', 'brie', 'mascarpone',
  'half-and-half', 'half and half', 'buttermilk', 'condensed milk', 'evaporated milk',
];

const GLUTEN_KEYWORDS = [
  'wheat flour', 'all-purpose flour', 'all purpose flour', 'bread flour',
  'pasta', 'spaghetti', 'penne', 'fettuccine', 'linguine', 'lasagna', 'macaroni',
  'breadcrumb', 'panko', 'bread crumb',
  'soy sauce', 'teriyaki', 'hoisin',
  'beer', 'malt', 'barley', 'rye', 'bulgur', 'farro', 'couscous', 'semolina',
  'tortilla', 'pita', 'naan', 'bagel', 'biscuit', 'croissant',
  'noodle', 'ramen', 'udon',
];

// Allow these substrings to override a forbidden match (e.g. "gluten-free pasta" ≠ pasta).
const GLUTEN_FREE_OVERRIDES = ['gluten-free', 'gluten free', 'gf '];
const DAIRY_FREE_OVERRIDES = [
  'dairy-free', 'dairy free', 'plant-based', 'vegan',
  // nut/seed milks and butters
  'almond', 'oat', 'soy', 'cashew', 'coconut', 'peanut', 'sunflower',
  'rice', 'hemp', 'pistachio', 'walnut', 'pecan', 'macadamia', 'hazelnut',
  'tahini', 'sesame',
  // vegan butter substitutes
  'earth balance', 'miyoko', 'kite hill', 'violife', 'daiya',
  // non-dairy descriptors
  'non-dairy', 'non dairy',
];
const PLANT_OVERRIDES = ['plant-based', 'vegan', 'tofu', 'tempeh', 'seitan', 'jackfruit'];

// ---------- Helpers ----------

function ingredientText(i: Ingredient): string {
  const parts = [i.name, i.notes].filter(Boolean) as string[];
  return parts.join(' ').toLowerCase();
}

function hasOverride(text: string, overrides: string[]): boolean {
  return overrides.some((o) => text.includes(o));
}

function findForbidden(
  ingredients: Ingredient[],
  keywords: string[],
  overrides: string[] = [],
): string[] {
  const hits: string[] = [];
  for (const ing of ingredients) {
    const text = ingredientText(ing);
    if (hasOverride(text, overrides)) continue;
    for (const kw of keywords) {
      // Word-boundary-ish match: pad with spaces so "egg" doesn't match "eggplant"
      const padded = ` ${text} `;
      if (padded.includes(` ${kw} `) || padded.includes(`${kw} `) || padded.startsWith(`${kw}`)) {
        // Stricter check: also require the keyword to appear as a token, not embedded
        const tokens = text.split(/[\s,;()-]+/).filter(Boolean);
        const kwTokens = kw.split(/\s+/);
        const matches = kwTokens.every((t) => tokens.some((tok) => tok === t || tok.startsWith(t)));
        if (matches) {
          hits.push(`"${ing.name}" matches "${kw}"`);
          break;
        }
      }
    }
  }
  return hits;
}

// Special handling for "egg" — distinguish from "eggplant"
function findEggs(ingredients: Ingredient[]): string[] {
  const hits: string[] = [];
  for (const ing of ingredients) {
    const name = ing.name.toLowerCase().trim();
    const notes = (ing.notes || '').toLowerCase();
    if (
      /\begg(s)?\b/.test(name) && !name.includes('eggplant') ||
      /\begg white(s)?\b/.test(name) ||
      /\begg yolk(s)?\b/.test(name) ||
      name === 'mayonnaise' || name === 'mayo' || notes.includes('mayo')
    ) {
      hits.push(`"${ing.name}" contains eggs`);
    }
  }
  return hits;
}

// ---------- Validators ----------

function macroSanity(n: NutritionData): VariantFailure[] {
  const f: VariantFailure[] = [];
  if (!n || typeof n.calories !== 'number') {
    f.push({ rule: 'sanity:nutrition-missing', detail: 'Nutrition is missing or malformed', category: 'sanity' });
    return f;
  }
  if (n.calories < 100 || n.calories > 1500) {
    f.push({ rule: 'sanity:calories', detail: `Calories ${n.calories} outside 100–1500/serving`, category: 'sanity' });
  }
  if (n.protein < 0 || n.carbs < 0 || n.fat < 0) {
    f.push({ rule: 'sanity:negative-macro', detail: 'A macro value is negative', category: 'sanity' });
  }
  // Reasonableness: macros should roughly add up (4*p + 4*c + 9*f ≈ calories)
  const computed = 4 * n.protein + 4 * n.carbs + 9 * n.fat;
  const ratio = computed / Math.max(n.calories, 1);
  if (ratio < 0.6 || ratio > 1.5) {
    f.push({
      rule: 'sanity:macro-calorie-mismatch',
      detail: `Macros (${computed}kcal computed) don't match stated calories (${n.calories})`,
      category: 'sanity',
    });
  }
  return f;
}

function classicHealthierRules(n: NutritionData, ings: Ingredient[]): VariantFailure[] {
  const f: VariantFailure[] = [];
  // "Reasonable for the dish" — sanity bounds beyond the macro check
  if (n.calories > 900) {
    f.push({
      rule: 'classic:calories-too-high',
      detail: `${n.calories} kcal — classic healthier should be ≤900 per serving`,
      category: 'macro',
    });
  }
  if (typeof n.sodium === 'number' && n.sodium > 1000) {
    f.push({
      rule: 'classic:sodium-too-high',
      detail: `${n.sodium}mg sodium — should be <1000mg for a healthier version`,
      category: 'macro',
    });
  }
  // Heavily processed items that defeat "healthier" framing
  const processed = [
    'velveeta', 'cheez whiz', 'spam', 'vienna sausage', 'instant ramen',
    'imitation crab', 'cheese product',
  ];
  for (const ing of ings) {
    const t = ingredientText(ing);
    for (const p of processed) {
      if (t.includes(p)) {
        f.push({
          rule: 'classic:processed-ingredient',
          detail: `Processed item "${ing.name}" — swap for whole-food alternative`,
          category: 'ingredient',
        });
        break;
      }
    }
  }
  return f;
}

function highProteinRules(n: NutritionData): VariantFailure[] {
  if (n.protein < 35) {
    return [{
      rule: 'high-protein:min-protein',
      detail: `Only ${n.protein}g protein — minimum is 35g per serving`,
      category: 'macro',
    }];
  }
  return [];
}

function lowCarbRules(n: NutritionData): VariantFailure[] {
  const netCarbs = n.carbs - (n.fiber || 0);
  if (netCarbs > 30) {
    return [{
      rule: 'low-carb:max-net-carbs',
      detail: `${netCarbs}g net carbs — maximum is 30g per serving`,
      category: 'macro',
    }];
  }
  return [];
}

function ketoRules(n: NutritionData): VariantFailure[] {
  const f: VariantFailure[] = [];
  const netCarbs = n.carbs - (n.fiber || 0);
  if (netCarbs > 20) {
    f.push({
      rule: 'keto:max-net-carbs',
      detail: `${netCarbs}g net carbs — keto maximum is 20g per serving`,
      category: 'macro',
    });
  }
  // Fat must be the dominant macro (more grams than protein, and >50% of calories)
  const fatCal = n.fat * 9;
  const proteinCal = n.protein * 4;
  if (n.fat <= n.protein) {
    f.push({
      rule: 'keto:fat-not-dominant',
      detail: `Fat ${n.fat}g ≤ protein ${n.protein}g — keto must be fat-forward`,
      category: 'macro',
    });
  }
  if (fatCal < 0.5 * n.calories) {
    f.push({
      rule: 'keto:fat-pct-low',
      detail: `Fat is only ${Math.round((fatCal / n.calories) * 100)}% of calories — keto wants ≥50%`,
      category: 'macro',
    });
  }
  return f;
}

function vegetarianRules(ings: Ingredient[]): VariantFailure[] {
  const meatHits = findForbidden(ings, MEAT_KEYWORDS, PLANT_OVERRIDES);
  return meatHits.map((h) => ({
    rule: 'vegetarian:contains-meat',
    detail: h,
    category: 'ingredient' as const,
  }));
}

function veganRules(ings: Ingredient[]): VariantFailure[] {
  const f: VariantFailure[] = [];
  const meatHits = findForbidden(ings, MEAT_KEYWORDS, PLANT_OVERRIDES);
  meatHits.forEach((h) => f.push({ rule: 'vegan:contains-meat', detail: h, category: 'ingredient' }));

  const animalHits = findForbidden(ings, ANIMAL_PRODUCT_KEYWORDS.filter((k) => k !== 'egg' && k !== 'eggs'), DAIRY_FREE_OVERRIDES);
  animalHits.forEach((h) => f.push({ rule: 'vegan:contains-animal-product', detail: h, category: 'ingredient' }));

  const eggHits = findEggs(ings);
  eggHits.forEach((h) => f.push({ rule: 'vegan:contains-eggs', detail: h, category: 'ingredient' }));

  return f;
}

function glutenFreeRules(ings: Ingredient[]): VariantFailure[] {
  const hits = findForbidden(ings, GLUTEN_KEYWORDS, GLUTEN_FREE_OVERRIDES);
  return hits.map((h) => ({
    rule: 'gluten-free:contains-gluten',
    detail: h,
    category: 'ingredient' as const,
  }));
}

function dairyFreeRules(ings: Ingredient[]): VariantFailure[] {
  const hits = findForbidden(ings, DAIRY_KEYWORDS, DAIRY_FREE_OVERRIDES);
  return hits.map((h) => ({
    rule: 'dairy-free:contains-dairy',
    detail: h,
    category: 'ingredient' as const,
  }));
}

// ---------- Public API ----------

/**
 * Normalize a variant type string. Strips "-2"/"-3" suffixes from regenerated duplicates,
 * and maps unknown types to themselves.
 */
export function normalizeVariantType(variantType: string): string {
  return variantType.replace(/-\d+$/, '');
}

export function validateVariant(
  variantType: string,
  nutrition: NutritionData,
  ingredients: Ingredient[],
): VariantValidationResult {
  const failures: VariantFailure[] = [];
  const t = normalizeVariantType(variantType);

  failures.push(...macroSanity(nutrition));

  switch (t) {
    case 'classic':
      failures.push(...classicHealthierRules(nutrition, ingredients));
      break;
    case 'high-protein':
      failures.push(...highProteinRules(nutrition));
      break;
    case 'low-carb':
      failures.push(...lowCarbRules(nutrition));
      break;
    case 'keto':
      failures.push(...ketoRules(nutrition));
      break;
    case 'vegetarian':
      failures.push(...vegetarianRules(ingredients));
      break;
    case 'vegan':
      failures.push(...veganRules(ingredients));
      break;
    case 'gluten-free':
      failures.push(...glutenFreeRules(ingredients));
      break;
    case 'dairy-free':
      failures.push(...dairyFreeRules(ingredients));
      break;
    // 'quick', 'budget', 'air-fryer', 'crockpot', 'spicy' — no nutritional/ingredient rules applied here
    default:
      break;
  }

  return {
    valid: failures.length === 0,
    failures,
  };
}

/**
 * Build a regeneration prompt that names the exact thresholds breached.
 * Used on retry pass to coerce GPT-4o into compliance.
 */
export function buildStrictPromptForFailures(
  variantType: string,
  failures: VariantFailure[],
): string {
  const t = normalizeVariantType(variantType);
  const breach = failures.map((f) => `- ${f.detail}`).join('\n');
  const ruleStatement = STRICT_RULE_STATEMENTS[t] || '';
  return `The previous attempt FAILED these rules:\n${breach}\n\nYou MUST satisfy:\n${ruleStatement}`;
}

const STRICT_RULE_STATEMENTS: Record<string, string> = {
  classic:
    '- Reasonable calorie load (200–900 kcal/serving)\n- Use whole foods, no Velveeta/Spam/instant ramen/cheese product\n- Lower sodium (<1000mg)',
  'high-protein':
    '- Protein MUST be ≥35g per serving — use Greek yogurt, cottage cheese, egg whites, lean meats, or legumes\n- Calories should remain reasonable (350–700 kcal)',
  'low-carb':
    '- Net carbs (carbs − fiber) MUST be ≤30g per serving\n- Replace starches with non-starchy vegetables',
  keto:
    '- Net carbs (carbs − fiber) MUST be ≤20g per serving\n- Fat MUST be the dominant macro: more grams than protein AND ≥50% of total calories\n- No grains, sugars, or starchy vegetables. Use generous healthy fats (avocado, olive oil, butter, nuts)',
  vegetarian:
    '- ZERO meat, poultry, or seafood — no chicken/beef/pork/turkey/fish/shrimp/etc.\n- Use plant proteins, beans, eggs, or dairy',
  vegan:
    '- ZERO animal products — no meat, dairy, eggs, honey, gelatin\n- Use tofu/tempeh/seitan/legumes for protein, plant milks for dairy',
  'gluten-free':
    '- ZERO gluten — no wheat flour, regular pasta, breadcrumbs, soy sauce, beer, barley, rye\n- Substitute with rice flour, almond flour, GF pasta, tamari, GF breadcrumbs',
  'dairy-free':
    '- ZERO dairy — no butter, cheese, milk, cream, yogurt, ghee\n- Use plant alternatives: oat/almond/coconut milk, vegan butter, nutritional yeast, cashew cream',
};

export function getRuleStatement(variantType: string): string {
  return STRICT_RULE_STATEMENTS[normalizeVariantType(variantType)] || '';
}
