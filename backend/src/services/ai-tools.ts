import prisma from '../lib/prisma';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

// ─── Tool Definitions (OpenAI function-calling schemas) ─────────────────────

export const toolDefinitions: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_recipes',
      description:
        'Search the recipe database. Use when the user asks about recipes, wants meal ideas, or asks "what can I cook". Returns matching recipes with key details.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search term (recipe name, ingredient, cuisine style)',
          },
          category: {
            type: 'string',
            description: 'Recipe category filter',
            enum: ['burger', 'chicken', 'pizza', 'mexican', 'breakfast', 'salad', 'sides', 'dessert', 'drink'],
          },
          difficulty: {
            type: 'string',
            enum: ['easy', 'medium', 'hard'],
          },
          maxTime: {
            type: 'number',
            description: 'Maximum total cook time in minutes',
          },
          limit: {
            type: 'number',
            description: 'Max results to return (default 5)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_inventory',
      description:
        "Get the user's current food inventory, grouped by storage location. Use when the user asks what they have, what's in their fridge, or before suggesting meals based on available ingredients.",
      parameters: {
        type: 'object',
        properties: {
          includeExpiring: {
            type: 'boolean',
            description: 'If true, also highlight items expiring within 3 days',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_meals',
      description:
        'Suggest meals the user can make based on their current inventory, preferences, and items about to expire. Use when the user asks "what can I cook tonight?" or similar.',
      parameters: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'Number of suggestions (default 3)',
          },
          mealType: {
            type: 'string',
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          },
          prioritizeExpiring: {
            type: 'boolean',
            description: 'Prioritize using items that are expiring soon (default true)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_meal_plan',
      description:
        "Get the user's current or upcoming meal plan. Use when the user asks about their meal plan, what they're eating this week, or schedule.",
      parameters: {
        type: 'object',
        properties: {
          weekOffset: {
            type: 'number',
            description: '0 = current week, 1 = next week, -1 = last week',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_meal_plan',
      description:
        'Create a new weekly meal plan for the user. Use when the user asks to plan meals for the week or wants a meal schedule.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name for the meal plan (e.g. "Week of Feb 17")',
          },
          startDate: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format (defaults to next Monday)',
          },
          preferences: {
            type: 'string',
            description: 'User preferences for the plan (e.g. "high protein, no dairy")',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_meal_to_plan',
      description:
        'Add a specific recipe to a meal plan slot. Use when the user wants to add a specific meal to a specific day/time in their plan, or swap a meal.',
      parameters: {
        type: 'object',
        properties: {
          mealPlanId: {
            type: 'string',
            description: 'The meal plan ID to add the meal to',
          },
          recipeId: {
            type: 'string',
            description: 'The recipe ID to assign',
          },
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format',
          },
          mealType: {
            type: 'string',
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
            description: 'Which meal slot',
          },
          customName: {
            type: 'string',
            description: 'Optional custom name if no recipe ID (e.g. "Leftover pasta")',
          },
        },
        required: ['mealPlanId', 'date', 'mealType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_shopping_list',
      description:
        "Generate a shopping list by comparing ingredients against the user's current inventory. Can work from a meal plan OR a single recipe. Use when the user asks for a shopping list, what they need to buy, or what ingredients they're missing for a recipe.",
      parameters: {
        type: 'object',
        properties: {
          mealPlanId: {
            type: 'string',
            description: 'Specific meal plan ID to generate list from.',
          },
          recipeId: {
            type: 'string',
            description: 'Single recipe ID to generate missing ingredients for.',
          },
          listName: {
            type: 'string',
            description: 'Name for the shopping list (e.g. "Weekly Groceries", "Taco Night")',
          },
          saveToDB: {
            type: 'boolean',
            description: 'If true, saves the list to the database for later reference (default false)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_shopping_list',
      description:
        'Add items to, check items off, or view existing shopping lists. Use when the user wants to add something to their shopping list, mark items as bought, or see their current lists.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['view_lists', 'add_item', 'check_item', 'create_list'],
            description: 'The action to perform',
          },
          listId: {
            type: 'string',
            description: 'Shopping list ID (for add_item or check_item)',
          },
          listName: {
            type: 'string',
            description: 'Name for a new list (for create_list)',
          },
          itemName: {
            type: 'string',
            description: 'Item name to add or check off',
          },
          quantity: {
            type: 'number',
            description: 'Quantity for add_item',
          },
          unit: {
            type: 'string',
            description: 'Unit for add_item (e.g. lbs, oz, count)',
          },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_meal',
      description:
        "Record a meal the user ate. Use when the user says they ate something, had a meal, or wants to track what they've eaten.",
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'What the user ate',
          },
          mealType: {
            type: 'string',
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          },
          calories: { type: 'number' },
          protein: { type: 'number' },
          carbs: { type: 'number' },
          fat: { type: 'number' },
        },
        required: ['description', 'mealType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recipe_detail',
      description:
        'Get full details of a specific recipe including all ingredients, step-by-step instructions, nutrition breakdown, and tips. Use when the user asks for details about a recipe, wants to cook a specific recipe, or asks about ingredients/instructions.',
      parameters: {
        type: 'object',
        properties: {
          recipeId: {
            type: 'string',
            description: 'The recipe ID to get details for',
          },
          slug: {
            type: 'string',
            description: 'Alternatively, the recipe slug',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_nutrition_summary',
      description:
        "Get the user's nutrition summary for today or a date range. Use when the user asks about their daily macros, calorie count, or nutrition progress.",
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format (defaults to today)',
          },
          range: {
            type: 'string',
            enum: ['day', 'week'],
            description: 'Summary range (default "day")',
          },
        },
      },
    },
  },
];

// ─── Tool Executor ──────────────────────────────────────────────────────────

export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  userId: string
): Promise<{ result: any; metadata?: Record<string, any> }> {
  switch (toolName) {
    case 'search_recipes':
      return searchRecipes(args, userId);
    case 'get_inventory':
      return getInventory(args, userId);
    case 'suggest_meals':
      return suggestMeals(args, userId);
    case 'get_meal_plan':
      return getMealPlan(args, userId);
    case 'create_meal_plan':
      return createMealPlan(args, userId);
    case 'add_meal_to_plan':
      return addMealToPlan(args, userId);
    case 'generate_shopping_list':
      return generateShoppingList(args, userId);
    case 'manage_shopping_list':
      return manageShoppingList(args, userId);
    case 'log_meal':
      return logMeal(args, userId);
    case 'get_recipe_detail':
      return getRecipeDetail(args, userId);
    case 'get_nutrition_summary':
      return getNutritionSummary(args, userId);
    default:
      return { result: { error: `Unknown tool: ${toolName}` } };
  }
}

// ─── Tool Implementations ───────────────────────────────────────────────────

async function searchRecipes(args: Record<string, any>, _userId: string) {
  const { query, category, difficulty, maxTime, limit = 5 } = args;

  const where: any = { isPublished: true };

  if (category) where.category = category;
  if (difficulty) where.difficulty = difficulty;
  if (maxTime) {
    where.cookTimeMinutes = { lte: maxTime };
  }
  if (query) {
    const q = query.toLowerCase();
    // Search across title, description, brand, ingredients (JSON string), and dietaryTags (JSON string)
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { brand: { contains: q } },
      { ingredients: { contains: q } },
      { dietaryTags: { contains: q } },
    ];

    // Also search by individual words for multi-word queries like "healthy chicken dinner"
    const words = q.split(/\s+/).filter((w: string) => w.length > 2);
    if (words.length > 1) {
      for (const word of words) {
        where.OR.push(
          { title: { contains: word } },
          { ingredients: { contains: word } },
          { dietaryTags: { contains: word } },
        );
      }
    }
  }

  const recipes = await prisma.recipe.findMany({
    where,
    take: Math.min(limit, 10) * 3, // Fetch more to allow dedup + re-ranking
    orderBy: { averageRating: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      brand: true,
      category: true,
      imageUrl: true,
      prepTimeMinutes: true,
      cookTimeMinutes: true,
      difficulty: true,
      servings: true,
      averageRating: true,
      nutrition: true,
      dietaryTags: true,
      ingredients: true,
    },
  });

  // Deduplicate (OR queries can return duplicates)
  const seen = new Set<string>();
  const unique = recipes.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  // Re-rank by relevance if there's a query
  let ranked = unique;
  if (query) {
    const q = query.toLowerCase();
    const words = q.split(/\s+/).filter((w: string) => w.length > 2);
    ranked = unique.map(r => {
      let score = 0;
      const titleLower = r.title.toLowerCase();
      const descLower = (r.description || '').toLowerCase();
      const ingredientsLower = (r.ingredients || '').toLowerCase();

      // Exact query in title = highest relevance
      if (titleLower.includes(q)) score += 10;
      // Exact query in description
      if (descLower.includes(q)) score += 5;
      // Exact query in ingredients
      if (ingredientsLower.includes(q)) score += 7;

      // Individual word matches
      for (const word of words) {
        if (titleLower.includes(word)) score += 3;
        if (ingredientsLower.includes(word)) score += 2;
        if (descLower.includes(word)) score += 1;
      }

      return { ...r, _score: score };
    }).sort((a, b) => b._score - a._score);
  }

  const finalRecipes = ranked.slice(0, Math.min(limit, 10));

  const parsed = finalRecipes.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    brand: r.brand,
    category: r.category,
    imageUrl: r.imageUrl,
    prepTimeMinutes: r.prepTimeMinutes,
    cookTimeMinutes: r.cookTimeMinutes,
    difficulty: r.difficulty,
    servings: r.servings,
    averageRating: r.averageRating,
    nutrition: r.nutrition ? JSON.parse(r.nutrition) : null,
    dietaryTags: r.dietaryTags ? JSON.parse(r.dietaryTags) : [],
  }));

  return {
    result: {
      recipes: parsed,
      count: parsed.length,
      message: parsed.length === 0 ? 'No recipes found matching your criteria.' : undefined,
    },
    metadata: { type: 'recipes', recipeIds: parsed.map((r) => r.id) },
  };
}

