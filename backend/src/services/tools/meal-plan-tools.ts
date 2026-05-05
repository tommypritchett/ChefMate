import prisma from '../../lib/prisma';

export async function suggestMeals(args: Record<string, any>, userId: string) {
  const { count = 3, mealType, prioritizeExpiring = true } = args;

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
        score += 2;
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

export async function getMealPlan(args: Record<string, any>, userId: string) {
  const { weekOffset = 0 } = args;

  const now = new Date();
  const dayOfWeek = now.getDay();
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
          servings: (s as any).servings || null,
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

export async function createMealPlan(args: Record<string, any>, userId: string) {
  const { name, startDate: startStr, preferences } = args;

  let start: Date;
  if (startStr) {
    start = new Date(startStr);
  } else {
    // Calculate THIS week's Monday from today
    start = new Date();
    const dayOfWeek = start.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + mondayOffset);
  }
  start.setHours(0, 0, 0, 0);
  console.log(`[createMealPlan] Calculated start: ${start.toISOString()}, end: ${new Date(start.getTime() + 6 * 86400000).toISOString()}`);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

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

  // Exclude fast food recreations (brand != null) from meal plans — real home-cooked meals only
  const recipeWhere: any = { isPublished: true, brand: null, originalItemName: null };
  if (preferences) {
    const prefLower = preferences.toLowerCase();
    const dietKeywords = ['vegetarian', 'vegan', 'keto', 'paleo', 'gluten-free', 'dairy-free', 'low-carb', 'high-protein'];
    const matchedDiet = dietKeywords.filter(k => prefLower.includes(k));
    if (matchedDiet.length > 0) {
      recipeWhere.OR = matchedDiet.map(tag => ({
        dietaryTags: { contains: tag },
      }));
    }
  }

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

// Meal prep tips based on recipe properties
const MEAL_PREP_TIPS: Record<string, { freezable: boolean; shelfLife: string; tip: string }> = {
  chicken: { freezable: true, shelfLife: '3-4 days in fridge, 3 months frozen', tip: 'Cook chicken in bulk, portion into containers, and freeze extras for quick weeknight meals.' },
  beef: { freezable: true, shelfLife: '3-4 days in fridge, 3 months frozen', tip: 'Brown ground beef ahead of time for quick taco nights, pasta sauces, or stir-fries.' },
  fish: { freezable: true, shelfLife: '1-2 days in fridge, 2 months frozen', tip: 'Fish is best fresh. If meal prepping, cook and eat within 2 days or freeze immediately.' },
  rice: { freezable: true, shelfLife: '4-6 days in fridge, 6 months frozen', tip: 'Cook a big batch of rice — it freezes great! Reheat with a splash of water.' },
  pasta: { freezable: true, shelfLife: '3-5 days in fridge, 2 months frozen', tip: 'Slightly undercook pasta for meal prep — it softens when reheated.' },
  salad: { freezable: false, shelfLife: '1-2 days in fridge', tip: 'Keep dressing separate until serving to prevent wilting.' },
  soup: { freezable: true, shelfLife: '3-4 days in fridge, 3 months frozen', tip: 'Soups and stews are perfect for meal prep — flavors improve over time!' },
  bowl: { freezable: true, shelfLife: '3-4 days in fridge, 2 months frozen', tip: 'Prep grain bowls with protein and store sauces separately for best texture.' },
  burger: { freezable: true, shelfLife: '2-3 days in fridge, 3 months frozen', tip: 'Form patties and freeze with parchment paper between them for easy grab-and-cook meals.' },
  breakfast: { freezable: true, shelfLife: '3-5 days in fridge, 2 months frozen', tip: 'Breakfast burritos, egg muffins, and overnight oats are great make-ahead options.' },
};

function getMealPrepTip(recipe: any): { freezable: boolean; shelfLife: string; tip: string } | null {
  const title = (recipe.title || '').toLowerCase();
  const category = (recipe.category || '').toLowerCase();
  const ingredients = (recipe.ingredients || '').toLowerCase();

  for (const [keyword, tip] of Object.entries(MEAL_PREP_TIPS)) {
    if (title.includes(keyword) || category.includes(keyword) || ingredients.includes(keyword)) {
      return tip;
    }
  }

  return { freezable: true, shelfLife: '3-4 days in fridge', tip: 'Most cooked meals can be refrigerated for 3-4 days. Portion into containers while warm for best results.' };
}

export async function addMealToPlan(args: Record<string, any>, userId: string) {
  const { mealPlanId, recipeId, date, mealType, customName, servings } = args;

  const plan = await prisma.mealPlan.findFirst({
    where: { id: mealPlanId, userId },
  });

  if (!plan) {
    return {
      result: { error: 'Meal plan not found or does not belong to you.' },
    };
  }

  const slotDate = new Date(date);
  slotDate.setHours(0, 0, 0, 0);

  const existing = await prisma.mealPlanSlot.findFirst({
    where: {
      mealPlanId,
      date: slotDate,
      mealType,
    },
  });

  let recipeDetail: any = null;
  if (recipeId) {
    recipeDetail = await prisma.recipe.findFirst({
      where: { id: recipeId },
      select: { id: true, title: true, nutrition: true, servings: true, ingredients: true, category: true },
    });
  }

  const slotServings = servings || recipeDetail?.servings || null;

  let slot;
  if (existing) {
    slot = await prisma.mealPlanSlot.update({
      where: { id: existing.id },
      data: {
        recipeId: recipeId || null,
        customName: customName || null,
        servings: slotServings,
      },
      include: {
        recipe: { select: { id: true, title: true, nutrition: true, servings: true } },
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
        servings: slotServings,
      },
      include: {
        recipe: { select: { id: true, title: true, nutrition: true, servings: true } },
      },
    });
  }

  let scaledNutrition: any = null;
  if (recipeDetail?.nutrition && slotServings) {
    try {
      const baseNutrition = JSON.parse(recipeDetail.nutrition);
      const recipeDefaultServings = recipeDetail.servings || 1;
      const multiplier = slotServings / recipeDefaultServings;
      scaledNutrition = {
        calories: Math.round((baseNutrition.calories || 0) * multiplier),
        protein: Math.round((baseNutrition.protein || 0) * multiplier),
        carbs: Math.round((baseNutrition.carbs || 0) * multiplier),
        fat: Math.round((baseNutrition.fat || 0) * multiplier),
        perServing: baseNutrition,
        totalServings: slotServings,
      };
    } catch {}
  }

  const mealPrepTip = recipeDetail ? getMealPrepTip(recipeDetail) : null;

  const mealName = slot.recipe?.title || slot.customName || 'Custom meal';
  return {
    result: {
      slot: {
        id: slot.id,
        date: slot.date,
        mealType: slot.mealType,
        servings: slotServings,
        recipe: slot.recipe ? { id: slot.recipe.id, title: slot.recipe.title, defaultServings: slot.recipe.servings } : null,
        customName: slot.customName,
      },
      scaledNutrition,
      mealPrepTip: slotServings && slotServings > 1 ? mealPrepTip : null,
      message: `${existing ? 'Updated' : 'Added'} ${mealType} on ${slotDate.toLocaleDateString()}: "${mealName}"${slotServings ? ` (${slotServings} servings)` : ''}.`,
    },
    metadata: { type: 'meal_plan', planId: mealPlanId },
  };
}

export async function scheduleMealPrep(args: Record<string, any>, userId: string) {
  const { recipeId, mealType, numberOfMeals, weekdaysOnly = true, skipConflicts = false, replaceConflicts = false } = args;

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId },
    select: { id: true, title: true, nutrition: true, servings: true },
  });

  if (!recipe) {
    return { result: { error: `Recipe not found with ID "${recipeId}". Make sure to use the exact recipe ID from search_recipes or create_custom_recipe.` } };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDates: Date[] = [];
  let cursor = new Date(today);
  cursor.setDate(cursor.getDate() + 1);

  while (targetDates.length < numberOfMeals) {
    const dayOfWeek = cursor.getDay();
    if (!weekdaysOnly || (dayOfWeek >= 1 && dayOfWeek <= 5)) {
      targetDates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const firstDate = targetDates[0];
  const lastDate = targetDates[targetDates.length - 1];

  const firstDay = firstDate.getDay();
  const mondayOffset = firstDay === 0 ? -6 : 1 - firstDay;
  const planStart = new Date(firstDate);
  planStart.setDate(firstDate.getDate() + mondayOffset);
  planStart.setHours(0, 0, 0, 0);

  const lastDay = lastDate.getDay();
  const sundayOffset = lastDay === 0 ? 0 : 7 - lastDay;
  const planEnd = new Date(lastDate);
  planEnd.setDate(lastDate.getDate() + sundayOffset);
  planEnd.setHours(23, 59, 59, 999);

  let plan = await prisma.mealPlan.findFirst({
    where: {
      userId,
      startDate: { lte: planEnd },
      endDate: { gte: planStart },
    },
    include: {
      slots: {
        where: { mealType },
        select: { id: true, date: true, mealType: true, recipe: { select: { title: true } }, customName: true },
      },
    },
  });

  if (!plan) {
    plan = await prisma.mealPlan.create({
      data: {
        userId,
        name: `Meal Prep - ${planStart.toLocaleDateString()}`,
        startDate: planStart,
        endDate: planEnd,
        isActive: true,
      },
      include: {
        slots: {
          where: { mealType },
          select: { id: true, date: true, mealType: true, recipe: { select: { title: true } }, customName: true },
        },
      },
    });
  }

  const existingSlotsByDate = new Map<string, any>();
  for (const slot of plan.slots) {
    const dateKey = new Date(slot.date).toISOString().split('T')[0];
    existingSlotsByDate.set(dateKey, slot);
  }

  const conflicts: { date: string; existingMeal: string }[] = [];
  const scheduledDates: string[] = [];
  const skippedDates: string[] = [];

  for (const targetDate of targetDates) {
    const dateKey = targetDate.toISOString().split('T')[0];
    const existing = existingSlotsByDate.get(dateKey);

    if (existing) {
      const existingName = existing.recipe?.title || existing.customName || 'Unknown meal';
      if (replaceConflicts) {
        await prisma.mealPlanSlot.delete({ where: { id: existing.id } });
      } else if (skipConflicts) {
        skippedDates.push(`${dateKey} (has: ${existingName})`);
        continue;
      } else {
        conflicts.push({ date: dateKey, existingMeal: existingName });
        continue;
      }
    }

    const slotDate = new Date(targetDate);
    slotDate.setHours(0, 0, 0, 0);

    await prisma.mealPlanSlot.create({
      data: {
        mealPlanId: plan.id,
        recipeId: recipe.id,
        date: slotDate,
        mealType,
        servings: 1,
      },
    });

    scheduledDates.push(dateKey);
  }

  if (conflicts.length > 0 && !skipConflicts) {
    return {
      result: {
        scheduled: false,
        conflicts,
        message: `Found ${conflicts.length} existing ${mealType} meals that would be replaced. The user should confirm before overwriting.`,
        conflictDetails: conflicts.map(c => `${c.date}: ${c.existingMeal}`),
        recipe: { id: recipe.id, title: recipe.title },
        requestedDates: targetDates.map(d => d.toISOString().split('T')[0]),
      },
    };
  }

  let perServingNutrition: any = null;
  if (recipe.nutrition) {
    try {
      perServingNutrition = JSON.parse(recipe.nutrition);
    } catch {}
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const formattedDates = scheduledDates.map(d => {
    const dt = new Date(d + 'T12:00:00');
    return `${dayNames[dt.getDay()]} ${dt.getMonth() + 1}/${dt.getDate()}`;
  });

  return {
    result: {
      scheduled: true,
      recipe: { id: recipe.id, title: recipe.title },
      mealType,
      scheduledDates,
      formattedSchedule: formattedDates,
      skippedDates: skippedDates.length > 0 ? skippedDates : undefined,
      perServingNutrition,
      totalMealsScheduled: scheduledDates.length,
      message: `Scheduled "${recipe.title}" for ${mealType} on ${formattedDates.join(', ')}. Each slot = 1 serving.`,
    },
    metadata: { type: 'meal_plan', planId: plan.id },
  };
}
