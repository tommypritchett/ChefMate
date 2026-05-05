import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import {
  registerForPushNotifications,
  addNotificationResponseListener,
  scheduleFoodLogReminder,
  resetFoodLogReminder,
  scheduleExpiredInventoryAlert,
  scheduleFreezerDefrostReminder,
  scheduleWeeklyMealPrepReminder,
  QuietHoursSettings,
} from '../services/notifications';
import { nutritionApi, inventoryApi } from '../services/api';
import { isExpired } from '../components/inventory/inventoryHelpers';

function getQuietSettings(user: any): QuietHoursSettings {
  if (!user?.notificationSettings) return {};
  try {
    const s = typeof user.notificationSettings === 'string'
      ? JSON.parse(user.notificationSettings)
      : user.notificationSettings;
    return {
      quietHoursEnabled: s.quietHoursEnabled,
      quietFrom: s.quietFrom,
      quietTo: s.quietTo,
    };
  } catch {
    return {};
  }
}

function getNotifSettings(user: any): Record<string, any> {
  if (!user?.notificationSettings) return {};
  try {
    return typeof user.notificationSettings === 'string'
      ? JSON.parse(user.notificationSettings)
      : user.notificationSettings;
  } catch {
    return {};
  }
}

export function useNotifications() {
  const { user, isAuthenticated } = useAuthStore();
  const listenerRef = useRef<any>(null);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === 'web') return;

    const quiet = getQuietSettings(user);
    const settings = getNotifSettings(user);

    // Register for push notifications
    registerForPushNotifications().catch(() => {});

    // 1) Food logging reminder — check last meal log
    if (settings.mealReminders !== false) {
      checkFoodLogAndSchedule(quiet);
    }

    // 2) Expired inventory alert + freezer defrost — check on app open
    if (settings.expiryAlerts !== false) {
      checkExpiredInventory(quiet);
      checkFreezerItems(quiet);
    }

    // 3) Weekly meal prep reminder — Sunday at configured time
    if (settings.mealReminders !== false) {
      const mealPrepHour = settings.mealPrepHour ?? 17;
      const mealPrepMinute = settings.mealPrepMinute ?? 0;
      scheduleWeeklyMealPrepReminder(mealPrepHour, mealPrepMinute, quiet).catch(() => {});
    }

    // Listen for notification taps
    listenerRef.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as any;
      switch (data?.type) {
        case 'food_log_reminder':
          router.push('/health-goals');
          break;
        case 'expired_inventory':
          router.push('/(tabs)/inventory');
          break;
        case 'meal_prep_reminder':
          router.push('/(tabs)/meal-plan');
          break;
        case 'freezer_defrost':
          router.push('/(tabs)/inventory');
          break;
      }
    });

    return () => {
      listenerRef.current?.remove();
    };
  }, [isAuthenticated]);
}

async function checkFoodLogAndSchedule(quiet: QuietHoursSettings) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { meals } = await nutritionApi.getDailyNutrition(today);

    // Also check yesterday
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { meals: yesterdayMeals } = await nutritionApi.getDailyNutrition(yesterday);

    const hasRecentMeal = meals.length > 0 || yesterdayMeals.length > 0;

    if (!hasRecentMeal) {
      // No meals in 24+ hours — schedule immediate-ish reminder
      await scheduleFoodLogReminder(quiet);
    } else {
      // Has recent meal — reset the 24h countdown
      await resetFoodLogReminder(quiet);
    }
  } catch {
    // API error — don't schedule
  }
}

const FREEZER_AGE_THRESHOLD_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

async function checkFreezerItems(quiet: QuietHoursSettings) {
  try {
    const { items } = await inventoryApi.getInventory();
    const oldFreezerItems = items.filter((item: any) => {
      if ((item.storageLocation || '').toLowerCase() !== 'freezer') return false;
      if (!item.createdAt) return false;
      return Date.now() - new Date(item.createdAt).getTime() > FREEZER_AGE_THRESHOLD_MS;
    });

    if (oldFreezerItems.length > 0) {
      const names = oldFreezerItems.slice(0, 3).map((i: any) => i.name);
      await scheduleFreezerDefrostReminder(names, quiet);
    }
  } catch {
    // API error — don't schedule
  }
}

async function checkExpiredInventory(quiet: QuietHoursSettings) {
  try {
    const { items } = await inventoryApi.getInventory();
    const expiredCount = items.filter(
      (item: any) => isExpired(item.expiresAt, item.storageLocation),
    ).length;

    if (expiredCount >= 3) {
      await scheduleExpiredInventoryAlert(expiredCount, quiet);
    }
  } catch {
    // API error — don't schedule
  }
}
