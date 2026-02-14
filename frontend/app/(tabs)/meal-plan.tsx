import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mealPlansApi, recipesApi } from '../../src/services/api';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates(offset = 0): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function MealPlanScreen() {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>('lunch');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const weekDates = getWeekDates(weekOffset);
  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const { plans } = await mealPlansApi.getPlans();
      // Find plan that overlaps this week
      const weekStart = weekDates[0];
      const weekEnd = weekDates[6];
      const matching = plans.find((p: any) => {
        const pStart = new Date(p.startDate);
        const pEnd = new Date(p.endDate);
        return pStart <= weekEnd && pEnd >= weekStart;
      });
      setPlan(matching || null);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => {
    fetchPlan();
  }, [weekOffset]);

  const handleCreatePlan = async () => {
    setCreating(true);
    try {
      await mealPlansApi.createPlan({
        name: `Week of ${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        startDate: formatDate(weekDates[0]),
        endDate: formatDate(weekDates[6]),
      });
      fetchPlan();
    } catch (err) {
      console.error('Failed to create plan:', err);
    } finally {
      setCreating(false);
    }
  };

  const openAddMeal = async (day: Date, mealType: string) => {
    setSelectedDay(day);
    setSelectedMealType(mealType);
    setShowAddModal(true);
    // Load recipes for selection
    try {
      const data = await recipesApi.getRecipes({ limit: 20 });
      setRecipes(data.recipes || []);
    } catch (err) {
      console.error('Failed to load recipes:', err);
    }
  };

  const handleAddSlot = async (recipeId: string) => {
    if (!plan || !selectedDay) return;
    try {
      await mealPlansApi.addSlot(plan.id, {
        recipeId,
        date: formatDate(selectedDay),
        mealType: selectedMealType,
      });
      setShowAddModal(false);
      fetchPlan();
    } catch (err) {
      console.error('Failed to add slot:', err);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!plan) return;
    try {
      await mealPlansApi.deleteSlot(plan.id, slotId);
      fetchPlan();
    } catch (err) {
      console.error('Failed to delete slot:', err);
    }
  };

  const getSlotsForDay = (date: Date) => {
    if (!plan?.slots) return [];
    const dateStr = formatDate(date);
    return plan.slots.filter((s: any) => {
      const slotDate = new Date(s.date).toISOString().split('T')[0];
      return slotDate === dateStr;
    });
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
      {/* Week navigation */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)}>
          <Ionicons name="chevron-back" size={22} color="#6b7280" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-base font-semibold text-gray-800">{weekLabel}</Text>
          {weekOffset !== 0 && (
            <TouchableOpacity onPress={() => setWeekOffset(0)}>
              <Text className="text-xs text-primary-500">Today</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => setWeekOffset(w => w + 1)}>
          <Ionicons name="chevron-forward" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {!plan ? (
        /* No plan for this week */
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-400 mt-3 text-center">
            No meal plan for this week yet.
          </Text>
          <TouchableOpacity
            onPress={handleCreatePlan}
            disabled={creating}
            className="mt-4 bg-primary-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-medium">
              {creating ? 'Creating...' : 'Create Meal Plan'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Weekly calendar */
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          {weekDates.map((date, dayIdx) => {
            const slots = getSlotsForDay(date);
            const isToday = formatDate(date) === formatDate(new Date());

            return (
              <View key={dayIdx} className={`mx-4 mt-3 bg-white rounded-xl p-3 ${isToday ? 'border-2 border-primary-300' : ''}`}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Text className={`text-sm font-semibold ${isToday ? 'text-primary-600' : 'text-gray-800'}`}>
                      {DAY_NAMES[dayIdx]}
                    </Text>
                    <Text className="text-xs text-gray-400 ml-2">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                    {isToday && (
                      <View className="ml-2 bg-primary-100 px-2 py-0.5 rounded">
                        <Text className="text-[10px] text-primary-600 font-medium">TODAY</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Meal type rows */}
                {MEAL_TYPES.map((mealType) => {
                  const mealSlots = slots.filter((s: any) => s.mealType === mealType);

                  return (
                    <View key={mealType} className="flex-row items-center py-1.5 border-t border-gray-100">
                      <Text className="text-xs text-gray-400 w-16 capitalize">{mealType}</Text>
                      <View className="flex-1 flex-row flex-wrap gap-1">
                        {mealSlots.map((slot: any) => (
                          <TouchableOpacity
                            key={slot.id}
                            className="bg-primary-50 rounded-lg px-2 py-1 flex-row items-center"
                            onLongPress={() => {
                              Alert.alert('Remove', `Remove ${slot.recipe?.title || slot.customName}?`, [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Remove', style: 'destructive', onPress: () => handleDeleteSlot(slot.id) },
                              ]);
                            }}
                          >
                            <Text className="text-xs text-primary-700" numberOfLines={1}>
                              {slot.recipe?.title || slot.customName || 'Meal'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          className="w-6 h-6 rounded-full bg-gray-100 items-center justify-center"
                          onPress={() => openAddMeal(date, mealType)}
                        >
                          <Ionicons name="add" size={14} color="#9ca3af" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Add Meal Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">
              Add {selectedMealType}
            </Text>
            <View className="w-12" />
          </View>

          {selectedDay && (
            <Text className="text-sm text-gray-500 text-center py-2">
              {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
          )}

          {/* Search */}
          <View className="px-4 py-2">
            <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3">
              <Ionicons name="search" size={16} color="#9ca3af" />
              <TextInput
                className="flex-1 py-2.5 px-2 text-sm text-gray-800"
                placeholder="Search recipes..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          <ScrollView className="flex-1 px-4">
            {recipes
              .filter(r => !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((recipe: any) => (
                <TouchableOpacity
                  key={recipe.id}
                  className="bg-white rounded-xl p-3 mb-2 flex-row items-center"
                  onPress={() => handleAddSlot(recipe.id)}
                >
                  <View className="w-10 h-10 rounded-lg bg-primary-100 items-center justify-center mr-3">
                    <Ionicons name="restaurant" size={18} color="#10b981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>{recipe.title}</Text>
                    <Text className="text-xs text-gray-400">
                      {(recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)} min
                      {recipe.nutrition?.calories ? ` · ${recipe.nutrition.calories} cal` : ''}
                    </Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color="#10b981" />
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