async function getInventory(args: Record<string, any>, userId: string) {
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

  return {
    result: {
      inventory: grouped,
      totalItems: items.length,
      expiringSoon: args.includeExpiring !== false ? expiringSoon : undefined,
    },
  };
}

async function suggestMeals(args: Record<string, any>, userId: string) {
  const { count = 3, mealType, prioritizeExpiring = true } = args;

  // Get inventory
  const items = await prisma.inventoryItem.findMany({
    where: { userId },
  });

  if (items.length === 0) {
    return {
      result: {
        suggestions: [],
        message: "You don't have any items in your inventory yet. Add some ingredients to get personalized meal suggestions!",
      },
    };
  }

  const ingredientNames = items.map((i) => i.name.toLowerCase());
  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const expiringNames = items
    .filter((i) => i.expiresAt && new Date(i.expiresAt) <= threeDays)
    .map((i) => i.name.toLowerCase());

  // Search recipes that match available ingredients
  const recipes = await prisma.recipe.findMany({
    where: { isPublished: true },
    take: 50,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      category: true,
      ingredients: true,
      nutrition: true,
      prepTimeMinutes: true,
      cookTimeMinutes: true,
      difficulty: true,
      averageRating: true,
    },
  });

  // Score recipes by ingredient match
  const scored = recipes.map((recipe) => {
    let ingredientList: any[];
    try {
      ingredientList = JSON.parse(recipe.ingredients);
    } catch {
      ingredientList = [];
    }

    const recipeIngredients = ingredientList.map((i: any) =>
      (i.name || '').toLowerCase()
    );

    let score = 0;
    for (const ri of recipeIngredients) {
      if (ingredientNames.some((inv) => ri.includes(inv) || inv.includes(ri))) {
        score += 1;
      }
      if (
        prioritizeExpiring &&
        expiringNames.some((exp) => ri.includes(exp) || exp.includes(ri))
      ) {
        score += 2; // bonus for expiring items
      }
    }

    return { recipe, score, matchedIngredients: score };
  });

  scored.sort((a, b) => b.score - a.score);

  const suggestions = scored.slice(0, count).map((s) => ({
    id: s.recipe.id,
    title: s.recipe.title,
    slug: s.recipe.slug,
    description: s.recipe.description,
    category: s.recipe.category,
    prepTime: s.recipe.prepTimeMinutes,
    cookTime: s.recipe.cookTimeMinutes,
    difficulty: s.recipe.difficulty,
    nutrition: s.recipe.nutrition ? JSON.parse(s.recipe.nutrition) : null,
    ingredientMatchScore: s.matchedIngredients,
  }));

  return {
    result: {
      suggestions,
      availableIngredients: ingredientNames,
      expiringItems: expiringNames.length > 0 ? expiringNames : undefined,
    },
    metadata: { type: 'suggestions', recipeIds: suggestions.map((s) => s.id) },
  };
}

