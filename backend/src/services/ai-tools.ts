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
      name: 'generate_shopping_list',
      description:
        "Generate a shopping list by comparing the active meal plan's ingredients against the user's current inventory. Use when the user asks for a shopping list or what they need to buy.",
      parameters: {
        type: 'object',
        properties: {
          mealPlanId: {
            type: 'string',
            description: 'Specific meal plan ID. If omitted, uses the most recent active plan.',
          },
        },
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
    case 'generate_shopping_list':
      return generateShoppingList(args, userId);
    case 'log_meal':
      return logMeal(args, userId);
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
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { brand: { contains: q } },
    ];
  }

  const recipes = await prisma.recipe.findMany({
    where,
    take: Math.min(limit, 10),
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
    },
  });

  const parsed = recipes.map((r) => ({
    ...r,
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
  const { name, startDate: startStr } = args;

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

  const plan = await prisma.mealPlan.create({
    data: {
      userId,
      name: name || `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      startDate: start,
      endDate: end,
      isActive: true,
    },
  });

  return {
    result: {
      plan: {
        id: plan.id,
        name: plan.name,
        startDate: plan.startDate,
        endDate: plan.endDate,
      },
      message: `Created meal plan "${plan.name}" (${start.toLocaleDateString()} – ${end.toLocaleDateString()}). You can now add meals to specific days and slots.`,
    },
    metadata: { type: 'meal_plan', planId: plan.id },
  };
}

async function generateShoppingList(args: Record<string, any>, userId: string) {
  const { mealPlanId } = args;

  // Find plan
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
        message: "No active meal plan found. Create a meal plan first, then I can generate a shopping list from it.",
      },
    };
  }

  // Collect needed ingredients from recipes
  const needed: Map<string, { name: string; totalAmount: number; unit: string }> = new Map();
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

  // Get current inventory
  const inventory = await prisma.inventoryItem.findMany({
    where: { userId },
  });
  const inventoryMap = new Map(
    inventory.map((i) => [i.name.toLowerCase(), i])
  );

  // Diff: needed minus what user already has
  const shoppingItems: any[] = [];
  for (const [key, item] of needed) {
    const have = inventoryMap.get(key);
    if (!have || (have.quantity && have.quantity < item.totalAmount)) {
      shoppingItems.push({
        name: item.name,
        neededAmount: item.totalAmount,
        haveAmount: have?.quantity || 0,
        unit: item.unit,
      });
    }
  }

  return {
    result: {
      planName: plan.name,
      items: shoppingItems,
      totalItems: shoppingItems.length,
      message:
        shoppingItems.length === 0
          ? 'You already have everything you need!'
          : `You need ${shoppingItems.length} items for your "${plan.name}" meal plan.`,
    },
    metadata: { type: 'shopping_list' },
  };
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
