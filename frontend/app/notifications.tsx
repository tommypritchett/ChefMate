import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { authApi } from '../src/services/api';

export default function NotificationsScreen() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [mealReminders, setMealReminders] = useState(false);
  const [expiryAlerts, setExpiryAlerts] = useState(false);
  const [dealAlerts, setDealAlerts] = useState(false);
  const [weightReminder, setWeightReminder] = useState(false);

  useEffect(() => {
    try {
      const settings = user?.notificationSettings ? JSON.parse(user.notificationSettings) : {};
      setMealReminders(settings.mealReminders ?? false);
      setExpiryAlerts(settings.expiryAlerts ?? false);
      setDealAlerts(settings.dealAlerts ?? false);
      setWeightReminder(settings.weightReminder ?? false);
    } catch {}
    setLoading(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = { mealReminders, expiryAlerts, dealAlerts, weightReminder };
      const res = await authApi.updateProfile({ notificationSettings: settings });
      setUser(res.user);
      Alert.alert('Saved', 'Notification settings updated.');
      router.back();
    } catch (err) {
      console.error('Failed to save notification settings:', err);
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const toggles = [
    {
      key: 'mealReminders',
      label: 'Meal Reminders',
      description: 'Get reminded to log breakfast, lunch, and dinner',
      icon: 'time-outline' as const,
      color: '#f59e0b',
      value: mealReminders,
      onChange: setMealReminders,
    },
    {
      key: 'expiryAlerts',
      label: 'Inventory Expiry Alerts',
      description: 'Notified when food items are about to expire',
      icon: 'alert-circle-outline' as const,
      color: '#ef4444',
      value: expiryAlerts,
      onChange: setExpiryAlerts,
    },
    {
      key: 'dealAlerts',
      label: 'Sale & Deal Alerts',
      description: 'Get notified about grocery deals at your preferred stores',
      icon: 'pricetag-outline' as const,
      color: '#10b981',
      value: dealAlerts,
      onChange: setDealAlerts,
    },
    {
      key: 'weightReminder',
      label: 'Weight Log Reminder',
      description: 'Daily reminder at 8 AM to log your weight',
      icon: 'scale-outline' as const,
      color: '#8b5cf6',
      value: weightReminder,
      onChange: setWeightReminder,
    },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-800">Notifications</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="mx-4 mt-4 bg-white rounded-xl">
          {toggles.map((toggle, idx) => (
            <View
              key={toggle.key}
              className={`flex-row items-center p-4 ${idx < toggles.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <View className="w-9 h-9 rounded-full items-center justify-center mr-3" style={{ backgroundColor: `${toggle.color}15` }}>
                <Ionicons name={toggle.icon} size={20} color={toggle.color} />
              </View>
              <View className="flex-1 mr-3">
                <Text className="text-sm font-medium text-gray-800">{toggle.label}</Text>
                <Text className="text-xs text-gray-400 mt-0.5">{toggle.description}</Text>
              </View>
              <Switch
                value={toggle.value}
                onValueChange={toggle.onChange}
                trackColor={{ false: '#d1d5db', true: '#6ee7b7' }}
                thumbColor={toggle.value ? '#10b981' : '#f4f3f4'}
              />
            </View>
          ))}
        </View>

        <Text className="text-xs text-gray-400 mx-4 mt-3 text-center">
          Push notification delivery coming soon. These settings save your preferences.
        </Text>
      </ScrollView>

      {/* Save Button */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <TouchableOpacity
          className="bg-primary-500 py-3.5 rounded-xl items-center"
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-white font-semibold">
            {saving ? 'Saving...' : 'Save Settings'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