async function getMealPlan(args: Record<string, any>, userId: string) {
  const { weekOffset = 0 } = args;

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const plan = await prisma.mealPlan.findFirst({
    where: {
      userId,
      startDate: { lte: sunday },
      endDate: { gte: monday },
    },
    include: {
      slots: {
        include: {
          recipe: {
            select: {
              id: true,
              title: true,
              slug: true,
              nutrition: true,
              prepTimeMinutes: true,
              cookTimeMinutes: true,
            },
          },
        },
        orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
      },
    },
  });

  if (!plan) {
    return {
      result: {
        plan: null,
        message: `No meal plan found for ${weekOffset === 0 ? 'this' : weekOffset > 0 ? 'next' : 'last'} week. Would you like me to create one?`,
      },
    };
  }

  return {
    result: {
      plan: {
        id: plan.id,
        name: plan.name,
        startDate: plan.startDate,
        endDate: plan.endDate,
        slots: plan.slots.map((s) => ({
          id: s.id,
          date: s.date,
          mealType: s.mealType,
          recipe: s.recipe
            ? {
                ...s.recipe,
                nutrition: s.recipe.nutrition ? JSON.parse(s.recipe.nutrition) : null,
              }
            : null,
          customName: s.customName,
        })),
      },
    },
    metadata: { type: 'meal_plan', planId: plan.id },
  };
}

