import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { healthGoalsApi, nutritionApi } from '../src/services/api';

const GOAL_TYPES = [
  { key: 'calories', label: 'Calories', unit: 'kcal', icon: 'flame-outline', color: '#f59e0b' },
  { key: 'protein', label: 'Protein', unit: 'g', icon: 'barbell-outline', color: '#3b82f6' },
  { key: 'carbs', label: 'Carbs', unit: 'g', icon: 'leaf-outline', color: '#f97316' },
  { key: 'fat', label: 'Fat', unit: 'g', icon: 'water-outline', color: '#ef4444' },
  { key: 'weight', label: 'Weight', unit: 'lbs', icon: 'scale-outline', color: '#8b5cf6' },
] as const;

export default function HealthGoalsScreen() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGoalType, setSelectedGoalType] = useState('calories');
  const [targetValue, setTargetValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [todayTotals, setTodayTotals] = useState<any>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [weeklyAvg, setWeeklyAvg] = useState<any>({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [goalsData, progressData] = await Promise.all([
        healthGoalsApi.getGoals(),
        healthGoalsApi.getProgress(),
      ]);
      setGoals(goalsData.goals.filter((g: any) => g.isActive));
      setWeeklyAvg(progressData.weeklyAvg);

      // Get today's totals
      const today = new Date().toISOString().split('T')[0];
      try {
        const dailyData = await nutritionApi.getDailyNutrition(today);
        setTodayTotals(dailyData.totals);
      } catch {}
    } catch (err) {
      console.error('Failed to load health goals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveGoal = async () => {
    if (!targetValue.trim()) return;
    setSaving(true);
    try {
      const goalDef = GOAL_TYPES.find(g => g.key === selectedGoalType);
      await healthGoalsApi.createGoal({
        goalType: selectedGoalType,
        targetValue: parseFloat(targetValue),
        unit: goalDef?.unit,
      });
      setShowAddModal(false);
      setTargetValue('');
      fetchData();
    } catch (err) {
      console.error('Failed to save goal:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = (id: string, label: string) => {
    Alert.alert('Remove Goal', `Remove your ${label} goal?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await healthGoalsApi.deleteGoal(id);
          fetchData();
        },
      },
    ]);
  };

  const getProgress = (goalType: string, target: number) => {
    const current =
      goalType === 'calories' ? todayTotals.calories :
      goalType === 'protein' ? todayTotals.protein :
      goalType === 'carbs' ? todayTotals.carbs :
      goalType === 'fat' ? todayTotals.fat : 0;
    return { current, percent: target > 0 ? Math.min((current / target) * 100, 100) : 0 };
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
        <Text className="text-lg font-semibold text-gray-800">Health Goals</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={26} color="#10b981" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Today's Summary */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4">
          <Text className="text-base font-semibold text-gray-800 mb-3">Today's Nutrition</Text>
          <View className="flex-row justify-between">
            {[
              { label: 'Calories', value: todayTotals.calories, unit: 'kcal', color: '#f59e0b' },
              { label: 'Protein', value: Math.round(todayTotals.protein), unit: 'g', color: '#3b82f6' },
              { label: 'Carbs', value: Math.round(todayTotals.carbs), unit: 'g', color: '#f97316' },
              { label: 'Fat', value: Math.round(todayTotals.fat), unit: 'g', color: '#ef4444' },
            ].map(item => (
              <View key={item.label} className="items-center flex-1">
                <Text className="text-lg font-bold" style={{ color: item.color }}>{item.value}</Text>
                <Text className="text-xs text-gray-400">{item.unit}</Text>
                <Text className="text-xs text-gray-500 mt-0.5">{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Weekly Average */}
        <View className="mx-4 mt-3 bg-white rounded-xl p-4">
          <Text className="text-base font-semibold text-gray-800 mb-3">Weekly Average</Text>
          <View className="flex-row justify-between">
            {[
              { label: 'Calories', value: weeklyAvg.calories, color: '#f59e0b' },
              { label: 'Protein', value: `${weeklyAvg.protein}g`, color: '#3b82f6' },
              { label: 'Carbs', value: `${weeklyAvg.carbs}g`, color: '#f97316' },
              { label: 'Fat', value: `${weeklyAvg.fat}g`, color: '#ef4444' },
            ].map(item => (
              <View key={item.label} className="items-center flex-1">
                <Text className="text-sm font-semibold" style={{ color: item.color }}>{item.value}</Text>
                <Text className="text-xs text-gray-400">{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Active Goals */}
        <Text className="text-base font-semibold text-gray-800 mx-4 mt-5 mb-2">Your Goals</Text>
        {goals.length === 0 ? (
          <View className="mx-4 bg-white rounded-xl p-6 items-center">
            <Ionicons name="trophy-outline" size={40} color="#d1d5db" />
            <Text className="text-gray-400 mt-2 text-center">
              No goals set yet. Add a goal to start tracking!
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              className="mt-3 bg-primary-500 px-5 py-2.5 rounded-lg"
            >
              <Text className="text-white font-medium">Add Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          goals.map((goal: any) => {
            const def = GOAL_TYPES.find(g => g.key === goal.goalType);
            const { current, percent } = getProgress(goal.goalType, goal.targetValue);

            return (
              <View key={goal.id} className="mx-4 mb-3 bg-white rounded-xl p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Ionicons name={def?.icon as any || 'flag'} size={20} color={def?.color || '#10b981'} />
                    <Text className="text-sm font-semibold text-gray-800 ml-2">{def?.label || goal.goalType}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteGoal(goal.id, def?.label || goal.goalType)}>
                    <Ionicons name="close-circle-outline" size={20} color="#d1d5db" />
                  </TouchableOpacity>
                </View>

                {goal.goalType !== 'weight' && (
                  <>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-xs text-gray-400">
                        {current} / {goal.targetValue} {goal.unit}
                      </Text>
                      <Text className="text-xs font-medium" style={{ color: def?.color || '#10b981' }}>
                        {Math.round(percent)}%
                      </Text>
                    </View>
                    <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: def?.color || '#10b981',
                        }}
                      />
                    </View>
                  </>
                )}

                {goal.goalType === 'weight' && (
                  <Text className="text-sm text-gray-500">
                    Target: {goal.targetValue} {goal.unit}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">Add Goal</Text>
            <TouchableOpacity onPress={handleSaveGoal} disabled={!targetValue.trim() || saving}>
              <Text className={`font-medium ${targetValue.trim() ? 'text-primary-500' : 'text-gray-300'}`}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="px-4 pt-4 gap-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Goal Type</Text>
              <View className="gap-2">
                {GOAL_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.key}
                    className={`flex-row items-center p-3 rounded-xl ${
                      selectedGoalType === type.key ? 'bg-primary-50 border-2 border-primary-300' : 'bg-white border border-gray-200'
                    }`}
                    onPress={() => setSelectedGoalType(type.key)}
                  >
                    <Ionicons name={type.icon as any} size={20} color={type.color} />
                    <Text className="text-sm text-gray-800 ml-3 flex-1">{type.label}</Text>
                    <Text className="text-xs text-gray-400">{type.unit}</Text>
                    {selectedGoalType === type.key && (
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" className="ml-2" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Daily Target ({GOAL_TYPES.find(g => g.key === selectedGoalType)?.unit})
              </Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                placeholder={selectedGoalType === 'calories' ? 'e.g. 2000' : selectedGoalType === 'weight' ? 'e.g. 160' : 'e.g. 150'}
                placeholderTextColor="#9ca3af"
                value={targetValue}
                onChangeText={setTargetValue}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
