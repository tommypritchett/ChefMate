import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import prisma from '../../lib/prisma';
import type { UserContext } from './types';

export async function loadUserContext(userId: string): Promise<UserContext> {
  const context: UserContext = {};

  try {
    // Load user preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (user?.preferences) {
      context.preferences = user.preferences;
      // Parse Kroger location and other prefs from preferences JSON
      try {
        const prefs = JSON.parse(user.preferences);
        if (prefs.krogerLocation) {
          const loc = prefs.krogerLocation;
          context.krogerStore = `${loc.chain} at ${loc.address} (ID: ${loc.locationId})`;
        }
        if (prefs.householdSize && prefs.householdSize > 1) {
          context.householdSize = prefs.householdSize;
        }
        // Compute remaining macros if macro tracking is on
        if (prefs.macroTracking) {
          const goals = await prisma.healthGoal.findMany({
            where: { userId, isActive: true, goalType: { in: ['calories', 'protein', 'carbs', 'fat'] } },
            select: { goalType: true, targetValue: true },
          });
          if (goals.length > 0) {
            // Use UTC midnight range since mealDate is stored as YYYY-MM-DDT00:00:00.000Z
            const now = new Date();
            const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            const dayEnd = new Date(dayStart);
            dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

            const todayLogs = await prisma.mealLog.findMany({
              where: { userId, mealDate: { gte: dayStart, lt: dayEnd } },
              select: { id: true, mealType: true, mealName: true, calories: true, proteinGrams: true, carbsGrams: true, fatGrams: true },
            });

            const eaten = todayLogs.reduce((acc, log) => ({
              calories: acc.calories + (log.calories || 0),
              protein: acc.protein + (log.proteinGrams || 0),
              carbs: acc.carbs + (log.carbsGrams || 0),
              fat: acc.fat + (log.fatGrams || 0),
            }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

            const targets: Record<string, number> = {};
            for (const g of goals) targets[g.goalType] = g.targetValue;

            context.remainingMacros = {
              calories: Math.max(0, (targets.calories || 0) - eaten.calories),
              protein: Math.max(0, (targets.protein || 0) - eaten.protein),
              carbs: Math.max(0, (targets.carbs || 0) - eaten.carbs),
              fat: Math.max(0, (targets.fat || 0) - eaten.fat),
            };

            // Attach today's individual meals for the system prompt
            context.todayMeals = todayLogs.map(l => ({
              id: l.id,
              mealType: (l as any).mealType || 'unknown',
              mealName: (l as any).mealName || 'Unnamed',
              calories: l.calories || 0,
              protein: l.proteinGrams || 0,
            }));
          }
        }
      } catch {}
    }

    // Load inventory summary (just item names + expiry)
    const items = await prisma.inventoryItem.findMany({
      where: { userId },
      select: { name: true, expiresAt: true, storageLocation: true },
      take: 30,
    });

    if (items.length > 0) {
      const now = new Date();
      const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const expiring = items.filter((i) => i.expiresAt && new Date(i.expiresAt) <= threeDays);

      const itemsByLocation: Record<string, string[]> = {};
      for (const i of items) {
        const loc = i.storageLocation || 'other';
        if (!itemsByLocation[loc]) itemsByLocation[loc] = [];
        itemsByLocation[loc].push(i.name);
      }
      const locationSummaries = Object.entries(itemsByLocation)
        .map(([loc, names]) => `${loc}: ${names.join(', ')}`)
        .join('; ');

      context.inventorySummary =
        `${items.length} items — ${locationSummaries}` +
        (expiring.length > 0
          ? `. EXPIRING SOON: ${expiring.map((i) => i.name).join(', ')}`
          : '');
    }

    // Load active health goals
    const goals = await prisma.healthGoal.findMany({
      where: { userId, isActive: true },
      select: { goalType: true, targetValue: true },
    });
    if (goals.length > 0) {
      context.healthGoals = goals.map(g => `${g.goalType}: ${g.targetValue}`).join(', ');
    }
  } catch (err) {
    console.error('Error loading user context:', err);
  }

  return context;
}

export async function loadThreadHistory(
  threadId: string,
  limit = 20
): Promise<ChatCompletionMessageParam[]> {
  const messages = await prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { role: true, message: true },
  });

  return messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.message,
  }));
}
