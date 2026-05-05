import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (Platform.OS === 'web') {
    console.log('Push notifications not supported on web');
    return null;
  }

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });

      await Notifications.setNotificationChannelAsync('expiry', {
        name: 'Expiry Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Alerts for expiring food items',
      });

      await Notifications.setNotificationChannelAsync('meals', {
        name: 'Meal Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'Daily meal planning reminders',
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error('Failed to register for push notifications:', error);
    return null;
  }
}

// Schedule a local notification for expiring items
export async function scheduleExpiryNotification(itemName: string, expiresAt: Date) {
  const now = new Date();
  const twoDaysBefore = new Date(expiresAt);
  twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);

  if (twoDaysBefore <= now) return; // Already past the alert window

  const trigger = twoDaysBefore;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Food Expiring Soon',
      body: `${itemName} expires in 2 days. Use it or freeze it!`,
      data: { type: 'expiry', itemName },
    },
    trigger: { date: trigger, channelId: 'expiry' },
  });
}

// Schedule meal reminder
export async function scheduleMealReminder(mealType: string, hour: number, minute: number) {
  const titles: Record<string, string> = {
    breakfast: 'Breakfast Time',
    lunch: 'Lunch Time',
    dinner: 'Dinner Time',
    snack: 'Snack Time',
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: titles[mealType] || 'Meal Time',
      body: `Time to prepare ${mealType}! Check your meal plan for today's recipe.`,
      data: { type: 'meal_reminder', mealType },
    },
    trigger: {
      hour,
      minute,
      repeats: true,
      channelId: 'meals',
    },
  });
}

// Schedule weight log reminder — daily at 8 AM
export async function scheduleWeightLogReminder() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Log Your Weight',
      body: "Hey! It's been a while since you logged your weight. Let's stay on track!",
      data: { type: 'weight_reminder' },
    },
    trigger: {
      hour: 8,
      minute: 0,
      repeats: true,
      channelId: 'meals',
    },
  });
}

// Cancel weight log reminder
export async function cancelWeightLogReminder() {
  // Cancel all and re-schedule only non-weight reminders
  // For simplicity, we just cancel all — callers should re-schedule other reminders if needed
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if ((notif.content.data as any)?.type === 'weight_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

// ─── Quiet Hours Helper ──────────────────────────────────────────────────

function parseHour(timeStr: string): number {
  // "10:00 PM" → 22, "7:00 AM" → 7, "12:00 AM" → 0
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1]);
  const ampm = match[3].toUpperCase();
  if (ampm === 'AM' && h === 12) h = 0;
  else if (ampm === 'PM' && h !== 12) h += 12;
  return h;
}

function isInQuietHours(
  hour: number,
  settings: { quietHoursEnabled?: boolean; quietFrom?: string; quietTo?: string },
): boolean {
  if (!settings.quietHoursEnabled) return false;
  const from = parseHour(settings.quietFrom || '10:00 PM');
  const to = parseHour(settings.quietTo || '7:00 AM');
  if (from <= to) {
    return hour >= from && hour < to;
  }
  // Wraps midnight: e.g. 22–7
  return hour >= from || hour < to;
}

function nextNonQuietHour(
  preferredHour: number,
  settings: { quietHoursEnabled?: boolean; quietFrom?: string; quietTo?: string },
): number {
  if (!isInQuietHours(preferredHour, settings)) return preferredHour;
  // Push to quietTo (end of quiet window)
  return parseHour(settings.quietTo || '7:00 AM');
}

export interface QuietHoursSettings {
  quietHoursEnabled?: boolean;
  quietFrom?: string;
  quietTo?: string;
}

// ─── Trigger 1: Food Logging Reminder ────────────────────────────────────

const FOOD_LOG_REMINDER_ID = 'food-log-reminder';

export async function scheduleFoodLogReminder(quietSettings: QuietHoursSettings = {}) {
  // Cancel existing
  await cancelNotificationByType('food_log_reminder');

  // Schedule 24 hours from now, respecting quiet hours
  const fireDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const safeHour = nextNonQuietHour(fireDate.getHours(), quietSettings);
  fireDate.setHours(safeHour, 0, 0, 0);

  // If adjusted time is in the past, push to tomorrow
  if (fireDate.getTime() <= Date.now()) {
    fireDate.setDate(fireDate.getDate() + 1);
  }

  await Notifications.scheduleNotificationAsync({
    identifier: FOOD_LOG_REMINDER_ID,
    content: {
      title: 'Log Your Meals',
      body: "Hey! You haven't logged your food in a while — want to update your nutrition log?",
      data: { type: 'food_log_reminder' },
    },
    trigger: { date: fireDate, channelId: 'meals' },
  });
}

