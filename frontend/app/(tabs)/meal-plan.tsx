import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mealPlansApi, recipesApi, nutritionApi } from '../../src/services/api';
import { useMealPrepStore, ChatState } from '../../src/store/chatStore';
import MessageBubble from '../../src/components/chat/MessageBubble';
import ChatInput from '../../src/components/chat/ChatInput';
import ThreadList from '../../src/components/chat/ThreadList';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

/** Platform-safe confirm dialog (Alert.alert can be unreliable on web) */
function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'destructive', onPress: onConfirm },
    ]);
  }
}
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Generate array of dates between start and end inclusive */
function getDateRange(startStr: string, endStr: string): Date[] {
  const dates: Date[] = [];
  const cur = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
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
  const [selectedServings, setSelectedServings] = useState(1);
  const [logMealModal, setLogMealModal] = useState<any>(null);
  const [logCalories, setLogCalories] = useState('');
  const [logCaloriesError, setLogCaloriesError] = useState('');
  const [logProtein, setLogProtein] = useState('');
  const [logProteinError, setLogProteinError] = useState('');
  const [logCarbs, setLogCarbs] = useState('');
  const [logCarbsError, setLogCarbsError] = useState('');
  const [logFat, setLogFat] = useState('');
  const [logFatError, setLogFatError] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  // Enhancement B: Create Plan modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'full' | 'weekdays' | 'custom'>('full');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [createName, setCreateName] = useState('');

  // Enhancement C: Plan Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsStart, setSettingsStart] = useState('');
  const [settingsEnd, setSettingsEnd] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Smart Meal Prep modal state
  const [showMealPrep, setShowMealPrep] = useState(false);
  const [showPrepThreads, setShowPrepThreads] = useState(false);
  const mealPrep = useMealPrepStore();
  const prepFlatListRef = useRef<FlatList>(null);

  // Enhancement A: Edit Slot modal state
  const [editSlotModal, setEditSlotModal] = useState<any>(null);
  const [editServings, setEditServings] = useState(1);
  const [editMealType, setEditMealType] = useState<string>('lunch');
  const [savingSlot, setSavingSlot] = useState(false);

  const weekDates = getWeekDates(weekOffset);
  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  // ─── Validation helpers ────────────────────────────────────────────────

  const validateMacro = (value: string, macroName: string): string => {
    if (!value.trim()) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return 'Please enter a valid number';
    if (num < 0) return `${macroName} cannot be negative`;
    if (macroName === 'Calories' && num > 5000) return 'Calories seem too high (max 5000)';
    if (macroName !== 'Calories' && num > 500) return `${macroName} seems too high (max 500g)`;
    return '';
  };

  // Derive displayed days from plan dates (Enhancement B) or fall back to week dates
  const planDates = plan
    ? getDateRange(
        new Date(plan.startDate).toISOString().split('T')[0],
        new Date(plan.endDate).toISOString().split('T')[0]
      )
    : weekDates;

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const { plans } = await mealPlansApi.getPlans();
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

  // Enhancement B: Open create modal instead of instant create
  const openCreateModal = () => {
    const monday = weekDates[0];
    const friday = weekDates[4];
    const sunday = weekDates[6];
    setCreateType('full');
    setCreateName(`Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
    setCustomStart(formatDate(monday));
    setCustomEnd(formatDate(sunday));
    setShowCreateModal(true);
  };

  const handleCreatePlan = async () => {
    setCreating(true);
    try {
      let startDate: string, endDate: string;
      const monday = weekDates[0];
      const friday = weekDates[4];
      const sunday = weekDates[6];

      if (createType === 'full') {
        startDate = formatDate(monday);
        endDate = formatDate(sunday);
      } else if (createType === 'weekdays') {
        startDate = formatDate(monday);
        endDate = formatDate(friday);
      } else {
        startDate = customStart;
        endDate = customEnd;
      }

      if (!startDate || !endDate || startDate > endDate) {
        Alert.alert('Invalid dates', 'Start date must be before end date.');
        setCreating(false);
        return;
      }

      await mealPlansApi.createPlan({
        name: createName || `Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        startDate,
        endDate,
      });
      setShowCreateModal(false);
      fetchPlan();
    } catch (err) {
      console.error('Failed to create plan:', err);
    } finally {
      setCreating(false);
    }
  };

  // Enhancement C: Save plan settings
  const handleSaveSettings = async () => {
    if (!plan) return;
    if (!settingsStart || !settingsEnd || settingsStart > settingsEnd) {
      Alert.alert('Invalid dates', 'Start date must be before end date.');
      return;
    }
    // Warn if shrinking removes slots
    if (settingsStart > new Date(plan.startDate).toISOString().split('T')[0] ||
        settingsEnd < new Date(plan.endDate).toISOString().split('T')[0]) {
      const slotsOutside = (plan.slots || []).filter((s: any) => {
        const d = new Date(s.date).toISOString().split('T')[0];
        return d < settingsStart || d > settingsEnd;
      });
      if (slotsOutside.length > 0) {
        confirmAction(
          'Slots outside range',
          `${slotsOutside.length} meal(s) are outside the new date range and will be orphaned. Continue?`,
          () => doSaveSettings()
        );
        return;
      }
    }
    doSaveSettings();
  };

  const doSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await mealPlansApi.updatePlan(plan.id, {
        name: settingsName,
        startDate: settingsStart,
        endDate: settingsEnd,
      });
      setShowSettingsModal(false);
      fetchPlan();
    } catch (err) {
      console.error('Failed to update plan:', err);
      Alert.alert('Error', 'Failed to update plan.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeletePlan = () => {
    if (!plan) return;
    confirmAction('Delete Plan', 'Delete this entire meal plan? This cannot be undone.', async () => {
      try {
        await mealPlansApi.deletePlan(plan.id);
        setShowSettingsModal(false);
        fetchPlan();
      } catch (err) {
        console.error('Failed to delete plan:', err);
      }
    });
  };

  const openAddMeal = async (day: Date, mealType: string) => {
    setSelectedDay(day);
    setSelectedMealType(mealType);
    setShowAddModal(true);
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
        servings: selectedServings,
      });
      setShowAddModal(false);
      setSelectedServings(1);
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

  const getScaledNutrition = (slot: any) => {
    const recipe = slot.recipe;
    if (!recipe?.nutrition) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const nutr = typeof recipe.nutrition === 'string' ? JSON.parse(recipe.nutrition) : recipe.nutrition;
    const multiplier = (slot.servings || recipe.servings || 1) / (recipe.servings || 1);
    return {
      calories: Math.round((nutr?.calories || 0) * multiplier),
      protein: Math.round(((nutr?.protein || 0) * multiplier) * 10) / 10,
      carbs: Math.round(((nutr?.carbs || 0) * multiplier) * 10) / 10,
      fat: Math.round(((nutr?.fat || 0) * multiplier) * 10) / 10,
    };
  };

  const openLogMealModal = (slot: any) => {
    const nutr = getScaledNutrition(slot);
    setLogCalories(String(nutr.calories));
    setLogProtein(String(nutr.protein));
    setLogCarbs(String(nutr.carbs));
    setLogFat(String(nutr.fat));
    setLogCaloriesError('');
    setLogProteinError('');
    setLogCarbsError('');
    setLogFatError('');
    setLogMealModal(slot);
  };

  const handleSaveEditLog = async () => {
    if (!plan || !logMealModal) return;

    // Check for validation errors
    if (logCaloriesError || logProteinError || logCarbsError || logFatError) {
      Alert.alert('Invalid Input', 'Please fix the errors before saving.');
      return;
    }

    const slot = logMealModal;
    setSavingLog(true);
    try {
      await nutritionApi.logMeal({
        mealType: slot.mealType,
        mealDate: new Date(slot.date).toISOString().split('T')[0],
        mealTime: new Date().toISOString(),
        mealName: slot.recipe?.title || slot.customName || 'Meal',
        calories: logCalories ? parseInt(logCalories) : undefined,
        protein: logProtein ? parseFloat(logProtein) : undefined,
        carbs: logCarbs ? parseFloat(logCarbs) : undefined,
        fat: logFat ? parseFloat(logFat) : undefined,
      });
      await mealPlansApi.markSlotCompleted(plan.id, slot.id, true);
      setLogMealModal(null);
      fetchPlan();
    } catch (err) {
      console.error('Failed to log meal:', err);
      Alert.alert('Error', 'Failed to log meal.');
    } finally {
      setSavingLog(false);
    }
  };

  // Enhancement A: Open edit slot modal (works for both active and completed slots)
  const openEditSlotModal = (slot: any) => {
    setEditSlotModal(slot);
    setEditServings(slot.servings || 1);
    setEditMealType(slot.mealType || 'lunch');
  };

  const handleUndoCompleted = async () => {
    if (!plan || !editSlotModal) return;
    try {
      await mealPlansApi.markSlotCompleted(plan.id, editSlotModal.id, false);
      setEditSlotModal(null);
      fetchPlan();
    } catch (err) {
      console.error('Failed to undo:', err);
    }
  };

  const handleSaveSlotEdits = async () => {
    if (!plan || !editSlotModal) return;
    setSavingSlot(true);
    try {
      await mealPlansApi.updateSlot(plan.id, editSlotModal.id, {
        servings: editServings,
        mealType: editMealType,
      });
      setEditSlotModal(null);
      fetchPlan();
    } catch (err) {
      console.error('Failed to update slot:', err);
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSavingSlot(false);
    }
  };

  const handleQuickLogFromEdit = async () => {
    if (!plan || !editSlotModal) return;
    const slot = editSlotModal;
    try {
      // Log meal to nutrition tracker
      const nutr = getScaledNutrition(slot);
      await nutritionApi.logMeal({
        mealType: slot.mealType,
        mealDate: new Date(slot.date).toISOString().split('T')[0],
        mealTime: new Date().toISOString(),
        mealName: slot.recipe?.title || slot.customName || 'Meal',
        calories: nutr.calories || undefined,
        protein: nutr.protein || undefined,
        carbs: nutr.carbs || undefined,
        fat: nutr.fat || undefined,
      });

      // Mark slot as completed
      await mealPlansApi.markSlotCompleted(plan.id, slot.id, true);
      setEditSlotModal(null);
      fetchPlan();
    } catch (err) {
      console.error('Failed to mark eaten:', err);
      Alert.alert('Error', 'Failed to log meal. Please try again.');
    }
  };

  const handleEditLogFromEdit = () => {
    if (!editSlotModal) return;
    const slot = editSlotModal;
    setEditSlotModal(null);
    openLogMealModal(slot);
  };

  const handleDeleteFromEdit = () => {
    if (!editSlotModal) return;
    const name = editSlotModal.recipe?.title || editSlotModal.customName || 'this meal';
    const slotId = editSlotModal.id;
    confirmAction('Delete Slot', `Remove "${name}" from the plan?`, async () => {
      await handleDeleteSlot(slotId);
      setEditSlotModal(null);
    });
  };

  const getSlotsForDay = (date: Date) => {
    if (!plan?.slots) return [];
    const dateStr = formatDate(date);
    return plan.slots.filter((s: any) => {
      const slotDate = new Date(s.date).toISOString().split('T')[0];
      return slotDate === dateStr;
    });
  };

  // Enhancement C: Open settings modal
  const openSettingsModal = () => {
    if (!plan) return;
    setSettingsName(plan.name || '');
    setSettingsStart(new Date(plan.startDate).toISOString().split('T')[0]);
    setSettingsEnd(new Date(plan.endDate).toISOString().split('T')[0]);
    setShowSettingsModal(true);
  };

  // Helper: is plan currently M-F (weekdays only)?
  const isPlanWeekdaysOnly = plan && (() => {
    const start = new Date(plan.startDate);
    const end = new Date(plan.endDate);
    return start.getDay() === 1 && end.getDay() === 5; // Mon to Fri
  })();

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
        <View className="flex-row items-center">
          <View className="items-center">
            <Text className="text-base font-semibold text-gray-800">{weekLabel}</Text>
            {weekOffset !== 0 && (
              <TouchableOpacity onPress={() => setWeekOffset(0)}>
                <Text className="text-xs text-primary-500">Today</Text>
              </TouchableOpacity>
            )}
          </View>
          {plan && (
            <TouchableOpacity onPress={openSettingsModal} className="ml-2" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="settings-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => setWeekOffset(w => w + 1)}>
          <Ionicons name="chevron-forward" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {!plan ? (
        /* No plan — show create button opening modal */
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-400 mt-3 text-center">
            No meal plan for this week yet.
          </Text>
          <TouchableOpacity
            onPress={openCreateModal}
            className="mt-4 bg-primary-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-medium">Create Meal Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { mealPrep.loadThreads(); setShowMealPrep(true); }}
            className="mt-3 px-6 py-3 rounded-lg flex-row items-center"
            style={{ backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' }}
          >
            <Ionicons name="flame" size={18} color="#f97316" />
            <Text className="ml-2 font-medium" style={{ color: '#ea580c' }}>Smart Meal Prep</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Plan calendar — render days from plan date range */
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
          {planDates.map((date, dayIdx) => {
            const slots = getSlotsForDay(date);
            const isToday = formatDate(date) === formatDate(new Date());
            const dayName = SHORT_DAYS[date.getDay()];

            return (
              <View key={formatDate(date)} className={`mx-4 mt-3 bg-white rounded-xl p-3 ${isToday ? 'border-2 border-primary-300' : ''}`}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Text className={`text-sm font-semibold ${isToday ? 'text-primary-600' : 'text-gray-800'}`}>
                      {dayName}
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
                            className={`rounded-lg px-2 py-1 flex-row items-center ${slot.isCompleted ? 'bg-green-50 border border-green-200' : 'bg-primary-50'}`}
                            onPress={() => openEditSlotModal(slot)}
                          >
                            <Text
                              className={`text-xs ${slot.isCompleted ? 'text-gray-700' : 'text-primary-700'}`}
                              numberOfLines={1}
                            >
                              {slot.recipe?.title || slot.customName || 'Meal'}
                            </Text>
                            {slot.servings && slot.servings > 1 && (
                              <View className={`ml-1 rounded px-1 ${slot.isCompleted ? 'bg-gray-200' : 'bg-primary-200'}`}>
                                <Text className={`text-[9px] font-medium ${slot.isCompleted ? 'text-gray-600' : 'text-primary-800'}`}>{slot.servings}x</Text>
                              </View>
                            )}
                            {slot.isCompleted && (
                              <View className="ml-1 bg-green-500 rounded px-1.5 py-0.5">
                                <Text className="text-[9px] font-medium text-white">✓ Logged</Text>
                              </View>
                            )}
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

      {/* ===== Smart Meal Prep floating button ===== */}
      {plan && (
        <TouchableOpacity
          onPress={() => { mealPrep.loadThreads(); setShowMealPrep(true); }}
          className="absolute bottom-5 right-5 flex-row items-center px-4 py-3 rounded-full shadow-lg"
          style={{ backgroundColor: '#f97316', elevation: 4 }}
        >
          <Ionicons name="flame" size={20} color="#ffffff" />
          <Text className="ml-2 text-white font-semibold text-sm">Smart Meal Prep</Text>
        </TouchableOpacity>
      )}

      {/* ===== Smart Meal Prep Modal ===== */}
      <Modal visible={showMealPrep} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowMealPrep(false)}>
        <SmartMealPrepChat
          store={mealPrep}
          flatListRef={prepFlatListRef}
          onClose={() => { setShowMealPrep(false); fetchPlan(); }}
          onShowThreads={() => setShowPrepThreads(true)}
        />
        <Modal
          visible={showPrepThreads}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPrepThreads(false)}
        >
          <ThreadList onClose={() => setShowPrepThreads(false)} store="meal-prep" />
        </Modal>
      </Modal>

      {/* ===== Enhancement A: Edit Slot Modal ===== */}
      <Modal visible={!!editSlotModal} transparent animationType="fade" onRequestClose={() => setEditSlotModal(null)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={(e) => { if (e.target === e.currentTarget) setEditSlotModal(null); }}>
          <View className="bg-white rounded-t-2xl px-5 pt-5 pb-8">
            {/* Recipe name */}
            <Text className="text-base font-semibold text-gray-800 mb-0.5">
              {editSlotModal?.recipe?.title || editSlotModal?.customName || 'Meal'}
            </Text>
            <Text className="text-xs text-gray-400 mb-4 capitalize">
              {editSlotModal?.mealType} · {new Date(editSlotModal?.date || '').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {editSlotModal?.isCompleted ? ' · Eaten' : ''}
            </Text>

            {editSlotModal?.isCompleted ? (
              /* Completed slot: show View in Nutrition, Undo, and Delete */
              <>
                <View className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-3">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{ marginRight: 6 }} />
                    <Text className="text-sm font-medium text-green-700">Logged to Nutrition Tracker</Text>
                  </View>
                  <Text className="text-xs text-gray-600">This meal was logged on {new Date(editSlotModal.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.</Text>
                </View>

                <TouchableOpacity
                  className="py-2.5 rounded-lg bg-primary-500 items-center mb-2"
                  onPress={() => {
                    setEditSlotModal(null);
                    router.push('/health-goals');
                  }}
                >
                  <Text className="text-sm font-medium text-white">View in Nutrition Tracker</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="py-2.5 rounded-lg bg-gray-100 border border-gray-200 items-center mb-2"
                  onPress={handleUndoCompleted}
                >
                  <Text className="text-sm font-medium text-gray-700">Undo (Mark as Not Eaten)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="py-2.5 rounded-lg items-center"
                  onPress={handleDeleteFromEdit}
                >
                  <Text className="text-sm font-medium text-red-500">Delete Slot</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Active slot: full edit UI */
              <>
                {/* Servings picker */}
                <Text className="text-xs text-gray-500 mb-1.5 font-medium">Servings</Text>
                <View className="flex-row gap-2 mb-3">
                  {[1, 2, 4].map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setEditServings(s)}
                      className={`flex-1 py-2 rounded-lg border items-center ${
                        editServings === s ? 'bg-primary-50 border-primary-400' : 'bg-white border-gray-200'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${editServings === s ? 'text-primary-700' : 'text-gray-600'}`}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => {
                      if (Alert.prompt) {
                        Alert.prompt('Custom servings', 'How many servings?', (text: string) => {
                          const n = parseInt(text);
                          if (n > 0) setEditServings(n);
                        });
                      }
                    }}
                    className={`flex-1 py-2 rounded-lg border items-center ${
                      ![1, 2, 4].includes(editServings) ? 'bg-primary-50 border-primary-400' : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${![1, 2, 4].includes(editServings) ? 'text-primary-700' : 'text-gray-600'}`}>
                      {![1, 2, 4].includes(editServings) ? editServings : '...'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Meal type selector */}
                <Text className="text-xs text-gray-500 mb-1.5 font-medium">Meal Type</Text>
                <View className="flex-row gap-2 mb-4">
                  {MEAL_TYPES.map((mt) => (
                    <TouchableOpacity
                      key={mt}
                      onPress={() => setEditMealType(mt)}
                      className={`flex-1 py-2 rounded-lg border items-center ${
                        editMealType === mt ? 'bg-primary-50 border-primary-400' : 'bg-white border-gray-200'
                      }`}
                    >
                      <Text className={`text-xs font-medium capitalize ${editMealType === mt ? 'text-primary-700' : 'text-gray-600'}`}>{mt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Action buttons */}
                <Text className="text-xs text-gray-500 mb-1.5 font-medium">Log Meal</Text>
                <View className="flex-row gap-2 mb-1">
                  <TouchableOpacity
                    className="flex-1 py-2.5 rounded-lg bg-green-500 items-center"
                    onPress={handleQuickLogFromEdit}
                  >
                    <Text className="text-sm font-medium text-white">Log as Eaten</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 py-2.5 rounded-lg bg-primary-50 border border-primary-300 items-center"
                    onPress={handleEditLogFromEdit}
                  >
                    <Text className="text-sm font-medium text-primary-700">Adjust & Log</Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-xs text-gray-400 mb-3">
                  Logs this meal to your nutrition tracker. Use "Adjust & Log" to modify macros.
                </Text>

                <Text className="text-xs text-gray-500 mb-1.5 font-medium">Edit Slot</Text>
                <TouchableOpacity
                  className="py-2.5 rounded-lg bg-gray-100 items-center mb-2"
                  onPress={handleSaveSlotEdits}
                  disabled={savingSlot}
                >
                  <Text className="text-sm font-medium text-gray-700">
                    {savingSlot ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="py-2.5 rounded-lg items-center"
                  onPress={handleDeleteFromEdit}
                >
                  <Text className="text-sm font-medium text-red-500">Delete Slot</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* ===== Edit & Log Modal ===== */}
      <Modal visible={!!logMealModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLogMealModal(null)}>
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => setLogMealModal(null)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">Edit & Log</Text>
            <TouchableOpacity onPress={handleSaveEditLog} disabled={savingLog}>
              <Text className={`font-medium ${savingLog ? 'text-gray-300' : 'text-primary-500'}`}>
                {savingLog ? 'Saving...' : 'Log'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 30 }}>
            <Text className="text-base font-semibold text-gray-800 mb-1">
              {logMealModal?.recipe?.title || logMealModal?.customName || 'Meal'}
            </Text>
            <Text className="text-xs text-gray-400 mb-4 capitalize">
              {logMealModal?.mealType}
              {logMealModal?.servings > 1 ? ` · ${logMealModal.servings} servings` : ''}
            </Text>

            <Text className="text-sm font-medium text-gray-700 mb-2">Adjust Nutrition</Text>
            <View className="flex-row gap-2 mb-2">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Calories</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800"
                  placeholder="kcal"
                  placeholderTextColor="#d1d5db"
                  value={logCalories}
                  onChangeText={(text) => {
                    setLogCalories(text);
                    const error = validateMacro(text, 'Calories');
                    setLogCaloriesError(error);
                  }}
                  keyboardType="numeric"
                />
                {logCaloriesError ? (
                  <Text className="text-xs text-red-500 mt-0.5">{logCaloriesError}</Text>
                ) : null}
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Protein (g)</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800"
                  placeholder="g"
                  placeholderTextColor="#d1d5db"
                  value={logProtein}
                  onChangeText={(text) => {
                    setLogProtein(text);
                    const error = validateMacro(text, 'Protein');
                    setLogProteinError(error);
                  }}
                  keyboardType="numeric"
                />
                {logProteinError ? (
                  <Text className="text-xs text-red-500 mt-0.5">{logProteinError}</Text>
                ) : null}
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Carbs (g)</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800"
                  placeholder="g"
                  placeholderTextColor="#d1d5db"
                  value={logCarbs}
                  onChangeText={(text) => {
                    setLogCarbs(text);
                    const error = validateMacro(text, 'Carbs');
                    setLogCarbsError(error);
                  }}
                  keyboardType="numeric"
                />
                {logCarbsError ? (
                  <Text className="text-xs text-red-500 mt-0.5">{logCarbsError}</Text>
                ) : null}
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Fat (g)</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800"
                  placeholder="g"
                  placeholderTextColor="#d1d5db"
                  value={logFat}
                  onChangeText={(text) => {
                    setLogFat(text);
                    const error = validateMacro(text, 'Fat');
                    setLogFatError(error);
                  }}
                  keyboardType="numeric"
                />
                {logFatError ? (
                  <Text className="text-xs text-red-500 mt-0.5">{logFatError}</Text>
                ) : null}
              </View>
            </View>

            <Text className="text-xs text-gray-400 mt-3">
              Pre-filled from recipe nutrition. Adjust if your portion differs.
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* ===== Enhancement B: Create Plan Modal ===== */}
      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <Pressable className="flex-1 bg-black/40 justify-center items-center" onPress={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <View className="bg-white rounded-2xl mx-6 p-5 w-80">
            <Text className="text-lg font-semibold text-gray-800 mb-3 text-center">New Meal Plan</Text>

            {/* Plan name */}
            <Text className="text-xs text-gray-500 mb-1 font-medium">Plan Name</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 mb-3"
              placeholder="Week of Mar 3"
              placeholderTextColor="#d1d5db"
              value={createName}
              onChangeText={setCreateName}
            />

            {/* Duration type */}
            <Text className="text-xs text-gray-500 mb-1.5 font-medium">Duration</Text>
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
                    createType === type ? 'bg-primary-50 border-primary-400' : 'bg-white border-gray-200'
                  }`}
                >
                  <Ionicons
                    name={createType === type ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={createType === type ? '#10b981' : '#d1d5db'}
                  />
                  <Text className={`text-sm ml-2 ${createType === type ? 'text-primary-700 font-medium' : 'text-gray-600'}`}>
                    {labels[type]}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Custom date inputs */}
            {createType === 'custom' && (
              <View className="flex-row gap-2 mt-2">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Start (YYYY-MM-DD)</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                    placeholder="2025-03-03"
                    placeholderTextColor="#d1d5db"
                    value={customStart}
                    onChangeText={setCustomStart}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">End (YYYY-MM-DD)</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                    placeholder="2025-03-09"
                    placeholderTextColor="#d1d5db"
                    value={customEnd}
                    onChangeText={setCustomEnd}
                  />
                </View>
              </View>
            )}

            {/* Create button */}
            <TouchableOpacity
              className="mt-4 py-3 rounded-lg bg-primary-500 items-center"
              onPress={handleCreatePlan}
              disabled={creating}
            >
              <Text className="text-white font-semibold">
                {creating ? 'Creating...' : 'Create Plan'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ===== Enhancement C: Plan Settings Modal ===== */}
      <Modal visible={showSettingsModal} transparent animationType="fade" onRequestClose={() => setShowSettingsModal(false)}>
        <Pressable className="flex-1 bg-black/40 justify-center items-center" onPress={(e) => { if (e.target === e.currentTarget) setShowSettingsModal(false); }}>
          <View className="bg-white rounded-2xl mx-6 p-5 w-80">
            <Text className="text-lg font-semibold text-gray-800 mb-3 text-center">Plan Settings</Text>

            {/* Plan name */}
            <Text className="text-xs text-gray-500 mb-1 font-medium">Plan Name</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 mb-3"
              value={settingsName}
              onChangeText={setSettingsName}
            />

            {/* Dates */}
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1 font-medium">Start Date</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                  value={settingsStart}
                  onChangeText={setSettingsStart}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#d1d5db"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1 font-medium">End Date</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                  value={settingsEnd}
                  onChangeText={setSettingsEnd}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#d1d5db"
                />
              </View>
            </View>

            {/* Quick toggles — show context-aware buttons */}
            {isPlanWeekdaysOnly && (
              <View className="flex-row gap-2 mb-3">
                <TouchableOpacity
                  className="flex-1 py-2 rounded-lg border border-primary-300 bg-primary-50 items-center"
                  onPress={() => {
                    // Add Saturday: extend end by 1
                    const fri = new Date(settingsEnd + 'T00:00:00');
                    const sat = new Date(fri);
                    sat.setDate(fri.getDate() + 1);
                    setSettingsEnd(formatDate(sat));
                  }}
                >
                  <Text className="text-xs font-medium text-primary-700">+ Include Sat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-2 rounded-lg border border-primary-300 bg-primary-50 items-center"
                  onPress={() => {
                    // Add Sat + Sun: extend end by 2
                    const fri = new Date(settingsEnd + 'T00:00:00');
                    const sun = new Date(fri);
                    sun.setDate(fri.getDate() + 2);
                    setSettingsEnd(formatDate(sun));
                  }}
                >
                  <Text className="text-xs font-medium text-primary-700">+ Include Sat & Sun</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Save */}
            <TouchableOpacity
              className="py-3 rounded-lg bg-primary-500 items-center mb-2"
              onPress={handleSaveSettings}
              disabled={savingSettings}
            >
              <Text className="text-white font-semibold">
                {savingSettings ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>

            {/* Delete Plan */}
            <TouchableOpacity
              className="py-2.5 rounded-lg items-center"
              onPress={handleDeletePlan}
            >
              <Text className="text-sm font-medium text-red-500">Delete Plan</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ===== Add Meal Modal ===== */}
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

          {/* Servings picker */}
          <View className="px-4 pt-2">
            <Text className="text-xs text-gray-500 mb-1.5">Servings</Text>
            <View className="flex-row gap-2">
              {[1, 2, 4].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSelectedServings(s)}
                  className={`flex-1 py-2 rounded-lg border items-center ${
                    selectedServings === s
                      ? 'bg-primary-50 border-primary-400'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className={`text-sm font-medium ${
                    selectedServings === s ? 'text-primary-700' : 'text-gray-600'
                  }`}>{s}</Text>
                  <Text className={`text-[10px] ${
                    selectedServings === s ? 'text-primary-500' : 'text-gray-400'
                  }`}>
                    {s === 1 ? 'Single' : s === 2 ? 'Leftovers' : 'Meal prep'}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => {
                  if (Alert.prompt) {
                    Alert.prompt('Custom servings', 'How many servings?', (text: string) => {
                      const n = parseInt(text);
                      if (n > 0) setSelectedServings(n);
                    });
                  }
                }}
                className={`flex-1 py-2 rounded-lg border items-center ${
                  ![1, 2, 4].includes(selectedServings)
                    ? 'bg-primary-50 border-primary-400'
                    : 'bg-white border-gray-200'
                }`}
              >
                <Text className={`text-sm font-medium ${
                  ![1, 2, 4].includes(selectedServings) ? 'text-primary-700' : 'text-gray-600'
                }`}>
                  {![1, 2, 4].includes(selectedServings) ? selectedServings : '...'}
                </Text>
                <Text className={`text-[10px] ${
                  ![1, 2, 4].includes(selectedServings) ? 'text-primary-500' : 'text-gray-400'
                }`}>Custom</Text>
              </TouchableOpacity>
            </View>
          </View>

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

// ─── Smart Meal Prep Chat (inline component) ─────────────────────────────────

const MEAL_PREP_PROMPTS = [
  'Easy crockpot meal prep for the week',
  'High protein sheet pan meal prep',
  'Meal prep lunches for the next 5 work days',
  'Batch cook chicken — half fridge, half freezer',
  'Budget meal prep under $30',
];

function SmartMealPrepChat({
  store,
  flatListRef,
  onClose,
  onShowThreads,
}: {
  store: ChatState;
  flatListRef: React.RefObject<FlatList | null>;
  onClose: () => void;
  onShowThreads: () => void;
}) {
  const {
    messages,
    isSending,
    streamingContent,
    error,
    sendMessage,
    createThread,
    retryLastMessage,
    clearError,
  } = store;

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, streamingContent]);

  const handleSend = useCallback((text: string) => sendMessage(text), [sendMessage]);

  const renderMessage = useCallback(
    ({ item }: { item: any }) => (
      <MessageBubble role={item.role} message={item.message} />
    ),
    []
  );

  const showWelcome = messages.length === 0 && !isSending;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200" style={{ backgroundColor: '#f97316' }}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">Smart Meal Prep</Text>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={onShowThreads}>
            <Ionicons name="time-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => createThread()}>
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {showWelcome ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <View className="bg-white rounded-2xl p-8 items-center shadow-sm w-full max-w-sm">
            <View className="rounded-full p-4 mb-4" style={{ backgroundColor: '#fff7ed' }}>
              <Ionicons name="flame" size={48} color="#f97316" />
            </View>
            <Text className="text-xl font-bold text-gray-800 mb-2">
              Smart Meal Prep
            </Text>
            <Text className="text-gray-500 text-center mb-6">
              I'll create a batch recipe, check your inventory, build a shopping
              list, and add it to your meal plan.
            </Text>
            <View className="w-full gap-2">
              {MEAL_PREP_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  className="rounded-lg p-3"
                  style={{ backgroundColor: '#fff7ed' }}
                  onPress={() => handleSend(prompt)}
                >
                  <Text className="text-center text-sm" style={{ color: '#c2410c' }}>
                    "{prompt}"
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {streamingContent ? (
                <MessageBubble role="assistant" message={streamingContent} isStreaming />
              ) : null}
              {isSending && !streamingContent ? (
                <View className="flex-row items-center px-4 mb-3">
                  <View className="rounded-full w-8 h-8 items-center justify-center mr-2" style={{ backgroundColor: '#fff7ed' }}>
                    <Ionicons name="flame" size={16} color="#f97316" />
                  </View>
                  <View className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                    <ActivityIndicator size="small" color="#f97316" />
                  </View>
                </View>
              ) : null}
              {error && !isSending ? (
                <View className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-xl p-3">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="alert-circle" size={16} color="#ef4444" />
                    <Text className="text-sm text-red-600 ml-1.5 flex-1">{error}</Text>
                  </View>
                  <View className="flex-row gap-2 mt-2">
                    <TouchableOpacity className="bg-red-100 px-3 py-1.5 rounded-lg" onPress={() => retryLastMessage()}>
                      <Text className="text-xs text-red-700 font-medium">Retry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="px-3 py-1.5 rounded-lg" onPress={() => clearError()}>
                      <Text className="text-xs text-gray-500">Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </>
          }
        />
      )}

      <ChatInput onSend={handleSend} disabled={isSending} />
    </View>
  );
}
