const SEASONAL_INGREDIENTS: Record<string, string[]> = {
  spring: [
    'asparagus', 'peas', 'artichokes', 'radishes', 'strawberries',
    'spinach', 'mint', 'lemon', 'green onions', 'fava beans',
  ],
  summer: [
    'tomatoes', 'corn', 'zucchini', 'watermelon', 'peaches',
    'bell peppers', 'basil', 'cucumbers', 'berries', 'avocado',
  ],
  fall: [
    'pumpkin', 'butternut squash', 'sweet potatoes', 'apples', 'cranberries',
    'sage', 'cinnamon', 'pears', 'brussels sprouts', 'kale',
  ],
  winter: [
    'root vegetables', 'citrus', 'potatoes', 'cabbage', 'leeks',
    'rosemary', 'thyme', 'parsnips', 'turnips', 'pomegranate',
  ],
};

export function getCurrentSeason(): string {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

export function getSeasonalIngredients(season: string): string[] {
  return SEASONAL_INGREDIENTS[season] ?? [];
}

export function getSeasonalPromptHint(): string {
  const season = getCurrentSeason();
  const ingredients = getSeasonalIngredients(season);
  return `It's currently ${season}. Consider featuring seasonal ingredients like: ${ingredients.join(', ')}.`;
}