async function createMealPlan(args: Record<string, any>, userId: string) {
  const { name, startDate: startStr, preferences } = args;

  // Default to next Monday
  let start: Date;
  if (startStr) {
    start = new Date(startStr);
  } else {
    start = new Date();
    const dayOfWeek = start.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    start.setDate(start.getDate() + daysUntilMonday);
  }
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  // Deactivate existing plans for the same week
  await prisma.mealPlan.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });

  const plan = await prisma.mealPlan.create({
    data: {
      userId,
      name: name || `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      startDate: start,
      endDate: end,
      isActive: true,
    },
  });

  // Auto-populate plan with recipes from the database
  const recipeWhere: any = { isPublished: true };
  if (preferences) {
    const prefLower = preferences.toLowerCase();
    // Build dietary filter from preferences
    const dietKeywords = ['vegetarian', 'vegan', 'keto', 'paleo', 'gluten-free', 'dairy-free', 'low-carb', 'high-protein'];
    const matchedDiet = dietKeywords.filter(k => prefLower.includes(k));
    if (matchedDiet.length > 0) {
      recipeWhere.OR = matchedDiet.map(tag => ({
        dietaryTags: { contains: tag },
      }));
    }
  }

  // Fetch a pool of recipes to populate the plan
  const recipes = await prisma.recipe.findMany({
    where: recipeWhere,
    take: 30,
    orderBy: { averageRating: 'desc' },
    select: {
      id: true,
      title: true,
      category: true,
      nutrition: true,
      prepTimeMinutes: true,
      cookTimeMinutes: true,
    },
  });

  if (recipes.length > 0) {
    // Separate by likely meal type based on category
    const breakfastRecipes = recipes.filter(r => r.category === 'breakfast');
    const mainRecipes = recipes.filter(r => r.category !== 'breakfast' && r.category !== 'dessert' && r.category !== 'drink');
    const allPool = mainRecipes.length > 0 ? mainRecipes : recipes;

    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    const slots: Array<{
      mealPlanId: string;
      recipeId: string;
      date: Date;
      mealType: string;
    }> = [];

    // Create 7 days x 3 meals
    for (let day = 0; day < 7; day++) {
      const slotDate = new Date(start);
      slotDate.setDate(start.getDate() + day);

      for (const mealType of mealTypes) {
        let pool = mealType === 'breakfast' && breakfastRecipes.length > 0
          ? breakfastRecipes
          : allPool;
        const recipe = pool[(day * 3 + mealTypes.indexOf(mealType)) % pool.length];
        if (recipe) {
          slots.push({
            mealPlanId: plan.id,
            recipeId: recipe.id,
            date: slotDate,
            mealType,
          });
        }
      }
    }

    if (slots.length > 0) {
      await prisma.mealPlanSlot.createMany({ data: slots });
    }

    // Re-fetch with slots populated
    const fullPlan = await prisma.mealPlan.findUnique({
      where: { id: plan.id },
      include: {
        slots: {
          include: {
            recipe: {
              select: { id: true, title: true, nutrition: true, prepTimeMinutes: true, cookTimeMinutes: true },
            },
          },
          orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
        },
      },
    });

    const slotSummary = (fullPlan?.slots || []).map(s => ({
      date: s.date,
      mealType: s.mealType,
      recipe: s.recipe ? { id: s.recipe.id, title: s.recipe.title } : null,
    }));

    return {
      result: {
        plan: {
          id: plan.id,
          name: plan.name,
          startDate: plan.startDate,
          endDate: plan.endDate,
          totalMeals: slotSummary.length,
          slots: slotSummary,
        },
        message: `Created and populated meal plan "${plan.name}" with ${slotSummary.length} meals across 7 days. You can swap any meal by telling me which day and meal you'd like to change.`,
      },
      metadata: { type: 'meal_plan', planId: plan.id },
    };
  }

  return {
    result: {
      plan: {
        id: plan.id,
        name: plan.name,
        startDate: plan.startDate,
        endDate: plan.endDate,
      },
      message: `Created meal plan "${plan.name}" (${start.toLocaleDateString()} – ${end.toLocaleDateString()}). No recipes matched your preferences to auto-fill, but you can add meals manually.`,
    },
    metadata: { type: 'meal_plan', planId: plan.id },
  };
}

