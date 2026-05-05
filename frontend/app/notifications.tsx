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

const QUIET_HOUR_OPTIONS = [
  '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM',
  '12:00 AM', '5:00 AM', '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM',
];

export default function NotificationsScreen() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Alert toggles — default all ON
  const [expiryAlerts, setExpiryAlerts] = useState(true);
  const [mealReminders, setMealReminders] = useState(true);
  const [recipeSuggestions, setRecipeSuggestions] = useState(true);
  const [dealAlerts, setDealAlerts] = useState(true);

  // Weekly Summary
  const [weeklySummary, setWeeklySummary] = useState(true);

  // Meal Prep Reminder
  const [mealPrepHour, setMealPrepHour] = useState(17); // 5 PM default

  // Quiet Hours
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietFrom, setQuietFrom] = useState('10:00 PM');
  const [quietTo, setQuietTo] = useState('7:00 AM');

  // Time picker
  const [timePicker, setTimePicker] = useState<'from' | 'to' | null>(null);

  useEffect(() => {
    try {
      const settings = user?.notificationSettings ? JSON.parse(user.notificationSettings) : {};
      setExpiryAlerts(settings.expiryAlerts ?? true);
      setMealReminders(settings.mealReminders ?? true);
      setRecipeSuggestions(settings.recipeSuggestions ?? true);
      setDealAlerts(settings.dealAlerts ?? true);
      setWeeklySummary(settings.weeklySummary ?? true);
      setQuietHoursEnabled(settings.quietHoursEnabled ?? true);
      setQuietFrom(settings.quietFrom ?? '10:00 PM');
      setQuietTo(settings.quietTo ?? '7:00 AM');
      setMealPrepHour(settings.mealPrepHour ?? 17);
    } catch {}
    setLoading(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = {
        expiryAlerts,
        mealReminders,
        recipeSuggestions,
        dealAlerts,
        weeklySummary,
        mealPrepHour,
        mealPrepMinute: 0,
        quietHoursEnabled,
        quietFrom,
        quietTo,
      };
      const res = await authApi.updateProfile({ notificationSettings: settings });
      setUser(res.user);
      Alert.alert('Saved', 'Notification settings updated.');
      router.push('/(tabs)/profile');
    } catch (err) {
      console.error('Failed to save notification settings:', err);
      Alert.alert('Error', 'Failed to save settings.');
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

  const alertToggles = [
    { key: 'expiryAlerts', label: 'Expiring Items', desc: 'Get alerted when pantry items are about to expire', value: expiryAlerts, onChange: setExpiryAlerts },
    { key: 'mealReminders', label: 'Meal Reminders', desc: 'Reminders to log breakfast, lunch & dinner', value: mealReminders, onChange: setMealReminders },
    { key: 'recipeSuggestions', label: 'Recipe Suggestions', desc: 'Daily recipe ideas based on your pantry & goals', value: recipeSuggestions, onChange: setRecipeSuggestions },
    { key: 'dealAlerts', label: 'Sale & Deal Alerts', desc: 'Notify me when grocery deals match my shopping list', value: dealAlerts, onChange: setDealAlerts },
  ];

  return (
    <View className="flex-1 bg-cream">
      {/* Header — warm dark */}
      <ScreenHeader title="Notifications" onBack={() => router.push('/(tabs)/profile')} />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ─── Alert Preferences ─────────────────────────────────── */}
        <Text className="text-[11px] font-sans-semibold text-brown uppercase mx-4 mt-5 mb-2" style={{ letterSpacing: 1 }}>
          Alert Preferences
        </Text>
        <View className="mx-4 bg-white rounded-2xl overflow-hidden" style={CARD_SHADOW}>
          {alertToggles.map((toggle, idx) => (
            <View
              key={toggle.key}
              className={`flex-row items-center px-4 py-3.5 ${idx < alertToggles.length - 1 ? 'border-b border-cream-deeper' : ''}`}
            >
              <View className="flex-1 mr-3">
                <Text className="text-base font-sans-medium text-warm-dark">{toggle.label}</Text>
                <Text className="text-xs font-sans text-brown mt-0.5">{toggle.desc}</Text>
              </View>
              <Switch
                value={toggle.value}
                onValueChange={toggle.onChange}
                trackColor={{ false: '#D9CFC7', true: '#D4652E' }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        {/* ─── Weekly Summary ────────────────────────────────────── */}
        <Text className="text-[11px] font-sans-semibold text-brown uppercase mx-4 mt-5 mb-2" style={{ letterSpacing: 1 }}>
          Weekly
        </Text>
        <View className="mx-4 bg-white rounded-2xl overflow-hidden" style={CARD_SHADOW}>
          <View className="flex-row items-center px-4 py-3.5">
            <View className="flex-1 mr-3">
              <Text className="text-base font-sans-medium text-warm-dark">Weekly Summary</Text>
              <Text className="text-xs font-sans text-brown mt-0.5">Sunday wrap-up: nutrition, meals logged & goals</Text>
            </View>
            <Switch
              value={weeklySummary}
              onValueChange={setWeeklySummary}
              trackColor={{ false: '#D9CFC7', true: '#D4652E' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ─── Meal Prep Reminder ─────────────────────────────────── */}
        {mealReminders && (
          <View className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden" style={CARD_SHADOW}>
            <View className="px-4 py-3.5">
              <Text className="text-base font-sans-medium text-warm-dark">Meal Prep Reminder</Text>
              <Text className="text-xs font-sans text-brown mt-0.5">Every Sunday — nudges you to plan your week</Text>
              <View className="flex-row flex-wrap gap-2 mt-2.5">
                {[
                  { label: '12 PM', hour: 12 },
                  { label: '1 PM', hour: 13 },
                  { label: '2 PM', hour: 14 },
                  { label: '3 PM', hour: 15 },
                  { label: '4 PM', hour: 16 },
                  { label: '5 PM', hour: 17 },
                  { label: '6 PM', hour: 18 },
                  { label: '7 PM', hour: 19 },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.hour}
                    onPress={() => setMealPrepHour(opt.hour)}
                    className={`px-3 py-1.5 rounded-lg ${mealPrepHour === opt.hour ? 'bg-primary-500' : 'bg-cream-deeper'}`}
                  >
                    <Text className={`text-xs font-sans-semibold ${mealPrepHour === opt.hour ? 'text-white' : 'text-brown'}`}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ─── Quiet Hours ───────────────────────────────────────── */}
        <Text className="text-[11px] font-sans-semibold text-brown uppercase mx-4 mt-5 mb-2" style={{ letterSpacing: 1 }}>
          Quiet Hours
        </Text>
        <View className="mx-4 bg-white rounded-2xl p-4" style={CARD_SHADOW}>
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-1 mr-3">
              <Text className="text-base font-sans-medium text-warm-dark">Do Not Disturb</Text>
              <Text className="text-xs font-sans text-brown mt-0.5">Silence all notifications during these hours</Text>
            </View>
            <Switch
              value={quietHoursEnabled}
              onValueChange={setQuietHoursEnabled}
              trackColor={{ false: '#D9CFC7', true: '#D4652E' }}
              thumbColor="#fff"
            />
          </View>

          {quietHoursEnabled && (
            <View className="flex-row items-center mt-3" style={{ gap: 10 }}>
              <TouchableOpacity
                className="flex-1 items-center py-2.5 rounded-xl"
                style={{ backgroundColor: '#FFF0E8', borderWidth: 1.5, borderColor: '#D4652E' }}
                onPress={() => setTimePicker('from')}
              >
                <Text className="text-[11px] font-sans-medium text-brown mb-0.5">FROM</Text>
                <Text className="text-lg font-sans-bold text-warm-dark">{quietFrom}</Text>
              </TouchableOpacity>

              <Ionicons name="arrow-forward" size={18} color="#8B7355" />

              <TouchableOpacity
                className="flex-1 items-center py-2.5 rounded-xl"
                style={{ backgroundColor: '#FFF0E8', borderWidth: 1.5, borderColor: '#D4652E' }}
                onPress={() => setTimePicker('to')}
              >
                <Text className="text-[11px] font-sans-medium text-brown mb-0.5">TO</Text>
                <Text className="text-lg font-sans-bold text-warm-dark">{quietTo}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View className="p-4 bg-cream">
        <TouchableOpacity
          className="bg-warm-dark py-4 rounded-2xl items-center"
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-cream font-sans-semibold text-base">
            {saving ? 'Saving...' : 'Save Notification Settings'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── Time Picker Modal ──────────────────────────────────── */}
      <Modal visible={!!timePicker} transparent animationType="fade" onRequestClose={() => setTimePicker(null)}>
        <TouchableOpacity
          className="flex-1 bg-black/40 items-center justify-end"
          activeOpacity={1}
          onPress={() => setTimePicker(null)}
        >
          <View
            className="bg-white rounded-t-2xl w-full"
            style={{ maxHeight: 400 }}
            onStartShouldSetResponder={() => true}
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-cream-deeper">
              <Text className="text-base font-sans-semibold text-warm-dark">
                {timePicker === 'from' ? 'Quiet Hours Start' : 'Quiet Hours End'}
              </Text>
              <TouchableOpacity onPress={() => setTimePicker(null)}>
                <Ionicons name="close" size={22} color="#8B7355" />
              </TouchableOpacity>
            </View>
            <ScrollView className="px-4 py-2" contentContainerStyle={{ paddingBottom: 40 }}>
              {QUIET_HOUR_OPTIONS.map(time => {
                const currentVal = timePicker === 'from' ? quietFrom : quietTo;
                const isSelected = currentVal === time;
                return (
                  <TouchableOpacity
                    key={time}
                    className="py-3 flex-row items-center justify-between border-b border-cream-deeper"
                    onPress={() => {
                      if (timePicker === 'from') setQuietFrom(time);
                      else setQuietTo(time);
                      setTimePicker(null);
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
