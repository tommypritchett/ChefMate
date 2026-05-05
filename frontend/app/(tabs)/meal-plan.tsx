import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mealPlansApi, recipesApi, nutritionApi } from '../../src/services/api';
import { useMealPrepStore } from '../../src/store/chatStore';
import ThreadList from '../../src/components/chat/ThreadList';
import SmartMealPrepChat from '../../src/components/meal-plan/SmartMealPrepChat';
import EditSlotModal from '../../src/components/meal-plan/EditSlotModal';
import LogMealModal from '../../src/components/meal-plan/LogMealModal';
import { CreatePlanModal, PlanSettingsModal } from '../../src/components/meal-plan/PlanModals';
import AddRecipeModal from '../../src/components/meal-plan/AddRecipeModal';
import {
  MEAL_TYPES, SHORT_DAYS,
  confirmAction, getWeekDates, formatDate, getDateRange, validateMacro,
} from '../../src/components/meal-plan/mealPlanHelpers';
import { resetFoodLogReminder } from '../../src/services/notifications';

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
      resetFoodLogReminder().catch(() => {});
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
      resetFoodLogReminder().catch(() => {});
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
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator size="large" color="#D4652E" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-cream">
      {/* Header */}
      <View className="bg-warm-dark pt-14 px-6 pb-1">
        <View className="flex-row justify-between items-center">
          <Text className="text-cream text-[28px] font-serif-bold" style={{ letterSpacing: -0.5 }}>Meal Plan</Text>
          <View className="flex-row gap-2 items-center">
            <TouchableOpacity
              style={{ backgroundColor: 'rgba(255,251,245,0.1)' }}
              className="w-9 h-9 rounded-xl items-center justify-center"
              onPress={() => router.push('/health-goals')}
            >
              <Ionicons name="stats-chart" size={20} color="#FFFBF5" />
            </TouchableOpacity>
            {plan && (
              <TouchableOpacity
                style={{ backgroundColor: 'rgba(255,251,245,0.1)' }}
                className="w-9 h-9 rounded-xl items-center justify-center"
                onPress={openSettingsModal}
              >
                <Ionicons name="settings-outline" size={20} color="#FFFBF5" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              testID="profile-icon"
              onPress={() => router.push('/(tabs)/profile')}
              className="w-[38px] h-[38px] rounded-full items-center justify-center"
              style={{ backgroundColor: '#FFF0E8', borderWidth: 2, borderColor: 'rgba(212,101,46,0.4)' }}
            >
              <Ionicons name="person" size={18} color="#D4652E" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Week navigation */}
      <View className="bg-warm-dark px-5 pb-[18px] flex-row items-center" style={{ gap: 12 }}>
        <TouchableOpacity
          onPress={() => setWeekOffset(w => w - 1)}
          className="w-[34px] h-[34px] rounded-[10px] items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}
        >
          <Text className="text-base" style={{ color: '#B8A68E' }}>‹</Text>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-base font-serif-semibold text-cream" style={{ letterSpacing: -0.2 }}>{weekLabel}</Text>
        </View>
        {weekOffset !== 0 && (
          <TouchableOpacity
            onPress={() => setWeekOffset(0)}
            className="rounded-lg px-3 py-[5px]"
            style={{ borderWidth: 1, borderColor: 'rgba(212,101,46,0.5)' }}
          >
            <Text className="text-xs font-sans-semibold" style={{ color: '#D4652E', letterSpacing: 0.3 }}>Today</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setWeekOffset(w => w + 1)}
          className="w-[34px] h-[34px] rounded-[10px] items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}
        >
          <Text className="text-base" style={{ color: '#B8A68E' }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day strip */}
      <View className="bg-warm-dark px-5">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 18 }}>
          {weekDates.map((date, idx) => {
            const isSelected = plan && formatDate(date) >= new Date(plan.startDate).toISOString().split('T')[0] && formatDate(date) <= new Date(plan.endDate).toISOString().split('T')[0];
            const isToday = formatDate(date) === formatDate(new Date());
            const daySlots = getSlotsForDay(date);
            const hasMeals = daySlots.length > 0;
            return (
              <View
                key={idx}
                className="items-center rounded-xl px-[10px] py-2"
                style={[
                  { minWidth: 44 },
                  isToday ? { backgroundColor: '#D4652E' } : {},
                ]}
              >
                <Text
                  className="text-[11px] font-sans-medium uppercase"
                  style={{ color: isToday ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)', letterSpacing: 0.8 }}
                >
                  {SHORT_DAYS[date.getDay()]}
                </Text>
                <Text
                  className="text-base font-sans-semibold"
                  style={{ color: isToday ? '#fff' : 'rgba(255,255,255,0.4)' }}
                >
                  {date.getDate()}
                </Text>
                {hasMeals && (
                  <View
                    className="w-1 h-1 rounded-full mt-0.5"
                    style={{ backgroundColor: isToday ? 'rgba(255,255,255,0.7)' : 'rgba(212,101,46,0.6)' }}
                  />
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {!plan ? (
        /* No plan — show create button opening modal */
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="calendar-outline" size={48} color="#B8A68E" />
          <Text className="text-brown-light mt-3 text-center font-sans">
            No meal plan for this week yet.
          </Text>
          <TouchableOpacity
            onPress={openCreateModal}
            className="mt-4 px-6 py-4 rounded-2xl flex-row items-center justify-center"
            style={{ backgroundColor: '#2D2520', shadowColor: '#2D2520', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 4 }}
          >
            <Text className="text-lg mr-2">✦</Text>
            <Text className="text-cream font-sans-semibold text-[15px]" style={{ letterSpacing: -0.2 }}>Create Meal Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { mealPrep.loadThreads(); setShowMealPrep(true); }}
            className="mt-3 px-6 py-3 rounded-xl flex-row items-center"
            style={{ backgroundColor: '#FFF0E8', borderWidth: 1, borderColor: '#FDDCC9' }}
          >
            <Ionicons name="flame" size={18} color="#D4652E" />
            <Text className="ml-2 font-sans-medium" style={{ color: '#D4652E' }}>Smart Meal Prep</Text>
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
              <View
                key={formatDate(date)}
                className={`mx-4 mt-4 bg-white rounded-2xl p-4 ${isToday ? 'border-2 border-primary-500' : ''}`}
                style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Text className={`text-base font-sans-bold ${isToday ? 'text-primary-600' : 'text-warm-dark'}`}>
                      {dayName}
                    </Text>
                    <Text className="text-sm text-brown ml-2 font-sans">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                    {isToday && (
                      <View className="ml-2 bg-orange-light px-2.5 py-1 rounded-lg">
                        <Text className="text-xs text-orange-dark font-sans-bold">TODAY</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Daily macro estimates */}
                {slots.length > 0 && (() => {
                  const dayTotals = slots.reduce(
                    (acc: { calories: number; protein: number; carbs: number; fat: number }, slot: any) => {
                      const n = getScaledNutrition(slot);
                      return {
                        calories: acc.calories + n.calories,
                        protein: acc.protein + n.protein,
                        carbs: acc.carbs + n.carbs,
                        fat: acc.fat + n.fat,
                      };
                    },
                    { calories: 0, protein: 0, carbs: 0, fat: 0 }
                  );
                  return dayTotals.calories > 0 ? (
                    <View className="flex-row items-center bg-orange-light rounded-xl px-3 py-2 mb-2" style={{ gap: 12 }}>
                      <Text className="text-xs font-sans-bold" style={{ color: '#D4652E' }}>
                        {dayTotals.calories} kcal
                      </Text>
                      <Text className="text-[11px] font-sans text-brown">
                        P: {Math.round(dayTotals.protein)}g
                      </Text>
                      <Text className="text-[11px] font-sans text-brown">
                        C: {Math.round(dayTotals.carbs)}g
                      </Text>
                      <Text className="text-[11px] font-sans text-brown">
                        F: {Math.round(dayTotals.fat)}g
                      </Text>
                    </View>
                  ) : null;
                })()}

                {/* Meal type rows */}
                {MEAL_TYPES.map((mealType) => {
                  const mealSlots = slots.filter((s: any) => s.mealType === mealType);
                  const mealIcon = mealType === 'breakfast' ? '🍳' : mealType === 'lunch' ? '🥗' : mealType === 'dinner' ? '🍽️' : '🍎';

                  return (
                    <View key={mealType} className="flex-row items-start py-2 border-t border-cream-deeper">
                      <Text className="text-xs text-brown font-sans-semibold w-20 pt-1">{mealIcon} {mealType.charAt(0).toUpperCase() + mealType.slice(1)}</Text>
                      <View className="flex-1 flex-row flex-wrap gap-2">
                        {mealSlots.map((slot: any) => (
                          <TouchableOpacity
                            key={slot.id}
                            className={`rounded-xl px-3 py-2 flex-row items-center ${slot.isCompleted ? 'bg-orange-light border-2 border-orange-soft' : 'bg-primary-50 border-2 border-primary-200'}`}
                            onPress={() => openEditSlotModal(slot)}
                          >
                            <View className="flex-1">
                              <Text
                                className={`text-sm font-sans-medium ${slot.isCompleted ? 'text-warm-soft' : 'text-primary-700'}`}
                                numberOfLines={1}
                              >
                                {slot.recipe?.title || slot.customName || 'Meal'}
                              </Text>
                              {slot.isCompleted && (
                                <View className="bg-orange-light self-start px-2 py-0.5 rounded-md mt-1">
                                  <Text className="text-xs font-sans-bold text-orange-dark">✓ Logged</Text>
                                </View>
                              )}
                            </View>
                            {slot.servings && slot.servings > 1 && (
                              <View className={`ml-2 rounded-lg px-2 py-1 ${slot.isCompleted ? 'bg-cream-deeper' : 'bg-primary-200'}`}>
                                <Text className={`text-xs font-sans-bold ${slot.isCompleted ? 'text-warm-soft' : 'text-primary-800'}`}>{slot.servings}x</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          className="w-8 h-8 rounded-full bg-cream-dark border-2 border-cream-deeper items-center justify-center"
                          onPress={() => openAddMeal(date, mealType)}
                        >
                          <Ionicons name="add" size={18} color="#B8A68E" />
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
          <Text className="ml-2 text-white font-sans-semibold text-sm">Smart Meal Prep</Text>
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

      {/* ===== Edit Slot Modal ===== */}
      <EditSlotModal
        editSlotModal={editSlotModal}
        onClose={() => setEditSlotModal(null)}
        editServings={editServings}
        setEditServings={setEditServings}
        editMealType={editMealType}
        setEditMealType={setEditMealType}
        savingSlot={savingSlot}
        onSaveSlotEdits={handleSaveSlotEdits}
        onQuickLog={handleQuickLogFromEdit}
        onEditLog={handleEditLogFromEdit}
        onUndoCompleted={handleUndoCompleted}
        onDelete={handleDeleteFromEdit}
      />

      {/* ===== Edit & Log Modal ===== */}
      <LogMealModal
        logMealModal={logMealModal}
        onClose={() => setLogMealModal(null)}
        logCalories={logCalories}
        setLogCalories={setLogCalories}
        logCaloriesError={logCaloriesError}
        setLogCaloriesError={setLogCaloriesError}
        logProtein={logProtein}
        setLogProtein={setLogProtein}
        logProteinError={logProteinError}
        setLogProteinError={setLogProteinError}
        logCarbs={logCarbs}
        setLogCarbs={setLogCarbs}
        logCarbsError={logCarbsError}
        setLogCarbsError={setLogCarbsError}
        logFat={logFat}
        setLogFat={setLogFat}
        logFatError={logFatError}
        setLogFatError={setLogFatError}
        savingLog={savingLog}
        onSave={handleSaveEditLog}
      />

      {/* ===== Create Plan Modal ===== */}
      <CreatePlanModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        createName={createName}
        setCreateName={setCreateName}
        createType={createType}
        setCreateType={setCreateType}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
        weekDates={weekDates}
        creating={creating}
        onCreatePlan={handleCreatePlan}
      />

      {/* ===== Plan Settings Modal ===== */}
      <PlanSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settingsName={settingsName}
        setSettingsName={setSettingsName}
        settingsStart={settingsStart}
        setSettingsStart={setSettingsStart}
        settingsEnd={settingsEnd}
        setSettingsEnd={setSettingsEnd}
        isPlanWeekdaysOnly={!!isPlanWeekdaysOnly}
        savingSettings={savingSettings}
        onSaveSettings={handleSaveSettings}
        onDeletePlan={handleDeletePlan}
      />

      {/* ===== Add Recipe Modal ===== */}
      <AddRecipeModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        selectedMealType={selectedMealType}
        selectedDay={selectedDay}
        selectedServings={selectedServings}
        setSelectedServings={setSelectedServings}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        recipes={recipes}
        onAddSlot={handleAddSlot}
      />
    </View>
  );
}