async function addMealToPlan(args: Record<string, any>, userId: string) {
  const { mealPlanId, recipeId, date, mealType, customName } = args;

  // Verify plan belongs to user
  const plan = await prisma.mealPlan.findFirst({
    where: { id: mealPlanId, userId },
  });

  if (!plan) {
    return {
      result: { error: 'Meal plan not found or does not belong to you.' },
    };
  }

  // If a slot already exists for this date+mealType, update it; otherwise create
  const slotDate = new Date(date);
  slotDate.setHours(0, 0, 0, 0);

  const existing = await prisma.mealPlanSlot.findFirst({
    where: {
      mealPlanId,
      date: slotDate,
      mealType,
    },
  });

  let slot;
  if (existing) {
    slot = await prisma.mealPlanSlot.update({
      where: { id: existing.id },
      data: {
        recipeId: recipeId || null,
        customName: customName || null,
      },
      include: {
        recipe: { select: { id: true, title: true, nutrition: true } },
      },
    });
  } else {
    slot = await prisma.mealPlanSlot.create({
      data: {
        mealPlanId,
        recipeId: recipeId || null,
        date: slotDate,
        mealType,
        customName: customName || null,
      },
      include: {
        recipe: { select: { id: true, title: true, nutrition: true } },
      },
    });
  }

  const mealName = slot.recipe?.title || slot.customName || 'Custom meal';
  return {
    result: {
      slot: {
        id: slot.id,
        date: slot.date,
        mealType: slot.mealType,
        recipe: slot.recipe ? { id: slot.recipe.id, title: slot.recipe.title } : null,
        customName: slot.customName,
      },
      message: `${existing ? 'Updated' : 'Added'} ${mealType} on ${slotDate.toLocaleDateString()}: "${mealName}".`,
    },
    metadata: { type: 'meal_plan', planId: mealPlanId },
  };
}

