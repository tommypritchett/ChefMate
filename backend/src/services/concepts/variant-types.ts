export interface VariantTypeDefinition {
  key: string;
  label: string;
  systemPromptModifier: string;
  requiredDietaryTags: string[];
}

export const VARIANT_TYPES: Record<string, VariantTypeDefinition> = {
  classic: {
    key: 'classic',
    label: 'Classic',
    systemPromptModifier: 'Create the standard, traditional version of this recipe with balanced macros.',
    requiredDietaryTags: [],
  },
  'high-protein': {
    key: 'high-protein',
    label: 'High Protein',
    systemPromptModifier: 'Maximize protein content (target 35g+ per serving). Use lean meats, Greek yogurt, eggs, or protein-rich substitutions. Keep calories reasonable.',
    requiredDietaryTags: ['high-protein'],
  },
  'low-carb': {
    key: 'low-carb',
    label: 'Low Carb',
    systemPromptModifier: 'Make this low-carb with under 30g NET carbs per serving (carbs minus fiber). Reduce starchy ingredients (rice, pasta, bread, potatoes) and increase non-starchy vegetables. Unlike keto, fat does NOT need to dominate — protein and fat can be balanced.',
    requiredDietaryTags: ['low-carb'],
  },
  keto: {
    key: 'keto',
    label: 'Keto',
    systemPromptModifier: 'Make this keto-friendly with under 20g NET carbs per serving (carbs minus fiber). Replace grains, sugars, and starchy vegetables with low-carb alternatives. Fat MUST be the dominant macro — more grams than protein AND ≥50% of total calories. Use generous healthy fats (avocado, olive oil, butter, nuts, fatty cuts of meat).',
    requiredDietaryTags: ['keto', 'low-carb'],
  },
  vegetarian: {
    key: 'vegetarian',
    label: 'Vegetarian',
    systemPromptModifier: 'Make this fully vegetarian — no meat, poultry, or seafood. Eggs and dairy ARE allowed (this is what distinguishes it from vegan). Use beans, legumes, eggs, cheese, or plant proteins.',
    requiredDietaryTags: ['vegetarian'],
  },
  vegan: {
    key: 'vegan',
    label: 'Vegan',
    systemPromptModifier: 'Make this fully vegan — no meat, dairy, eggs, or animal products. Use plant-based proteins (tofu, tempeh, legumes, nutritional yeast).',
    requiredDietaryTags: ['vegan', 'vegetarian', 'dairy-free'],
  },
  'gluten-free': {
    key: 'gluten-free',
    label: 'Gluten Free',
    systemPromptModifier: 'Remove all gluten ingredients. Replace wheat flour with almond/rice/oat flour, regular pasta with GF pasta, soy sauce with tamari, breadcrumbs with GF breadcrumbs. Explicitly call out GF substitutions in ingredient names (e.g. "gluten-free pasta", "tamari").',
    requiredDietaryTags: ['gluten-free'],
  },
  'dairy-free': {
    key: 'dairy-free',
    label: 'Dairy Free',
    systemPromptModifier: 'Remove all dairy ingredients. Substitute with plant-based alternatives (oat milk, cashew cream, nutritional yeast for cheesy flavor).',
    requiredDietaryTags: ['dairy-free'],
  },
  budget: {
    key: 'budget',
    label: 'Budget',
    systemPromptModifier: 'Use only affordable, common grocery store ingredients. No specialty items, exotic spices, or premium cuts. Target under $8 total cost for 4 servings.',
    requiredDietaryTags: ['budget-friendly'],
  },
  quick: {
    key: 'quick',
    label: 'Quick (Under 20 min)',
    systemPromptModifier: 'Total time must be under 20 minutes including prep. Simplify steps, use pre-cut or canned ingredients where appropriate. Minimize dishes used.',
    requiredDietaryTags: ['quick'],
  },
  'air-fryer': {
    key: 'air-fryer',
    label: 'Air Fryer',
    systemPromptModifier: 'Adapt this recipe for an air fryer. Include temperature and timing. Reduce oil usage. Ensure crispy texture.',
    requiredDietaryTags: [],
  },
  crockpot: {
    key: 'crockpot',
    label: 'Crockpot',
    systemPromptModifier: 'Convert to a slow cooker recipe. Include low/high time options. Adjust liquid amounts for slow cooking. Emphasize dump-and-go simplicity.',
    requiredDietaryTags: ['meal-prep'],
  },
  spicy: {
    key: 'spicy',
    label: 'Spicy',
    systemPromptModifier: 'Add significant heat using fresh peppers, hot sauce, chili flakes, or spicy marinades. Include a heat level note (medium-hot). Keep the original flavor profile recognizable.',
    requiredDietaryTags: [],
  },
};

export function getVariantPromptModifier(type: string): string {
  return VARIANT_TYPES[type]?.systemPromptModifier ?? VARIANT_TYPES.classic.systemPromptModifier;
}

export function getVariantDietaryTags(type: string): string[] {
  return VARIANT_TYPES[type]?.requiredDietaryTags ?? [];
}
