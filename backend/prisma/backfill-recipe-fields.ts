/**
 * Backfill script: populate proteinType, cuisineStyle, cookingMethod
 * on all existing recipes by inferring from title, category, and ingredients.
 *
 * Run: npx tsx prisma/backfill-recipe-fields.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Inference Maps ──────────────────────────────────────────────────────────

const PROTEIN_KEYWORDS: Record<string, string[]> = {
  chicken: ['chicken', 'poultry'],
  beef: ['beef', 'steak', 'ground beef', 'brisket', 'burger'],
  pork: ['pork', 'bacon', 'ham', 'pulled pork', 'carnitas'],
  turkey: ['turkey'],
  fish: ['fish', 'salmon', 'tilapia', 'cod', 'tuna', 'mahi'],
  shrimp: ['shrimp', 'prawn'],
  tofu: ['tofu', 'tempeh', 'seitan'],
  eggs: ['egg', 'eggs', 'omelet', 'omelette', 'frittata'],
};

const CUISINE_KEYWORDS: Record<string, string[]> = {
  american: ['burger', 'bbq', 'mac and cheese', 'mac & cheese', 'meatloaf', 'cornbread'],
  mexican: ['taco', 'burrito', 'quesadilla', 'enchilada', 'salsa', 'mexican', 'chimichanga', 'nacho', 'carnitas', 'fajita'],
  italian: ['pasta', 'pizza', 'lasagna', 'risotto', 'parmigiana', 'marinara', 'italian', 'penne', 'spaghetti', 'fettuccine'],
  asian: ['stir fry', 'stir-fry', 'teriyaki', 'soy sauce', 'asian', 'sesame', 'wok', 'fried rice', 'ramen', 'pho', 'thai', 'curry', 'chinese', 'japanese', 'korean'],
  mediterranean: ['mediterranean', 'greek', 'hummus', 'falafel', 'pita', 'tzatziki', 'olive', 'feta'],
  indian: ['curry', 'tikka', 'masala', 'naan', 'biryani', 'tandoori', 'paneer', 'indian'],
};

const METHOD_KEYWORDS: Record<string, string[]> = {
  stovetop: ['skillet', 'pan', 'sauté', 'saute', 'stir fry', 'stir-fry', 'simmer', 'boil', 'sear', 'cook in a pan', 'cook in a skillet'],
  oven: ['bake', 'baked', 'roast', 'roasted', 'broil', 'oven'],
  grill: ['grill', 'grilled', 'grilling', 'charcoal', 'bbq'],
  crockpot: ['crockpot', 'crock pot', 'slow cooker', 'slow-cook'],
  'air-fryer': ['air fryer', 'air-fryer', 'air fry'],
  'instant-pot': ['instant pot', 'instant-pot', 'pressure cooker'],
  'sheet-pan': ['sheet pan', 'sheet-pan', 'baking sheet'],
  'no-cook': ['no cook', 'no-cook', 'raw', 'smoothie', 'salad'],
};

function inferFromText(text: string, keywordMap: Record<string, string[]>): string | null {
  const lower = text.toLowerCase();
  for (const [value, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(kw => lower.includes(kw))) return value;
  }
  return null;
}

async function main() {
  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      title: true,
      category: true,
      ingredients: true,
      instructions: true,
      dietaryTags: true,
      proteinType: true,
      cuisineStyle: true,
      cookingMethod: true,
    },
  });

  console.log(`Processing ${recipes.length} recipes...`);
  let updated = 0;

  for (const recipe of recipes) {
    const searchText = [
      recipe.title,
      recipe.category,
      recipe.ingredients,
      recipe.instructions,
    ].filter(Boolean).join(' ');

    const data: Record<string, string> = {};

    // Infer proteinType
    if (!recipe.proteinType) {
      const protein = inferFromText(searchText, PROTEIN_KEYWORDS);
      if (protein) data.proteinType = protein;
      else {
        // Check dietaryTags for vegetarian/vegan
        const tags = recipe.dietaryTags || '';
        if (tags.includes('vegan') || tags.includes('vegetarian')) {
          data.proteinType = 'none';
        }
      }
    }

    // Infer cuisineStyle
    if (!recipe.cuisineStyle) {
      const cuisine = inferFromText(searchText, CUISINE_KEYWORDS);
      if (cuisine) data.cuisineStyle = cuisine;
      else if (recipe.category) {
        // Map category directly to cuisine when appropriate
        const catMap: Record<string, string> = {
          mexican: 'mexican',
          italian: 'italian',
          pizza: 'italian',
          pasta: 'italian',
          burgers: 'american',
        };
        if (catMap[recipe.category]) data.cuisineStyle = catMap[recipe.category];
      }
    }

    // Infer cookingMethod
    if (!recipe.cookingMethod) {
      const method = inferFromText(recipe.instructions || '', METHOD_KEYWORDS);
      if (method) data.cookingMethod = method;
      else {
        // Try title + category
        const titleMethod = inferFromText(recipe.title + ' ' + (recipe.category || ''), METHOD_KEYWORDS);
        if (titleMethod) data.cookingMethod = titleMethod;
        else if (recipe.category === 'crockpot') data.cookingMethod = 'crockpot';
        else if (recipe.category === 'sheet-pan') data.cookingMethod = 'sheet-pan';
        else if (recipe.category === 'salad' || recipe.category === 'salads') data.cookingMethod = 'no-cook';
      }
    }

    if (Object.keys(data).length > 0) {
      await prisma.recipe.update({ where: { id: recipe.id }, data });
      updated++;
    }
  }

  console.log(`Updated ${updated}/${recipes.length} recipes with new filter fields.`);

  // Print summary
  const summary = await prisma.recipe.groupBy({
    by: ['proteinType'],
    _count: true,
  });
  console.log('\nProtein types:', summary.map(s => `${s.proteinType || 'null'}: ${s._count}`).join(', '));

  const cuisines = await prisma.recipe.groupBy({
    by: ['cuisineStyle'],
    _count: true,
  });
  console.log('Cuisine styles:', cuisines.map(s => `${s.cuisineStyle || 'null'}: ${s._count}`).join(', '));

  const methods = await prisma.recipe.groupBy({
    by: ['cookingMethod'],
    _count: true,
  });
  console.log('Cooking methods:', methods.map(s => `${s.cookingMethod || 'null'}: ${s._count}`).join(', '));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