// Shared fuzzy inventory matching
function buildInventoryMatcher(inventory: any[]) {
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

async function generateShoppingList(args: Record<string, any>, userId: string) {
  const { mealPlanId, recipeId, listName, saveToDB } = args;

  // Collect needed ingredients
  const needed: Map<string, { name: string; totalAmount: number; unit: string }> = new Map();
  let sourceName = '';

  if (recipeId) {
    // Single-recipe mode
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId },
      select: { title: true, ingredients: true },
    });

    if (!recipe) {
      return { result: { items: [], message: 'Recipe not found.' } };
    }

    sourceName = recipe.title;
    let ingredients: any[];
    try {
      ingredients = JSON.parse(recipe.ingredients);
    } catch {
      ingredients = [];
    }
    for (const ing of ingredients) {
      if (ing.isOptional) continue;
      const key = ing.name.toLowerCase();
      needed.set(key, {
        name: ing.name,
        totalAmount: ing.amount || 1,
        unit: ing.unit || '',
      });
    }
  } else {
    // Meal plan mode
    let plan: any;
    if (mealPlanId) {
      plan = await prisma.mealPlan.findFirst({
        where: { id: mealPlanId, userId },
        include: {
          slots: { include: { recipe: { select: { ingredients: true } } } },
        },
      });
    } else {
      plan = await prisma.mealPlan.findFirst({
        where: { userId, isActive: true },
        orderBy: { startDate: 'desc' },
        include: {
          slots: { include: { recipe: { select: { ingredients: true } } } },
        },
      });
    }

    if (!plan) {
      return {
        result: {
          items: [],
          message: "No active meal plan found. You can generate a shopping list from a specific recipe by providing a recipeId, or create a meal plan first.",
        },
      };
    }

    sourceName = plan.name;
    for (const slot of plan.slots) {
      if (!slot.recipe?.ingredients) continue;
      let ingredients: any[];
      try {
        ingredients = JSON.parse(slot.recipe.ingredients);
      } catch {
        continue;
      }
      for (const ing of ingredients) {
        if (ing.isOptional) continue;
        const key = ing.name.toLowerCase();
        const existing = needed.get(key);
        if (existing) {
          existing.totalAmount += ing.amount || 1;
        } else {
          needed.set(key, {
            name: ing.name,
            totalAmount: ing.amount || 1,
            unit: ing.unit || '',
          });
        }
      }
    }
  }

  // Get current inventory and build fuzzy matcher
  const inventory = await prisma.inventoryItem.findMany({ where: { userId } });
  const findMatch = buildInventoryMatcher(inventory);

  // Diff: needed minus what user already has
  const shoppingItems: any[] = [];
  for (const [_key, item] of needed) {
    const have = findMatch(item.name);
    if (!have || (have.quantity && have.quantity < item.totalAmount)) {
      shoppingItems.push({
        name: item.name,
        neededAmount: item.totalAmount,
        haveAmount: have?.quantity || 0,
        unit: item.unit,
      });
    }
  }

  // Optionally save to DB
  let savedList: any = null;
  if (saveToDB && shoppingItems.length > 0) {
    savedList = await prisma.shoppingList.create({
      data: {
        userId,
        name: listName || `Shopping for ${sourceName}`,
        sourceType: recipeId ? 'recipe' : 'meal_plan',
        sourceRecipeId: recipeId || undefined,
        items: {
          create: shoppingItems.map(item => ({
            name: item.name,
            quantity: item.neededAmount,
            unit: item.unit,
          })),
        },
      },
      include: { items: true },
    });
  }

  return {
    result: {
      sourceName,
      items: shoppingItems,
      totalItems: shoppingItems.length,
      savedListId: savedList?.id,
      message:
        shoppingItems.length === 0
          ? 'You already have everything you need!'
          : `You need ${shoppingItems.length} items for "${sourceName}".${savedList ? ' List saved!' : ''}`,
    },
    metadata: { type: 'shopping_list', listId: savedList?.id },
  };
}

