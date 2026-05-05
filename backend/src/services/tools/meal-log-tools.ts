import prisma from '../../lib/prisma';

export async function getTodayMeals(userId: string) {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const meals = await prisma.mealLog.findMany({
    where: { userId, mealDate: { gte: dayStart, lt: dayEnd } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      mealType: true,
      mealName: true,
      calories: true,
      proteinGrams: true,
      carbsGrams: true,
      fatGrams: true,
      mealTime: true,
    },
  });

  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    protein: acc.protein + (m.proteinGrams || 0),
    carbs: acc.carbs + (m.carbsGrams || 0),
    fat: acc.fat + (m.fatGrams || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return {
    result: {
      meals: meals.map(m => ({
        id: m.id,
        mealType: m.mealType,
        mealName: m.mealName,
        calories: m.calories,
        protein: m.proteinGrams,
        carbs: m.carbsGrams,
        fat: m.fatGrams,
      })),
      totals,
      count: meals.length,
    },
    metadata: { type: 'today_meals' },
  };
}

export async function logMeal(args: Record<string, any>, userId: string) {
  const { description, mealType, calories, protein, carbs, fat } = args;

  const meal = await prisma.mealLog.create({
    data: {
      userId,
      mealType,
      mealDate: new Date(),
      mealTime: new Date(),
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

export async function updateMealTool(args: Record<string, any>, userId: string) {
  const { mealId, description, mealType, calories, protein, carbs, fat } = args;

  if (!mealId) {
    return { result: { error: 'mealId is required to update a meal.' } };
  }

  // Verify ownership
  const existing = await prisma.mealLog.findFirst({
    where: { id: mealId, userId },
  });
  if (!existing) {
    return { result: { error: 'Meal not found or not owned by user.' } };
  }

  const updated = await prisma.mealLog.update({
    where: { id: mealId },
    data: {
      ...(description != null && { mealName: description }),
      ...(mealType != null && { mealType }),
      ...(calories != null && { calories }),
      ...(protein != null && { proteinGrams: protein }),
      ...(carbs != null && { carbsGrams: carbs }),
      ...(fat != null && { fatGrams: fat }),
    },
  });

  return {
    result: {
      meal: {
        id: updated.id,
        description: updated.mealName,
        mealType: updated.mealType,
        calories: updated.calories,
        protein: updated.proteinGrams,
        carbs: updated.carbsGrams,
        fat: updated.fatGrams,
      },
      message: `Updated meal "${updated.mealName}" — ${updated.calories} cal, ${updated.proteinGrams}g protein.`,
    },
    metadata: { type: 'meal_update' },
  };
}

export async function deleteMealTool(args: Record<string, any>, userId: string) {
  const { mealId } = args;

  if (!mealId) {
    return { result: { error: 'mealId is required to delete a meal.' } };
  }

  // Verify ownership
  const existing = await prisma.mealLog.findFirst({
    where: { id: mealId, userId },
  });
  if (!existing) {
    return { result: { error: 'Meal not found or not owned by user.' } };
  }

  await prisma.mealLog.delete({ where: { id: mealId } });

  return {
    result: {
      deleted: true,
      mealId,
      description: existing.mealName,
      message: `Deleted "${existing.mealName}" from your meals.`,
    },
    metadata: { type: 'meal_delete' },
  };
}

export async function getNutritionSummary(args: Record<string, any>, userId: string, clientDate?: string) {
  const { range = 'day' } = args;

  // Use client's local date if provided, otherwise fall back to UTC
  const dateStr = args.date || clientDate || new Date().toISOString().split('T')[0];
  const [year, month, day] = dateStr.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, day));

  let endDate: Date;
  if (range === 'week') {
    endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 7);
  } else {
    endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 1);
  }

  const meals = await prisma.mealLog.findMany({
    where: {
      userId,
      mealDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { mealDate: 'asc' },
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