// Call this after every meal log to reset the 24h timer
export async function resetFoodLogReminder(quietSettings: QuietHoursSettings = {}) {
  await scheduleFoodLogReminder(quietSettings);
}

// ─── Trigger 2: Expired Inventory Alert ──────────────────────────────────

const EXPIRED_INVENTORY_ID = 'expired-inventory-alert';

export async function scheduleExpiredInventoryAlert(
  expiredCount: number,
  quietSettings: QuietHoursSettings = {},
) {
  await cancelNotificationByType('expired_inventory');

  if (expiredCount < 3) return; // Only alert when 3+ items expired

  // Schedule for 2 seconds from now (immediate-ish), but respect quiet hours
  const now = new Date();
  const safeHour = nextNonQuietHour(now.getHours(), quietSettings);

  if (isInQuietHours(now.getHours(), quietSettings)) {
    // Defer to morning
    const deferred = new Date();
    deferred.setHours(safeHour, 0, 0, 0);
    if (deferred.getTime() <= Date.now()) deferred.setDate(deferred.getDate() + 1);

    await Notifications.scheduleNotificationAsync({
      identifier: EXPIRED_INVENTORY_ID,
      content: {
        title: 'Inventory Cleanup',
        body: "Your fridge has quite a few expired items — let's clean up your inventory.",
        data: { type: 'expired_inventory', expiredCount },
      },
      trigger: { date: deferred, channelId: 'expiry' },
    });
  } else {
    await Notifications.scheduleNotificationAsync({
      identifier: EXPIRED_INVENTORY_ID,
      content: {
        title: 'Inventory Cleanup',
        body: "Your fridge has quite a few expired items — let's clean up your inventory.",
        data: { type: 'expired_inventory', expiredCount },
      },
      trigger: { seconds: 2, channelId: 'expiry' },
    });
  }
}

// ─── Trigger 3: Weekly Meal Prep Reminder ────────────────────────────────

const MEAL_PREP_REMINDER_ID = 'weekly-meal-prep';

export async function scheduleWeeklyMealPrepReminder(
  hour: number = 17,
  minute: number = 0,
  quietSettings: QuietHoursSettings = {},
) {
  await cancelNotificationByType('meal_prep_reminder');

  const safeHour = nextNonQuietHour(hour, quietSettings);

  await Notifications.scheduleNotificationAsync({
    identifier: MEAL_PREP_REMINDER_ID,
    content: {
      title: 'Meal Prep Sunday',
      body: "Ready to meal prep? Let's plan it out.",
      data: { type: 'meal_prep_reminder' },
    },
    trigger: {
      weekday: 1, // Sunday (Expo uses 1=Sunday)
      hour: safeHour,
      minute,
      repeats: true,
      channelId: 'meals',
    },
  });
}

// ─── Trigger 4: Freezer Defrost Reminder ─────────────────────────────────

const FREEZER_DEFROST_ID = 'freezer-defrost-reminder';

export async function scheduleFreezerDefrostReminder(
  itemNames: string[],
  quietSettings: QuietHoursSettings = {},
) {
  await cancelNotificationByType('freezer_defrost');

  if (itemNames.length === 0) return;

  const preview = itemNames.length <= 2
    ? itemNames.join(' and ')
    : `${itemNames[0]} and ${itemNames.length - 1} other item${itemNames.length > 2 ? 's' : ''}`;

  const now = new Date();
  const safeHour = nextNonQuietHour(now.getHours(), quietSettings);

  const content = {
    title: 'Freezer Check',
    body: `${preview} been in the freezer a while — time to defrost and use?`,
    data: { type: 'freezer_defrost', itemCount: itemNames.length },
  };

  if (isInQuietHours(now.getHours(), quietSettings)) {
    const deferred = new Date();
    deferred.setHours(safeHour, 0, 0, 0);
    if (deferred.getTime() <= Date.now()) deferred.setDate(deferred.getDate() + 1);

    await Notifications.scheduleNotificationAsync({
      identifier: FREEZER_DEFROST_ID,
      content,
      trigger: { date: deferred, channelId: 'expiry' },
    });
  } else {
    await Notifications.scheduleNotificationAsync({
      identifier: FREEZER_DEFROST_ID,
      content,
      trigger: { seconds: 5, channelId: 'expiry' },
    });
  }
}

// ─── Cancel Helpers ──────────────────────────────────────────────────────

async function cancelNotificationByType(type: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if ((notif.content.data as any)?.type === type) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Listen for notification interactions
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
