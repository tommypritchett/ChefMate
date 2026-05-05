import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { authApi } from '../src/services/api';
import { CARD_SHADOW } from '../src/constants/styles';
import { ScreenHeader } from '../src/components/ui/ScreenHeader';

const DEFAULT_TIMES: Record<string, string> = {
  breakfast: '8:00 AM',
  lunch: '12:30 PM',
  dinner: '7:00 PM',
};

const TIME_OPTIONS = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM', '9:30 PM',
];

export default function PreferencesScreen() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [householdSize, setHouseholdSize] = useState(1);
  const [mealReminders, setMealReminders] = useState<Record<string, boolean>>({
    breakfast: false, lunch: false, dinner: false,
  });
  const [reminderTimes, setReminderTimes] = useState<Record<string, string>>({
    breakfast: DEFAULT_TIMES.breakfast,
    lunch: DEFAULT_TIMES.lunch,
    dinner: DEFAULT_TIMES.dinner,
  });

  // Time picker modal
  const [timePickerMeal, setTimePickerMeal] = useState<string | null>(null);

  useEffect(() => {
    try {
      const prefs = user?.preferences ? JSON.parse(user.preferences) : {};
      setHouseholdSize(prefs.householdSize ?? 1);
      setMealReminders(prefs.mealReminders ?? { breakfast: false, lunch: false, dinner: false });
      setReminderTimes(prefs.reminderTimes ?? {
        breakfast: DEFAULT_TIMES.breakfast,
        lunch: DEFAULT_TIMES.lunch,
        dinner: DEFAULT_TIMES.dinner,
      });
    } catch {}
    setLoading(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = user?.preferences ? JSON.parse(user.preferences) : {};
      const updated = {
        ...existing,
        householdSize,
        mealReminders,
        reminderTimes,
      };
      const res = await authApi.updateProfile({ preferences: updated });
      setUser(res.user);
      Alert.alert('Saved', 'Preferences updated.');
      router.push('/(tabs)/profile');
    } catch (err) {
      console.error('Failed to save preferences:', err);
      Alert.alert('Error', 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator size="large" color="#D4652E" />
      </View>
    );
  }

  const MEAL_DESCS: Record<string, string> = {
    breakfast: 'Morning meal reminder',
    lunch: 'Midday meal reminder',
    dinner: 'Evening meal reminder',
  };

  return (
    <View className="flex-1 bg-cream">
      <ScreenHeader title="Preferences" onBack={() => router.push('/(tabs)/profile')} />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ─── Household Section ─────────────────────────────────── */}
        <Text className="text-[11px] font-sans-semibold text-brown uppercase mx-4 mt-5 mb-2" style={{ letterSpacing: 1 }}>
          Household
        </Text>
        <View className="mx-4 bg-white rounded-2xl p-4" style={CARD_SHADOW}>
          <Text className="text-base font-sans-medium text-warm-dark mb-1">Household Size</Text>
          <Text className="text-xs font-sans text-brown mb-3">Used for recipe scaling & shopping quantities</Text>
          <View className="flex-row" style={{ gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <TouchableOpacity
                key={n}
                className="items-center justify-center rounded-xl"
                style={[
                  { width: 42, height: 42 },
                  CARD_SHADOW,
                  householdSize === n
                    ? { backgroundColor: '#FFF0E8', borderWidth: 1.5, borderColor: '#D4652E' }
                    : { backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'transparent' },
                ]}
                onPress={() => setHouseholdSize(n)}
              >
                <Text
                  className="text-base font-sans-semibold"
                  style={{ color: householdSize === n ? '#D4652E' : '#8B7355' }}
                >
                  {n === 6 ? '6+' : n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── Meal Reminders Section ────────────────────────────── */}
        <Text className="text-[11px] font-sans-semibold text-brown uppercase mx-4 mt-5 mb-2" style={{ letterSpacing: 1 }}>
          Meal Reminders
        </Text>
        <View className="mx-4 bg-white rounded-2xl overflow-hidden" style={CARD_SHADOW}>
          {(['breakfast', 'lunch', 'dinner'] as const).map((meal, idx) => (
            <View
              key={meal}
              className={`flex-row items-center px-4 py-3.5 ${idx < 2 ? 'border-b border-cream-deeper' : ''}`}
            >
              <View className="flex-1">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <Text className="text-base font-sans-medium text-warm-dark capitalize">{meal}</Text>
                  <TouchableOpacity
                    onPress={() => mealReminders[meal] && setTimePickerMeal(meal)}
                    className="px-2 py-0.5 rounded-lg"
                    style={{ backgroundColor: '#FFF0E8' }}
                    disabled={!mealReminders[meal]}
                  >
                    <Text
                      className="text-xs font-sans-semibold"
                      style={{ color: mealReminders[meal] ? '#D4652E' : '#B8A68E' }}
                    >
                      {reminderTimes[meal]}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-xs font-sans text-brown mt-0.5">{MEAL_DESCS[meal]}</Text>
              </View>
              <Switch
                value={mealReminders[meal]}
                onValueChange={(val) => setMealReminders(prev => ({ ...prev, [meal]: val }))}
                trackColor={{ false: '#D9CFC7', true: '#D4652E' }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        {/* ─── Dietary Section ───────────────────────────────────── */}
        <Text className="text-[11px] font-sans-semibold text-brown uppercase mx-4 mt-5 mb-2" style={{ letterSpacing: 1 }}>
          Dietary
        </Text>
        <TouchableOpacity
          className="mx-4 bg-white rounded-2xl flex-row items-center px-4 py-3.5"
          style={CARD_SHADOW}
          onPress={() => router.push('/health-goals')}
        >
          <View
            className="items-center justify-center rounded-xl mr-3"
            style={{ width: 36, height: 36, backgroundColor: '#FFF0E8' }}
          >
            <Ionicons name="nutrition-outline" size={18} color="#D4652E" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-sans-medium text-warm-dark">Dietary Preferences & Allergies</Text>
            <Text className="text-xs font-sans text-brown mt-0.5">Vegetarian, gluten-free, nut-free...</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#B8A68E" />
        </TouchableOpacity>
      </ScrollView>

      {/* Save Button */}
      <View className="p-4 bg-cream">
        <TouchableOpacity
          className="bg-warm-dark py-4 rounded-2xl items-center"
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-cream font-sans-semibold text-base">
            {saving ? 'Saving...' : 'Save Preferences'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── Time Picker Modal ──────────────────────────────────── */}
      <Modal visible={!!timePickerMeal} transparent animationType="fade" onRequestClose={() => setTimePickerMeal(null)}>
        <TouchableOpacity
          className="flex-1 bg-black/40 items-center justify-end"
          activeOpacity={1}
          onPress={() => setTimePickerMeal(null)}
        >
          <View
            className="bg-white rounded-t-2xl w-full"
            style={{ maxHeight: 400 }}
            onStartShouldSetResponder={() => true}
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-cream-deeper">
              <Text className="text-base font-sans-semibold text-warm-dark capitalize">
                {timePickerMeal} Reminder Time
              </Text>
              <TouchableOpacity onPress={() => setTimePickerMeal(null)}>
                <Ionicons name="close" size={22} color="#8B7355" />
              </TouchableOpacity>
            </View>
            <ScrollView className="px-4 py-2" contentContainerStyle={{ paddingBottom: 40 }}>
              {TIME_OPTIONS.map(time => {
                const isSelected = timePickerMeal ? reminderTimes[timePickerMeal] === time : false;
                return (
                  <TouchableOpacity
                    key={time}
                    className="py-3 flex-row items-center justify-between border-b border-cream-deeper"
                    onPress={() => {
                      if (timePickerMeal) {
                        setReminderTimes(prev => ({ ...prev, [timePickerMeal]: time }));
                        setTimePickerMeal(null);
                      }
                    }}
                  >
                    <Text
                      className="text-sm font-sans"
                      style={{ color: isSelected ? '#D4652E' : '#2D2520', fontWeight: isSelected ? '600' : '400' }}
                    >
                      {time}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#D4652E" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