async function manageShoppingList(args: Record<string, any>, userId: string) {
  const { action, listId, listName, itemName, quantity, unit } = args;

  switch (action) {
    case 'view_lists': {
      const lists = await prisma.shoppingList.findMany({
        where: { userId, isActive: true },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return {
        result: {
          lists: lists.map(l => ({
            id: l.id,
            name: l.name,
            itemCount: l.items.length,
            checkedCount: l.items.filter(i => i.isChecked).length,
            createdAt: l.createdAt,
          })),
          message: lists.length === 0
            ? "You don't have any shopping lists yet."
            : `You have ${lists.length} shopping list(s).`,
        },
      };
    }

    case 'create_list': {
      const list = await prisma.shoppingList.create({
        data: {
          userId,
          name: listName || 'Shopping List',
          sourceType: 'manual',
        },
      });
      return {
        result: {
          list: { id: list.id, name: list.name },
          message: `Created shopping list "${list.name}".`,
        },
        metadata: { type: 'shopping_list', listId: list.id },
      };
    }

    case 'add_item': {
      if (!listId) {
        // Find or create default list
        let list = await prisma.shoppingList.findFirst({
          where: { userId, isActive: true },
          orderBy: { createdAt: 'desc' },
        });
        if (!list) {
          list = await prisma.shoppingList.create({
            data: { userId, name: 'Shopping List', sourceType: 'manual' },
          });
        }

        const item = await prisma.shoppingListItem.create({
          data: {
            shoppingListId: list.id,
            name: itemName || 'item',
            quantity: quantity || null,
            unit: unit || null,
          },
        });
        return {
          result: {
            item: { id: item.id, name: item.name, quantity: item.quantity, unit: item.unit },
            listName: list.name,
            message: `Added "${item.name}" to "${list.name}".`,
          },
          metadata: { type: 'shopping_list', listId: list.id },
        };
      }

      const item = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: listId,
          name: itemName || 'item',
          quantity: quantity || null,
          unit: unit || null,
        },
      });
      return {
        result: {
          item: { id: item.id, name: item.name, quantity: item.quantity, unit: item.unit },
          message: `Added "${item.name}" to the list.`,
        },
        metadata: { type: 'shopping_list', listId },
      };
    }

    case 'check_item': {
      if (!itemName) {
        return { result: { error: 'Please specify which item to check off.' } };
      }

      // Find the item by name in user's lists
      const matchItem = await prisma.shoppingListItem.findFirst({
        where: {
          shoppingList: { userId, isActive: true },
          name: { contains: itemName.toLowerCase() },
          isChecked: false,
        },
      });

      if (!matchItem) {
        return { result: { message: `Couldn't find "${itemName}" in your shopping lists.` } };
      }

      await prisma.shoppingListItem.update({
        where: { id: matchItem.id },
        data: { isChecked: true, checkedAt: new Date() },
      });

      return {
        result: {
          message: `Checked off "${matchItem.name}".`,
        },
      };
    }

    default:
      return { result: { error: `Unknown action: ${action}` } };
  }
}

