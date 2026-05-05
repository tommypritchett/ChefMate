import { View, Text, TouchableOpacity, Pressable, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from './mealPlanHelpers';

// ─── Create Plan Modal ──────────────────────────────────────────────────────

interface CreatePlanModalProps {
  visible: boolean;
  onClose: () => void;
  createName: string;
  setCreateName: (text: string) => void;
  createType: 'full' | 'weekdays' | 'custom';
  setCreateType: (type: 'full' | 'weekdays' | 'custom') => void;
  customStart: string;
  setCustomStart: (text: string) => void;
  customEnd: string;
  setCustomEnd: (text: string) => void;
  weekDates: Date[];
  creating: boolean;
  onCreatePlan: () => void;
}

export function CreatePlanModal({
  visible, onClose,
  createName, setCreateName,
  createType, setCreateType,
  customStart, setCustomStart, customEnd, setCustomEnd,
  weekDates, creating, onCreatePlan,
}: CreatePlanModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-center items-center" onPress={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <View className="bg-white rounded-2xl mx-6 p-5 w-80">
          <Text className="text-lg font-serif-bold text-warm-dark mb-3 text-center">New Meal Plan</Text>

          {/* Plan name */}
          <Text className="text-xs text-brown mb-1 font-sans-medium">Plan Name</Text>
          <TextInput
            className="bg-cream border border-cream-deeper rounded-lg px-3 py-2.5 text-sm text-warm-dark mb-3 font-sans"
            placeholder="Week of Mar 3"
            placeholderTextColor="#B8A68E"
            value={createName}
            onChangeText={setCreateName}
          />

          {/* Duration type */}
          <Text className="text-xs text-brown mb-1.5 font-sans-medium">Duration</Text>
          {(['full', 'weekdays', 'custom'] as const).map((type) => {
            const labels = { full: 'Full Week (Mon–Sun)', weekdays: 'Weekdays Only (Mon–Fri)', custom: 'Custom Range' };
            return (
              <TouchableOpacity
                key={type}
                onPress={() => {
                  setCreateType(type);
                  const monday = weekDates[0];
                  const friday = weekDates[4];
                  const sunday = weekDates[6];
                  if (type === 'full') { setCustomStart(formatDate(monday)); setCustomEnd(formatDate(sunday)); }
                  else if (type === 'weekdays') { setCustomStart(formatDate(monday)); setCustomEnd(formatDate(friday)); }
                }}
                className={`flex-row items-center py-2.5 px-3 rounded-lg mb-1.5 border ${
                  createType === type ? 'bg-primary-50 border-primary-400' : 'bg-white border-cream-deeper'
                }`}
              >
                <Ionicons
                  name={createType === type ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={createType === type ? '#D4652E' : '#B8A68E'}
                />
                <Text className={`text-sm ml-2 font-sans ${createType === type ? 'text-primary-700 font-sans-medium' : 'text-warm-soft'}`}>
                  {labels[type]}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Custom date inputs */}
          {createType === 'custom' && (
            <View className="flex-row gap-2 mt-2">
              <View className="flex-1">
                <Text className="text-xs text-brown mb-1 font-sans">Start (YYYY-MM-DD)</Text>
                <TextInput
                  className="bg-cream border border-cream-deeper rounded-lg px-3 py-2 text-sm text-warm-dark font-sans"
                  placeholder="2025-03-03"
                  placeholderTextColor="#B8A68E"
                  value={customStart}
                  onChangeText={setCustomStart}
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-brown mb-1 font-sans">End (YYYY-MM-DD)</Text>
                <TextInput
                  className="bg-cream border border-cream-deeper rounded-lg px-3 py-2 text-sm text-warm-dark font-sans"
                  placeholder="2025-03-09"
                  placeholderTextColor="#B8A68E"
                  value={customEnd}
                  onChangeText={setCustomEnd}
                />
              </View>
            </View>
          )}

          {/* Create button */}
          <TouchableOpacity
            className="mt-4 py-3 rounded-lg bg-primary-500 items-center"
            onPress={onCreatePlan}
            disabled={creating}
          >
            <Text className="text-white font-sans-semibold">
              {creating ? 'Creating...' : 'Create Plan'}
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Plan Settings Modal ────────────────────────────────────────────────────

interface PlanSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settingsName: string;
  setSettingsName: (text: string) => void;
  settingsStart: string;
  setSettingsStart: (text: string) => void;
  settingsEnd: string;
  setSettingsEnd: (text: string) => void;
  isPlanWeekdaysOnly: boolean;
  savingSettings: boolean;
  onSaveSettings: () => void;
  onDeletePlan: () => void;
}

export function PlanSettingsModal({
  visible, onClose,
  settingsName, setSettingsName,
  settingsStart, setSettingsStart,
  settingsEnd, setSettingsEnd,
  isPlanWeekdaysOnly, savingSettings,
  onSaveSettings, onDeletePlan,
}: PlanSettingsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-center items-center" onPress={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <View className="bg-white rounded-2xl mx-6 p-5 w-80">
          <Text className="text-lg font-serif-bold text-warm-dark mb-3 text-center">Plan Settings</Text>

          {/* Plan name */}
          <Text className="text-xs text-brown mb-1 font-sans-medium">Plan Name</Text>
          <TextInput
            className="bg-cream border border-cream-deeper rounded-lg px-3 py-2.5 text-sm text-warm-dark mb-3 font-sans"
            value={settingsName}
            onChangeText={setSettingsName}
          />

          {/* Dates */}
          <View className="flex-row gap-2 mb-3">
            <View className="flex-1">
              <Text className="text-xs text-brown mb-1 font-sans-medium">Start Date</Text>
              <TextInput
                className="bg-cream border border-cream-deeper rounded-lg px-3 py-2 text-sm text-warm-dark font-sans"
                value={settingsStart}
                onChangeText={setSettingsStart}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#B8A68E"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-brown mb-1 font-sans-medium">End Date</Text>
              <TextInput
                className="bg-cream border border-cream-deeper rounded-lg px-3 py-2 text-sm text-warm-dark font-sans"
                value={settingsEnd}
                onChangeText={setSettingsEnd}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#B8A68E"
              />
            </View>
          </View>

          {/* Quick toggles — show context-aware buttons */}
          {isPlanWeekdaysOnly && (
            <View className="flex-row gap-2 mb-3">
              <TouchableOpacity
                className="flex-1 py-2 rounded-lg border border-primary-300 bg-primary-50 items-center"
                onPress={() => {
                  const fri = new Date(settingsEnd + 'T00:00:00');
                  const sat = new Date(fri);
                  sat.setDate(fri.getDate() + 1);
                  setSettingsEnd(formatDate(sat));
                }}
              >
                <Text className="text-xs font-sans-medium text-primary-700">+ Include Sat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-2 rounded-lg border border-primary-300 bg-primary-50 items-center"
                onPress={() => {
                  const fri = new Date(settingsEnd + 'T00:00:00');
                  const sun = new Date(fri);
                  sun.setDate(fri.getDate() + 2);
                  setSettingsEnd(formatDate(sun));
                }}
              >
                <Text className="text-xs font-sans-medium text-primary-700">+ Include Sat & Sun</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Save */}
          <TouchableOpacity
            className="py-3 rounded-lg bg-primary-500 items-center mb-2"
            onPress={onSaveSettings}
            disabled={savingSettings}
          >
            <Text className="text-white font-sans-semibold">
              {savingSettings ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>

          {/* Delete Plan */}
          <TouchableOpacity
            className="py-2.5 rounded-lg items-center"
            onPress={onDeletePlan}
          >
            <Text className="text-sm font-sans-medium text-red-500">Delete Plan</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}
