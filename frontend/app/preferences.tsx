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

export default function PreferencesScreen() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [macroTracking, setMacroTracking] = useState(false);
  const [householdSize, setHouseholdSize] = useState(1);
  const [mealReminders, setMealReminders] = useState({ breakfast: false, lunch: false, dinner: false });

  useEffect(() => {
    try {
      const prefs = user?.preferences ? JSON.parse(user.preferences) : {};
      setMacroTracking(prefs.macroTracking ?? false);
      setHouseholdSize(prefs.householdSize ?? 1);
      setMealReminders(prefs.mealReminders ?? { breakfast: false, lunch: false, dinner: false });
    } catch {}
    setLoading(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = user?.preferences ? JSON.parse(user.preferences) : {};
      const updated = {
        ...existing,
        macroTracking,
        householdSize,
        mealReminders,
      };
      const res = await authApi.updateProfile({ preferences: updated });
      setUser(res.user);
      Alert.alert('Saved', 'Preferences updated.');
      router.back();
    } catch (err) {
      console.error('Failed to save preferences:', err);
      Alert.alert('Error', 'Failed to save preferences.');
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

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-800">Preferences</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Macro Tracking */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-semibold text-gray-800">Macro Tracking</Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                Track daily calories and macros. Your AI assistant will suggest meals to help meet your goals.
              </Text>
            </View>
            <Switch
              value={macroTracking}
              onValueChange={setMacroTracking}
              trackColor={{ false: '#d1d5db', true: '#6ee7b7' }}
              thumbColor={macroTracking ? '#10b981' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Household Size */}
        <View className="mx-4 mt-3 bg-white rounded-xl p-4">
          <Text className="text-sm font-semibold text-gray-800 mb-1">Household Size</Text>
          <Text className="text-xs text-gray-400 mb-3">How many people do you typically cook for?</Text>
          <View className="flex-row gap-2">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <TouchableOpacity
                key={n}
                className={`flex-1 py-2.5 rounded-lg border items-center ${
                  householdSize === n ? 'bg-primary-50 border-primary-400' : 'bg-white border-gray-200'
                }`}
                onPress={() => setHouseholdSize(n)}
              >
                <Text className={`text-sm font-medium ${householdSize === n ? 'text-primary-700' : 'text-gray-600'}`}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Meal Reminders */}
        <View className="mx-4 mt-3 bg-white rounded-xl p-4">
          <Text className="text-sm font-semibold text-gray-800 mb-1">Meal Reminders</Text>
          <Text className="text-xs text-gray-400 mb-3">Get reminded to log your meals</Text>

          {(['breakfast', 'lunch', 'dinner'] as const).map(meal => (
            <View key={meal} className="flex-row items-center justify-between py-2 border-t border-gray-100">
              <Text className="text-sm text-gray-700 capitalize">{meal}</Text>
              <Switch
                value={mealReminders[meal]}
                onValueChange={(val) => setMealReminders(prev => ({ ...prev, [meal]: val }))}
                trackColor={{ false: '#d1d5db', true: '#6ee7b7' }}
                thumbColor={mealReminders[meal] ? '#10b981' : '#f4f3f4'}
              />
            </View>
          ))}
        </View>

        {/* Dietary Preferences Link */}
        <TouchableOpacity
          className="mx-4 mt-3 bg-white rounded-xl p-4 flex-row items-center"
          onPress={() => router.push('/health-goals')}
        >
          <Ionicons name="nutrition-outline" size={20} color="#10b981" />
          <Text className="text-sm text-gray-800 ml-3 flex-1">Dietary Preferences</Text>
          <Text className="text-xs text-gray-400 mr-1">Set in My Nutrition</Text>
          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        </TouchableOpacity>
      </ScrollView>

      {/* Save Button */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <TouchableOpacity
          className="bg-primary-500 py-3.5 rounded-xl items-center"
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-white font-semibold">
            {saving ? 'Saving...' : 'Save Preferences'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
