/**
 * Backend Notification Service
 * Handles checking for expiring items and sending push notifications.
 * In production, this would send Expo push notifications via the Expo Push API.
 * For now, the client-side handles local notifications.
 */

import prisma from '../lib/prisma';

interface ExpiringItem {
  id: string;
  name: string;
  expiresAt: Date;
  userId: string;
  daysUntilExpiry: number;
}

// Find all items expiring within N days
export async function findExpiringItems(withinDays: number = 2): Promise<ExpiringItem[]> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + withinDays);

  const items = await prisma.inventoryItem.findMany({
    where: {
      expiresAt: {
        gte: now,
        lte: futureDate,
      },
    },
    select: {
      id: true,
      name: true,
      expiresAt: true,
      userId: true,
    },
  });

  return items
    .filter((item): item is typeof item & { expiresAt: Date } => item.expiresAt !== null)
    .map(item => ({
      ...item,
      expiresAt: item.expiresAt,
      daysUntilExpiry: Math.ceil((item.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }));
}

// Check for meal reminders needed today
export async function getTodaysMeals(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const plans = await prisma.mealPlan.findMany({
    where: {
      userId,
      startDate: { lte: tomorrow },
      endDate: { gte: today },
    },
    include: {
      slots: {
        where: {
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          recipe: {
            select: { title: true },
          },
        },
      },
    },
  });

  return plans.flatMap(p => p.slots);
}

/**
 * In production, this would be a cron job that:
 * 1. Finds all expiring items across all users
 * 2. Sends Expo push notifications via https://exp.host/--/api/v2/push/send
 * 3. Sends meal reminders at configured times
 *
 * For now, the client handles local notifications on app launch.
 */
export async function runNotificationCheck() {
  const expiringItems = await findExpiringItems(2);
  console.log(`Found ${expiringItems.length} items expiring within 2 days`);
  // In production: group by userId, send push to each user's token
  return expiringItems;
}
