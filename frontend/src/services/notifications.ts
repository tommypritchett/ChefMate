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