async function logMeal(args: Record<string, any>, userId: string) {
  const { description, mealType, calories, protein, carbs, fat } = args;

  const meal = await prisma.mealLog.create({
    data: {
      userId,
      mealType,
      mealDate: new Date(),
      mealName: description,
      calories: calories || null,
      proteinGrams: protein || null,
      carbsGrams: carbs || null,
      fatGrams: fat || null,
    },
  });

  return {
    result: {
      meal: {
        id: meal.id,
        description: meal.mealName,
        mealType: meal.mealType,
        calories: meal.calories,
        protein: meal.proteinGrams,
        carbs: meal.carbsGrams,
        fat: meal.fatGrams,
        loggedAt: meal.createdAt,
      },
      message: `Logged ${mealType}: "${description}"${calories ? ` (${calories} cal)` : ''}.`,
    },
    metadata: { type: 'meal_log' },
  };
}

async function getRecipeDetail(args: Record<string, any>, _userId: string) {
  const { recipeId, slug } = args;

  const where: any = {};
  if (recipeId) where.id = recipeId;
  else if (slug) where.slug = slug;
  else return { result: { error: 'Provide either recipeId or slug.' } };

  const recipe = await prisma.recipe.findFirst({
    where,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      brand: true,
      category: true,
      imageUrl: true,
      prepTimeMinutes: true,
      cookTimeMinutes: true,
      difficulty: true,
      servings: true,
      averageRating: true,
      nutrition: true,
      dietaryTags: true,
      ingredients: true,
      instructions: true,
    },
  });

  if (!recipe) {
    return { result: { error: 'Recipe not found.' } };
  }

  return {
    result: {
      recipe: {
        ...recipe,
        nutrition: recipe.nutrition ? JSON.parse(recipe.nutrition) : null,
        dietaryTags: recipe.dietaryTags ? JSON.parse(recipe.dietaryTags) : [],
        ingredients: recipe.ingredients ? JSON.parse(recipe.ingredients) : [],
        instructions: recipe.instructions ? JSON.parse(recipe.instructions) : [],
      },
    },
    metadata: { type: 'recipe_detail', recipeId: recipe.id },
  };
}

async function getNutritionSummary(args: Record<string, any>, userId: string) {
  const { range = 'day' } = args;

  const dateStr = args.date || new Date().toISOString().split('T')[0];
  const startDate = new Date(dateStr);
  startDate.setHours(0, 0, 0, 0);

  let endDate: Date;
  if (range === 'week') {
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else {
    endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
  }

  const meals = await prisma.mealLog.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.proteinGrams || 0),
      carbs: acc.carbs + (m.carbsGrams || 0),
      fat: acc.fat + (m.fatGrams || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Check for health goal
  const goal = await prisma.healthGoal.findFirst({
    where: { userId, isActive: true, goalType: 'calories' },
  });

  return {
    result: {
      range,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      meals: meals.map((m) => ({
        description: m.mealName,
        mealType: m.mealType,
        calories: m.calories,
        protein: m.proteinGrams,
        carbs: m.carbsGrams,
        fat: m.fatGrams,
        time: m.createdAt,
      })),
      totals,
      goal: goal
        ? { targetCalories: goal.targetValue, remaining: goal.targetValue - totals.calories }
        : undefined,
      mealCount: meals.length,
    },
    metadata: { type: 'nutrition' },
  };
}
