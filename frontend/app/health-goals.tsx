import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { healthGoalsApi, nutritionApi } from '../src/services/api';
import { ScreenHeader } from '../src/components/ui/ScreenHeader';
import { LineChart } from 'react-native-chart-kit';
import { getTodayLocal, formatLocalDate } from '../src/utils/dateUtils';

import {
  PRIMARY_GOALS, TRACKING_GOALS, ALL_GOAL_DEFS, MAX_PRIMARY_GOALS,
  DAY_NAMES, CARD_SHADOW,
  getWeekDates, getMonthGrid, getMotivation,
  validateTargetValue, validateWeight, validateMacro,
} from '../src/components/health/nutritionHelpers';
import GoalFormModal from '../src/components/health/GoalFormModal';
import { resetFoodLogReminder } from '../src/services/notifications';
import MealLogModal from '../src/components/health/MealLogModal';
import ConfirmDialogs from '../src/components/health/ConfirmDialogs';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function HealthGoalsScreen() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayTotals, setTodayTotals] = useState<any>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [weeklyAvg, setWeeklyAvg] = useState<any>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Add/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add-primary' | 'add-tracking' | 'edit'>('add-primary');
  const [editGoal, setEditGoal] = useState<any>(null);
  const [selectedGoalType, setSelectedGoalType] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetValueError, setTargetValueError] = useState('');
  const [confirmDeleteGoal, setConfirmDeleteGoal] = useState<any>(null);

  // Weight goal creation extras
  const [startingWeightInput, setStartingWeightInput] = useState('');
  const [startingWeightError, setStartingWeightError] = useState('');
  const [targetDateInput, setTargetDateInput] = useState('');

  // Log Meal modal state
  const [showLogMealModal, setShowLogMealModal] = useState(false);
  const [logMealType, setLogMealType] = useState('lunch');
  const [logMealName, setLogMealName] = useState('');
  const [logCalories, setLogCalories] = useState('');
  const [logCaloriesError, setLogCaloriesError] = useState('');
  const [logProtein, setLogProtein] = useState('');
  const [logProteinError, setLogProteinError] = useState('');
  const [logCarbs, setLogCarbs] = useState('');
  const [logCarbsError, setLogCarbsError] = useState('');
  const [logFat, setLogFat] = useState('');
  const [logFatError, setLogFatError] = useState('');
  const [savingMeal, setSavingMeal] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [estimating, setEstimating] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [deleteMealConfirm, setDeleteMealConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteWeightConfirm, setDeleteWeightConfirm] = useState<{ id: string; date: string } | null>(null);

  // Weight tracking state
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [weightStats, setWeightStats] = useState<any>(null);
  const [showLogWeightModal, setShowLogWeightModal] = useState(false);
  const [logWeightValue, setLogWeightValue] = useState('');
  const [logWeightValueError, setLogWeightValueError] = useState('');
  const [logWeightDate, setLogWeightDate] = useState('');
  const [logWeightNotes, setLogWeightNotes] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);

  // Calendar state
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calendarData, setCalendarData] = useState<Record<string, any>>({});

  const todayStr = getTodayLocal();
  const isToday = selectedDate === todayStr;

  const formatDateLabel = (dateStr: string) => {
    if (dateStr === todayStr) return 'Today';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const shiftDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const iso = formatLocalDate(dt);
    if (iso > todayStr) return;
    setSelectedDate(iso);
  };

  // ─── Data fetching ─────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [goalsData, progressData] = await Promise.all([
        healthGoalsApi.getGoals(),
        healthGoalsApi.getProgress(),
      ]);
      setGoals(goalsData.goals.filter((g: any) => g.isActive));
      setWeeklyAvg(progressData.weeklyAvg);

      try {
        const dailyData = await nutritionApi.getDailyNutrition(selectedDate);
        setTodayTotals(dailyData.totals);
        setTodayMeals(dailyData.meals || []);
      } catch {}

      // Fetch weight logs if weight goal exists
      const hasWeightGoal = goalsData.goals.some((g: any) => g.isActive && g.goalType === 'weight');
      if (hasWeightGoal) {
        try {
          const wData = await healthGoalsApi.getWeightLogs(90);
          setWeightLogs(wData.logs);
          setWeightStats(wData.stats);
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load health goals:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch calendar data
  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        // For week view spanning two months, fetch both
        const [yr, mo] = calendarMonth.split('-').map(Number);
        const data = await healthGoalsApi.getCalendarData(calendarMonth);
        setCalendarData(prev => ({ ...prev, ...data.days }));

        // Also fetch adjacent month if week view could span
        const prevMonth = mo === 1 ? `${yr - 1}-12` : `${yr}-${String(mo - 1).padStart(2, '0')}`;
        const nextMonth = mo === 12 ? `${yr + 1}-01` : `${yr}-${String(mo + 1).padStart(2, '0')}`;
        try {
          const [prevData, nextData] = await Promise.all([
            healthGoalsApi.getCalendarData(prevMonth),
            healthGoalsApi.getCalendarData(nextMonth),
          ]);
          setCalendarData(prev => ({ ...prev, ...prevData.days, ...nextData.days }));
        } catch {}
      } catch {}
    };
    fetchCalendar();
  }, [calendarMonth]);

  // Update calendarMonth when selectedDate changes
  useEffect(() => {
    const newMonth = selectedDate.substring(0, 7);
    if (newMonth !== calendarMonth) setCalendarMonth(newMonth);
  }, [selectedDate]);

  // Derived lists
  const primaryGoals = goals.filter(g => PRIMARY_GOALS.some(p => p.key === g.goalType));
  const trackingGoals = goals.filter(g => TRACKING_GOALS.some(t => t.key === g.goalType));
  const weightGoal = goals.find(g => g.goalType === 'weight');
  const macroTrackingGoals = trackingGoals.filter(g => g.goalType !== 'weight');

  // ─── Add/Edit/Delete ──────────────────────────────────────────────────

  const openAddPrimary = () => {
    if (primaryGoals.length >= MAX_PRIMARY_GOALS) {
      Alert.alert('Limit Reached', `You can have at most ${MAX_PRIMARY_GOALS} primary goals. Remove one first.`);
      return;
    }
    setModalMode('add-primary');
    setSelectedGoalType('');
    setTargetValue('');
    setEditGoal(null);
    setShowModal(true);
  };

  const openAddTracking = () => {
    setModalMode('add-tracking');
    setSelectedGoalType('');
    setTargetValue('');
    setStartingWeightInput('');
    setTargetDateInput('');
    setEditGoal(null);
    setShowModal(true);
  };

  const openEditGoal = (goal: any) => {
    setModalMode('edit');
    setEditGoal(goal);
    setSelectedGoalType(goal.goalType);
    setTargetValue(goal.targetValue ? String(goal.targetValue) : '');
    setShowModal(true);
  };

  const handleSave = async () => {
    // Check for validation errors
    if (targetValueError || startingWeightError) {
      Alert.alert('Invalid Input', 'Please fix the errors before saving.');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'edit' && editGoal) {
        const isTracking = TRACKING_GOALS.some(t => t.key === editGoal.goalType);
        if (isTracking) {
          await healthGoalsApi.updateGoal(editGoal.id, {
            targetValue: parseFloat(targetValue),
          });
        }
      } else {
        if (!selectedGoalType) return;
        if (goals.some(g => g.goalType === selectedGoalType)) {
          Alert.alert('Already Active', 'This goal is already active.');
          setSaving(false);
          return;
        }
        const trackingDef = TRACKING_GOALS.find(t => t.key === selectedGoalType);
        if (trackingDef && !targetValue.trim()) {
          setSaving(false);
          return;
        }

        // Weight goal — need starting weight
        if (selectedGoalType === 'weight') {
          if (!startingWeightInput.trim()) {
            Alert.alert('Required', 'Please enter your starting weight.');
            setSaving(false);
            return;
          }
          await healthGoalsApi.createGoal({
            goalType: 'weight',
            targetValue: parseFloat(targetValue),
            unit: 'lbs',
            startingWeight: parseFloat(startingWeightInput),
            startWeightDate: getTodayLocal(),
            targetDate: targetDateInput.trim() || undefined,
          });
        } else {
          await healthGoalsApi.createGoal({
            goalType: selectedGoalType,
            targetValue: trackingDef ? parseFloat(targetValue) : 1,
            unit: trackingDef?.unit ?? undefined,
          });
        }
      }
      setShowModal(false);
      setTargetValue('');
      setTargetValueError('');
      setEditGoal(null);
      setStartingWeightInput('');
      setStartingWeightError('');
      setTargetDateInput('');
      fetchData();
    } catch (err) {
      console.error('Failed to save goal:', err);
      Alert.alert('Error', 'Failed to save goal.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (goal: any) => {
    setConfirmDeleteGoal(goal);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteGoal) return;
    const goalId = confirmDeleteGoal.id;
    setConfirmDeleteGoal(null);
    try {
      await healthGoalsApi.deleteGoal(goalId);
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to delete goal.');
    }
  };

  // ─── Log Meal ───────────────────────────────────────────────────────────

  const openLogMeal = (meal?: any) => {
    if (meal) {
      setEditingMealId(meal.id);
      setEditingNotes(meal.notes || null);
      setLogMealType(meal.mealType || 'lunch');
      setLogMealName(meal.mealName || '');
      setLogCalories(meal.calories ? String(meal.calories) : '');
      setLogProtein(meal.proteinGrams ? String(meal.proteinGrams) : '');
      setLogCarbs(meal.carbsGrams ? String(meal.carbsGrams) : '');
      setLogFat(meal.fatGrams ? String(meal.fatGrams) : '');
    } else {
      setEditingMealId(null);
      setEditingNotes(null);
      setLogMealType('lunch');
      setLogMealName('');
      setLogCalories('');
      setLogProtein('');
      setLogCarbs('');
      setLogFat('');
    }
    setLogCaloriesError('');
    setLogProteinError('');
    setLogCarbsError('');
    setLogFatError('');
    setSearchResults([]);
    setSelectedRecipe(null);
    setEstimating(false);
    setShowLogMealModal(true);
  };

  const handleMealNameChange = (text: string) => {
    setLogMealName(text);
    setSelectedRecipe(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (text.trim().length < 2) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const { recipes } = await nutritionApi.searchRecipes(text.trim());
        setSearchResults(recipes);
      } catch { setSearchResults([]); }
    }, 400);
  };

  const selectRecipeResult = (recipe: any) => {
    setSelectedRecipe(recipe);
    setLogMealName(recipe.title);
    setSearchResults([]);
    const n = recipe.nutrition;
    if (n) {
      setLogCalories(n.calories ? String(Math.round(n.calories)) : '');
      setLogProtein(n.protein ? String(Math.round(n.protein)) : '');
      setLogCarbs(n.carbs ? String(Math.round(n.carbs)) : '');
      setLogFat(n.fat ? String(Math.round(n.fat)) : '');
    }
  };

  const handleEstimateWithAI = async () => {
    if (!logMealName.trim() || logMealName.trim().length < 3) return;
    setEstimating(true);
    try {
      const result = await nutritionApi.estimateNutrition(logMealName.trim());
      setLogMealName(result.mealName || logMealName);
      setLogCalories(result.calories ? String(result.calories) : '');
      setLogProtein(result.protein ? String(result.protein) : '');
      setLogCarbs(result.carbs ? String(result.carbs) : '');
      setLogFat(result.fat ? String(result.fat) : '');
      setSelectedRecipe({ title: result.mealName, _estimated: true });
      setSearchResults([]);
    } catch {
      Alert.alert('Error', 'Failed to estimate nutrition. Try entering values manually.');
    } finally {
      setEstimating(false);
    }
  };

  const handleLogMeal = async (_ingredients?: string[], notes?: string) => {
    if (!logMealName.trim()) return;

    // Check for validation errors
    if (logCaloriesError || logProteinError || logCarbsError || logFatError) {
      Alert.alert('Invalid Input', 'Please fix the errors before saving.');
      return;
    }

    setSavingMeal(true);
    try {
      if (editingMealId) {
        await nutritionApi.updateMeal(editingMealId, {
          mealType: logMealType,
          mealName: logMealName.trim(),
          calories: logCalories ? parseInt(logCalories) : null,
          protein: logProtein ? parseFloat(logProtein) : null,
          carbs: logCarbs ? parseFloat(logCarbs) : null,
          fat: logFat ? parseFloat(logFat) : null,
        });
      } else {
        await nutritionApi.logMeal({
          mealType: logMealType,
          mealDate: selectedDate,
          mealTime: new Date().toISOString(),
          mealName: logMealName.trim(),
          calories: logCalories ? parseInt(logCalories) : undefined,
          protein: logProtein ? parseFloat(logProtein) : undefined,
          carbs: logCarbs ? parseFloat(logCarbs) : undefined,
          fat: logFat ? parseFloat(logFat) : undefined,
          notes,
        });
      }
      resetFoodLogReminder().catch(() => {});
      setShowLogMealModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to save meal:', err);
      const errorMessage = err?.response?.data?.message
        || err?.response?.data?.error
        || 'Failed to save meal. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setSavingMeal(false);
    }
  };

  const handleDeleteMeal = (mealId: string, mealName: string) => {
    if (Platform.OS === 'web') {
      setDeleteMealConfirm({ id: mealId, name: mealName });
    } else {
      Alert.alert('Delete Meal', `Remove "${mealName}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteMeal(mealId) },
      ]);
    }
  };

  const confirmDeleteMeal = async (mealId: string) => {
    setDeleteMealConfirm(null);
    try { await nutritionApi.deleteMeal(mealId); fetchData(); } catch { Alert.alert('Error', 'Failed to delete meal.'); }
  };

  // ─── Weight log handlers ──────────────────────────────────────────────

  const openLogWeight = () => {
    setLogWeightValue('');
    setLogWeightValueError('');
    setLogWeightDate(todayStr);
    setLogWeightNotes('');
    setShowLogWeightModal(true);
  };

  const handleLogWeight = async () => {
    if (!logWeightValue.trim()) return;

    // Check for validation errors
    if (logWeightValueError) {
      Alert.alert('Invalid Input', 'Please enter a valid weight between 50-500 lbs.');
      return;
    }

    setSavingWeight(true);
    try {
      await healthGoalsApi.logWeight({
        weight: parseFloat(logWeightValue),
        unit: 'lbs',
        logDate: logWeightDate || todayStr,
        notes: logWeightNotes.trim() || undefined,
      });
      setShowLogWeightModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to log weight:', err);
      Alert.alert('Error', 'Failed to log weight.');
    } finally {
      setSavingWeight(false);
    }
  };

  const handleDeleteWeightLog = (logId: string, dateLabel: string) => {
    if (Platform.OS === 'web') {
      setDeleteWeightConfirm({ id: logId, date: dateLabel });
    } else {
      Alert.alert('Delete Entry', `Remove weight entry from ${dateLabel}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteWeight(logId) },
      ]);
    }
  };

  const confirmDeleteWeight = async (logId: string) => {
    setDeleteWeightConfirm(null);
    try { await healthGoalsApi.deleteWeightLog(logId); fetchData(); } catch { Alert.alert('Error', 'Failed to delete weight entry.'); }
  };

  // ─── Progress helpers ──────────────────────────────────────────────────

  const getProgress = (goalType: string, target: number) => {
    const macroMap: Record<string, string> = { calories: 'calories', protein: 'protein', carbs: 'carbs', fat: 'fat' };
    const key = macroMap[goalType];
    if (!key) return { current: 0, percent: 0, rawPercent: 0, isOver: false, overAmount: 0, isMacro: false };
    const current = todayTotals[key] || 0;
    const rawPercent = target > 0 ? (current / target) * 100 : 0;
    const percent = Math.min(rawPercent, 100);
    const isOver = rawPercent > 100;
    const overAmount = isOver ? Math.round(current - target) : 0;
    return { current, percent, rawPercent, isOver, overAmount, isMacro: true };
  };

  // ─── Calendar helpers ──────────────────────────────────────────────────

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const shiftWeek = (dir: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + dir * 7);
    const iso = formatLocalDate(dt);
    if (iso > todayStr) return;
    setSelectedDate(iso);
  };

  const shiftMonth = (dir: number) => {
    const [yr, mo] = calendarMonth.split('-').map(Number);
    const newDate = new Date(yr, mo - 1 + dir, 1);
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    setCalendarMonth(newMonth);
  };

  const monthGrid = useMemo(() => {
    const [yr, mo] = calendarMonth.split('-').map(Number);
    return getMonthGrid(yr, mo);
  }, [calendarMonth]);

  const getCalendarDotColor = (dateStr: string) => {
    const d = calendarData[dateStr];
    if (!d || (d.calories === 0 && d.protein === 0)) return null; // no data

    // Gather all active macro goals
    const macroGoals: { type: string; target: number; actual: number }[] = [];
    const calGoal = goals.find(g => g.goalType === 'calories' && g.isActive);
    const protGoal = goals.find(g => g.goalType === 'protein' && g.isActive);
    const carbGoal = goals.find(g => g.goalType === 'carbs' && g.isActive);
    const fatGoal = goals.find(g => g.goalType === 'fat' && g.isActive);
    if (calGoal) macroGoals.push({ type: 'calories', target: calGoal.targetValue, actual: d.calories });
    if (protGoal) macroGoals.push({ type: 'protein', target: protGoal.targetValue, actual: d.protein });
    if (carbGoal) macroGoals.push({ type: 'carbs', target: carbGoal.targetValue, actual: d.carbs });
    if (fatGoal) macroGoals.push({ type: 'fat', target: fatGoal.targetValue, actual: d.fat });

    if (macroGoals.length === 0) return '#D4652E'; // has data, no goals to compare — orange

    // For each goal, compute how close actual is to target (% of target achieved)
    // For "limit" goals (calories, carbs, fat): being under/at target is good, over is bad
    // For "minimum" goals (protein): being at/above target is good, under is bad
    const scores = macroGoals.map(g => {
      const ratio = g.target > 0 ? g.actual / g.target : 0;
      if (g.type === 'protein') {
        // Protein: want to meet or exceed — score by how close to 100%+
        return ratio; // 1.0 = perfect, <1.0 = under
      }
      // Calories/carbs/fat: want to stay under — score inversely
      // ratio <= 1.0 = good, > 1.0 = over
      return ratio <= 1.0 ? 1.0 : 2.0 - ratio; // maps 1.0->1.0, 1.15->0.85, 1.3->0.7
    });

    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Green: within 15% of goals (avgScore >= 0.85)
    // Yellow: within 30% (avgScore >= 0.70)
    // Red: below 30% (avgScore < 0.70)
    if (avgScore >= 0.85) return '#D4652E'; // orange
    if (avgScore >= 0.70) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  // ─── Weight chart data ──────────────────────────────────────────────────

  const chartData = useMemo(() => {
    if (weightLogs.length < 2) return null;
    const last30 = weightLogs.slice(-30);
    const labels = last30.map((l: any) => {
      const d = new Date(l.logDate);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    // Show at most 6 labels
    const step = Math.max(1, Math.floor(labels.length / 5));
    const displayLabels = labels.map((l: string, i: number) => i % step === 0 || i === labels.length - 1 ? l : '');
    return {
      labels: displayLabels,
      datasets: [{ data: last30.map((l: any) => l.weight), color: () => '#D4652E', strokeWidth: 2 }],
    };
  }, [weightLogs]);

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator size="large" color="#D4652E" />
      </View>
    );
  }

  const activePrimaryKeys = new Set(primaryGoals.map(g => g.goalType));
  const activeTrackingKeys = new Set(trackingGoals.map(g => g.goalType));

  // Weight goal progress calc
  const wStart = weightGoal?.startingWeight ?? weightStats?.startWeight;
  const wCurrent = weightStats?.currentWeight ?? weightGoal?.currentValue;
  const wTarget = weightGoal?.targetValue;
  const wTotalGoal = wStart != null && wTarget != null ? Math.abs(wStart - wTarget) : 0;
  const wLost = wStart != null && wCurrent != null ? Math.abs(wStart - wCurrent) : 0;
  const wPercent = wTotalGoal > 0 ? Math.min((wLost / wTotalGoal) * 100, 100) : 0;
  const wGoalReached = wCurrent != null && wTarget != null && (
    wStart > wTarget ? wCurrent <= wTarget : wCurrent >= wTarget
  );
  const motivation = weightGoal ? getMotivation(wPercent, wGoalReached) : null;

  // Calendar month label
  const [cmYear, cmMonth] = calendarMonth.split('-').map(Number);
  const calMonthLabel = new Date(cmYear, cmMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const MEAL_EMOJIS: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍪' };

  // Calorie goal for ring
  const calorieGoal = goals.find(g => g.goalType === 'calories' && g.isActive);
  const calorieTarget = calorieGoal?.targetValue || 2000;
  const caloriePercent = calorieTarget > 0 ? Math.min((todayTotals.calories / calorieTarget) * 100, 100) : 0;
  const calorieRemaining = Math.max(0, calorieTarget - todayTotals.calories);

  // Macro goals for bars
  const proteinGoal = goals.find(g => g.goalType === 'protein' && g.isActive);
  const carbsGoal = goals.find(g => g.goalType === 'carbs' && g.isActive);
  const fatGoal = goals.find(g => g.goalType === 'fat' && g.isActive);

  return (
    <View className="flex-1 bg-cream">
      {/* Header — warm dark */}
      <ScreenHeader title="My Nutrition" onBack={() => router.push('/(tabs)/profile')} />

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ─── Calendar Strip ─────────────────────────────────────────── */}
        <View className="flex-row justify-between px-4 pt-3 pb-1">
          {weekDates.map((dateStr) => {
            const d = new Date(dateStr + 'T12:00:00');
            const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const dayNum = parseInt(dateStr.split('-')[2]);
            const isSelected = dateStr === selectedDate;
            const isTodayCell = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            const dotColor = getCalendarDotColor(dateStr);
            return (
              <TouchableOpacity
                key={dateStr}
                className="items-center py-2 px-1.5 rounded-xl"
                style={[
                  isSelected ? { backgroundColor: '#D4652E' } : {},
                  isTodayCell && !isSelected ? { backgroundColor: '#FFF0E8' } : {},
                ]}
                onPress={() => !isFuture && setSelectedDate(dateStr)}
                disabled={isFuture}
              >
                <Text
                  className="text-[11px] font-sans-medium mb-1"
                  style={{ color: isSelected ? 'rgba(255,251,245,0.75)' : isTodayCell ? '#D4652E' : '#8B7355', letterSpacing: 0.4 }}
                >
                  {dayLabel}
                </Text>
                <Text
                  className="text-base font-sans-semibold"
                  style={{ color: isSelected ? '#FFFBF5' : isTodayCell ? '#D4652E' : isFuture ? '#B8A68E' : '#2D2520' }}
                >
                  {dayNum}
                </Text>
                <View className="flex-row mt-0.5 gap-0.5" style={{ height: 5, alignItems: 'center' }}>
                  {dotColor && <View className="w-1 h-1 rounded-full" style={{ backgroundColor: isSelected ? 'rgba(255,251,245,0.7)' : dotColor }} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Week navigation + month toggle */}
        <View className="flex-row items-center justify-between px-4 pb-2">
          <TouchableOpacity onPress={() => shiftWeek(-1)} className="p-1">
            <Ionicons name="chevron-back" size={16} color="#8B7355" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCalendarMode(calendarMode === 'week' ? 'month' : 'week')}
            className="px-2 py-0.5"
          >
            <Text className="text-[10px] font-sans-semibold text-brown">
              {calendarMode === 'week' ? 'View Month' : 'View Week'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => shiftWeek(1)} className="p-1">
            <Ionicons name="chevron-forward" size={16} color="#8B7355" />
          </TouchableOpacity>
        </View>

        {/* Month view (hidden by default) */}
        {calendarMode === 'month' && (
          <View className="mx-4 bg-white rounded-xl p-3 mb-2" style={CARD_SHADOW}>
            <View className="flex-row items-center justify-between mb-2">
              <TouchableOpacity onPress={() => shiftMonth(-1)} className="p-1">
                <Ionicons name="chevron-back" size={18} color="#2D2520" />
              </TouchableOpacity>
              <Text className="text-xs font-sans-semibold text-brown">{calMonthLabel}</Text>
              <TouchableOpacity onPress={() => shiftMonth(1)} className="p-1">
                <Ionicons name="chevron-forward" size={18} color="#2D2520" />
              </TouchableOpacity>
            </View>
            <View className="flex-row mb-1">
              {DAY_NAMES.map((name, i) => (
                <View key={i} className="flex-1 items-center">
                  <Text className="text-[10px] font-sans-semibold text-brown-light">{name}</Text>
                </View>
              ))}
            </View>
            {monthGrid.map((row, ri) => (
              <View key={ri} className="flex-row">
                {row.map((dateStr, ci) => {
                  if (!dateStr) return <View key={ci} className="flex-1 py-1" />;
                  const day = parseInt(dateStr.split('-')[2]);
                  const isSel = dateStr === selectedDate;
                  const isTodayC = dateStr === todayStr;
                  const isFut = dateStr > todayStr;
                  const dColor = getCalendarDotColor(dateStr);
                  return (
                    <TouchableOpacity
                      key={ci}
                      className="flex-1 items-center py-1"
                      onPress={() => !isFut && setSelectedDate(dateStr)}
                      disabled={isFut}
                    >
                      <View
                        className="w-7 h-7 rounded-full items-center justify-center"
                        style={[
                          isTodayC && !isSel ? { backgroundColor: '#FFF7F0' } : {},
                          isSel ? { backgroundColor: '#D4652E' } : {},
                        ]}
                      >
                        <Text className={`text-[10px] font-sans-semibold ${isSel ? 'text-white' : isFut ? 'text-brown-light' : 'text-warm-dark'}`}>
                          {day}
                        </Text>
                      </View>
                      <View className="flex-row mt-0.5 gap-0.5">
                        {dColor && <View className="w-1 h-1 rounded-full" style={{ backgroundColor: dColor }} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* ─── Daily Nutrition Summary Card ─────────────────────────── */}
        <View className="mx-4 mt-3 bg-white rounded-2xl p-5" style={CARD_SHADOW}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-serif-bold text-warm-dark">Daily Summary</Text>
            <Text className="text-xs font-sans text-brown">{formatDateLabel(selectedDate)}</Text>
          </View>

          <View className="flex-row items-center">
            {/* Calorie Ring */}
            <View style={{ width: 90, height: 90, marginRight: 20, position: 'relative' }}>
              <View style={{ transform: [{ rotate: '-90deg' }] }}>
                {/* Background circle */}
                <View style={{
                  width: 90, height: 90, borderRadius: 45,
                  borderWidth: 9, borderColor: '#EDE5DA',
                  position: 'absolute',
                }} />
                {/* Progress arc — approximated with border */}
                <View style={{
                  width: 90, height: 90, borderRadius: 45,
                  borderWidth: 9, borderColor: 'transparent',
                  borderTopColor: '#D4652E',
                  borderRightColor: caloriePercent > 25 ? '#D4652E' : 'transparent',
                  borderBottomColor: caloriePercent > 50 ? '#D4652E' : 'transparent',
                  borderLeftColor: caloriePercent > 75 ? '#D4652E' : 'transparent',
                }} />
              </View>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <Text className="font-sans-bold text-warm-dark" style={{ fontSize: 19, lineHeight: 22 }}>
                  {todayTotals.calories.toLocaleString()}
                </Text>
                <Text className="font-sans-medium text-brown" style={{ fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  kcal
                </Text>
              </View>
            </View>

            {/* Macro Bars */}
            <View className="flex-1" style={{ gap: 10 }}>
              {[
                { name: 'Protein', current: Math.round(todayTotals.protein), target: proteinGoal?.targetValue },
                { name: 'Carbs', current: Math.round(todayTotals.carbs), target: carbsGoal?.targetValue },
                { name: 'Fat', current: Math.round(todayTotals.fat), target: fatGoal?.targetValue },
              ].map(macro => {
                const hasGoal = macro.target != null && macro.target > 0;
                const pct = hasGoal ? Math.min((macro.current / macro.target!) * 100, 100) : 0;
                return (
                  <View key={macro.name}>
                    <View className="flex-row justify-between items-baseline mb-1">
                      <Text className="text-xs font-sans-medium text-warm-dark">{macro.name}</Text>
                      <Text className="text-[11px] font-sans text-brown">
                        {macro.current}g{hasGoal ? ` / ${macro.target}g` : ''}
                      </Text>
                    </View>
                    {hasGoal && (
                      <View className="h-1.5 bg-cream-dark rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: '#D4652E' }}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
              {calorieTarget > 0 && (
                <Text className="text-[11px] font-sans text-brown mt-1">
                  Goal: {calorieTarget.toLocaleString()} kcal · <Text style={{ color: '#D4652E', fontWeight: '600' }}>{calorieRemaining.toLocaleString()} remaining</Text>
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <View className="mx-4 mt-2 bg-orange-light rounded-xl px-3 py-2">
          <Text className="text-[10px] text-brown font-sans leading-[14px]">
            ⓘ These are estimates — validate and enter your own for the most accurate numbers.
          </Text>
        </View>

        {/* ─── Today's Meals ──────────────────────────────────────────── */}
        <View className="flex-row items-center justify-between mx-4 mt-4 mb-2">
          <Text className="text-base font-serif-bold text-warm-dark">{isToday ? "Today's Meals" : `Meals — ${formatDateLabel(selectedDate)}`}</Text>
          <TouchableOpacity
            onPress={() => openLogMeal()}
            className="flex-row items-center bg-orange-light px-3 py-1.5 rounded-xl"
            style={{ borderWidth: 1.5, borderColor: '#D4652E' }}
          >
            <Ionicons name="add" size={14} color="#D4652E" />
            <Text className="text-xs font-sans-semibold ml-1" style={{ color: '#D4652E' }}>Log a Meal</Text>
          </TouchableOpacity>
        </View>

        {todayMeals.length === 0 ? (
          <View className="mx-4 bg-white rounded-2xl p-5 items-center" style={CARD_SHADOW}>
            <Ionicons name="restaurant-outline" size={28} color="#B8A68E" />
            <Text className="text-brown-light text-sm mt-1 font-sans">No meals logged yet</Text>
          </View>
        ) : (
          todayMeals.map((meal: any, idx: number) => (
            <TouchableOpacity
              key={meal.id || idx}
              className="mx-4 mb-2 bg-white rounded-2xl p-3.5 flex-row items-center"
              style={CARD_SHADOW}
              onPress={() => openLogMeal(meal)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 22 }} className="mr-3">
                {MEAL_EMOJIS[meal.mealType] || '🍽️'}
              </Text>
              <View className="flex-1">
                <Text className="text-[11px] font-sans-medium text-brown uppercase" style={{ letterSpacing: 0.5 }}>
                  {meal.mealType}
                </Text>
                <Text className="text-sm font-sans-semibold text-warm-dark" numberOfLines={1}>
                  {meal.mealName || 'Meal'}
                </Text>
                <View className="flex-row mt-1" style={{ gap: 10 }}>
                  {meal.proteinGrams ? <Text className="text-xs font-sans text-brown">P: {Math.round(meal.proteinGrams)}g</Text> : null}
                  {meal.carbsGrams ? <Text className="text-xs font-sans text-brown">C: {Math.round(meal.carbsGrams)}g</Text> : null}
                  {meal.fatGrams ? <Text className="text-xs font-sans text-brown">F: {Math.round(meal.fatGrams)}g</Text> : null}
                </View>
              </View>
              <View className="flex-row items-center">
                {meal.calories ? (
                  <Text className="text-sm font-sans-semibold mr-2" style={{ color: '#D4652E' }}>{meal.calories}</Text>
                ) : null}
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); handleDeleteMeal(meal.id, meal.mealName || 'Meal'); }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="p-1"
                >
                  <Ionicons name="trash-outline" size={15} color="#B8A68E" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* ─── Primary Goals (Diet Preferences) ──────────────────────── */}
        <View className="flex-row items-center justify-between mx-4 mt-5 mb-1">
          <Text className="text-base font-serif-bold text-warm-dark">Primary Goals</Text>
          <TouchableOpacity onPress={openAddPrimary}>
            <Ionicons name="add-circle" size={24} color="#D4652E" />
          </TouchableOpacity>
        </View>

        {primaryGoals.length === 0 ? (
          <TouchableOpacity onPress={openAddPrimary} className="mx-4 bg-white rounded-2xl p-5 items-center border border-dashed border-cream-deeper" style={CARD_SHADOW}>
            <Ionicons name="nutrition-outline" size={32} color="#B8A68E" />
            <Text className="text-brown-light mt-2 text-sm font-sans">Tap to set a primary goal (e.g. High Protein)</Text>
          </TouchableOpacity>
        ) : (
          <View className="flex-row flex-wrap mx-4 mb-1" style={{ gap: 8 }}>
            {primaryGoals.map((goal: any) => {
              const def = PRIMARY_GOALS.find(p => p.key === goal.goalType);
              const goalEmojis: Record<string, string> = {
                'high-protein': '🔥', 'low-carb': '⬇️', 'keto': '⚡',
                'vegetarian': '🥗', 'vegan': '🌱', 'gluten-free': '🚫', 'dairy-free': '🥛',
              };
              return (
                <TouchableOpacity
                  key={goal.id}
                  className="flex-row items-center bg-orange-light px-3 py-1.5 rounded-full"
                  style={{ borderWidth: 1.5, borderColor: '#D4652E' }}
                  onPress={() => handleDelete(goal)}
                >
                  <Text className="text-xs mr-1">{goalEmojis[goal.goalType] || '🎯'}</Text>
                  <Text className="text-xs font-sans-semibold" style={{ color: '#D4652E' }}>
                    {def?.label || goal.goalType}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ─── Tracking Goals (Measurable Targets) ───────────────────── */}
        <View className="flex-row items-center justify-between mx-4 mt-4 mb-2">
          <Text className="text-base font-serif-bold text-warm-dark">Tracking Goals</Text>
          <TouchableOpacity onPress={openAddTracking}>
            <Ionicons name="add-circle" size={24} color="#D4652E" />
          </TouchableOpacity>
        </View>

        {macroTrackingGoals.length === 0 && !weightGoal ? (
          <TouchableOpacity onPress={openAddTracking} className="mx-4 bg-white rounded-2xl p-5 items-center border border-dashed border-cream-deeper" style={CARD_SHADOW}>
            <Ionicons name="analytics-outline" size={32} color="#B8A68E" />
            <Text className="text-brown-light mt-2 text-sm font-sans">Tap to add a tracking goal (e.g. 200g protein)</Text>
          </TouchableOpacity>
        ) : null}

        {/* Macro tracking goals — clean card style */}
        {macroTrackingGoals.map((goal: any) => {
          const def = TRACKING_GOALS.find(t => t.key === goal.goalType);
          const { current, percent, rawPercent, isOver, overAmount, isMacro } = getProgress(goal.goalType, goal.targetValue);

          return (
            <TouchableOpacity key={goal.id} onPress={() => openEditGoal(goal)} className="mx-4 mb-2 bg-white rounded-2xl p-4" style={CARD_SHADOW} activeOpacity={0.7}>
              <View className="flex-row items-baseline justify-between mb-2">
                <Text className="text-sm font-sans-semibold text-warm-dark">{def?.label || goal.goalType}</Text>
                <Text className="text-xs font-sans text-brown">
                  {isMacro ? `${current} / ${goal.targetValue}${goal.unit}` : `Target: ${goal.targetValue} ${goal.unit}`}
                </Text>
              </View>

              {isMacro && (
                <>
                  <View className="h-1.5 bg-cream-dark rounded-full overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${percent}%`, backgroundColor: isOver ? '#ef4444' : '#D4652E' }}
                    />
                  </View>
                  {isOver && (
                    <Text className="text-xs mt-1 font-sans" style={{ color: '#ef4444' }}>
                      Over by {overAmount} {goal.unit}
                    </Text>
                  )}
                </>
              )}
            </TouchableOpacity>
          );
        })}

        {/* ─── Weight Section ─────────────────────────────────────────── */}
        {weightGoal && (
          <>
          <View className="flex-row items-center justify-between mx-4 mt-4 mb-2">
            <Text className="text-base font-serif-bold text-warm-dark">Weight</Text>
            <TouchableOpacity onPress={openLogWeight}>
              <Text className="text-xs font-sans-semibold" style={{ color: '#D4652E' }}>+ Log</Text>
            </TouchableOpacity>
          </View>

          <View className="mx-4 mb-2 bg-white rounded-2xl p-4" style={CARD_SHADOW}>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-sans-semibold text-warm-dark">Weight Goal</Text>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity onPress={() => openEditGoal(weightGoal)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="pencil-outline" size={16} color="#B8A68E" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(weightGoal)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Progress header */}
            {wStart != null && wCurrent != null && wTarget != null && (
              <>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs text-brown-light font-sans">Starting: {wStart} lbs</Text>
                  <Text className="text-xs font-sans-semibold text-purple-600">Current: {wCurrent} lbs</Text>
                  <Text className="text-xs text-brown-light font-sans">Goal: {wTarget} lbs</Text>
                </View>
                <View className="h-2 bg-cream-dark rounded-full overflow-hidden mb-1">
                  <View className="h-full rounded-full" style={{ width: `${wPercent}%`, backgroundColor: '#D4652E' }} />
                </View>
                <Text className="text-xs text-brown font-sans mb-2">
                  {wLost.toFixed(1)} lbs {wStart > wTarget ? 'lost' : 'gained'} of {wTotalGoal.toFixed(1)} lbs goal — {Math.round(wPercent)}%
                </Text>
              </>
            )}

            {/* Motivational text */}
            {motivation && (
              <View className="flex-row items-center mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: `${motivation.color}10` }}>
                <Ionicons name={motivation.icon as any} size={16} color={motivation.color} />
                <Text className="text-xs font-sans-semibold ml-2" style={{ color: motivation.color }}>{motivation.text}</Text>
              </View>
            )}

            {/* Weight chart */}
            {chartData && (
              <View className="mb-3 -mx-1">
                <LineChart
                  data={chartData}
                  width={SCREEN_WIDTH - 56}
                  height={180}
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(212, 101, 46, ${opacity})`,
                    labelColor: () => '#B8A68E',
                    propsForDots: { r: '3', strokeWidth: '1', stroke: '#D4652E' },
                    propsForBackgroundLines: { stroke: '#F5EFE8' },
                  }}
                  bezier
                  style={{ borderRadius: 8 }}
                  withInnerLines={true}
                  withOuterLines={false}
                  fromZero={false}
                />
                {wTarget != null && (
                  <Text className="text-[10px] text-brown-light font-sans text-center mt-1">Goal: {wTarget} lbs (dashed line)</Text>
                )}
              </View>
            )}

            {/* Recent weigh-ins */}
            {weightLogs.length > 0 && (
              <>
                <Text className="text-xs font-sans-semibold text-brown mb-2">Recent Weigh-ins</Text>
                {weightLogs.slice(-5).reverse().map((log: any, idx: number) => {
                  const d = new Date(log.logDate);
                  const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  // Compute delta from previous
                  const allReversed = [...weightLogs].reverse();
                  const logIdx = allReversed.findIndex((l: any) => l.id === log.id);
                  const prev = logIdx < allReversed.length - 1 ? allReversed[logIdx + 1] : null;
                  const delta = prev ? log.weight - prev.weight : 0;
                  const isLoss = delta < 0;
                  return (
                    <View key={log.id} className="flex-row items-center py-1.5 border-t border-cream-deeper">
                      <Text className="text-xs font-sans text-brown w-16">{dateLabel}</Text>
                      <Text className="text-xs font-sans-semibold text-warm-dark flex-1">{log.weight} lbs</Text>
                      {delta !== 0 && (
                        <View className="flex-row items-center mr-2">
                          <Ionicons name={isLoss ? 'caret-down' : 'caret-up'} size={10} color={isLoss ? '#D4652E' : '#ef4444'} />
                          <Text className="text-[10px] font-sans-semibold ml-0.5" style={{ color: isLoss ? '#D4652E' : '#ef4444' }}>
                            {Math.abs(delta).toFixed(1)}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity onPress={() => handleDeleteWeightLog(log.id, dateLabel)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={14} color="#B8A68E" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}

            {/* Stats summary */}
            {weightStats && weightStats.streak > 0 && (
              <View className="flex-row items-center mt-2 px-3 py-1.5 bg-orange-light rounded-lg">
                <Ionicons name="flame" size={14} color="#D4652E" />
                <Text className="text-[10px] font-sans ml-1" style={{ color: '#D4652E' }}>{weightStats.streak}-day logging streak!</Text>
              </View>
            )}
          </View>
          </>
        )}
      </ScrollView>

      {/* ═══ Extracted Modals ═══ */}
      <GoalFormModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        modalMode={modalMode}
        editGoal={editGoal}
        selectedGoalType={selectedGoalType}
        setSelectedGoalType={setSelectedGoalType}
        targetValue={targetValue}
        setTargetValue={setTargetValue}
        targetValueError={targetValueError}
        setTargetValueError={setTargetValueError}
        startingWeightInput={startingWeightInput}
        setStartingWeightInput={setStartingWeightInput}
        startingWeightError={startingWeightError}
        setStartingWeightError={setStartingWeightError}
        targetDateInput={targetDateInput}
        setTargetDateInput={setTargetDateInput}
        saving={saving}
        onSave={handleSave}
        activePrimaryKeys={activePrimaryKeys}
        activeTrackingKeys={activeTrackingKeys}
        primaryGoalCount={primaryGoals.length}
      />

      <MealLogModal
        visible={showLogMealModal}
        onClose={() => setShowLogMealModal(false)}
        editingMealId={editingMealId}
        editingNotes={editingNotes}
        logMealType={logMealType}
        setLogMealType={setLogMealType}
        logMealName={logMealName}
        onMealNameChange={handleMealNameChange}
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
        savingMeal={savingMeal}
        onSave={handleLogMeal}
        searchResults={searchResults}
        selectedRecipe={selectedRecipe}
        onSelectRecipe={selectRecipeResult}
        estimating={estimating}
        onEstimateWithAI={handleEstimateWithAI}
      />

      <ConfirmDialogs
        showLogWeightModal={showLogWeightModal}
        onCloseLogWeight={() => setShowLogWeightModal(false)}
        logWeightValue={logWeightValue}
        setLogWeightValue={setLogWeightValue}
        logWeightValueError={logWeightValueError}
        setLogWeightValueError={setLogWeightValueError}
        logWeightDate={logWeightDate}
        setLogWeightDate={setLogWeightDate}
        logWeightNotes={logWeightNotes}
        setLogWeightNotes={setLogWeightNotes}
        savingWeight={savingWeight}
        onLogWeight={handleLogWeight}
        deleteMealConfirm={deleteMealConfirm}
        onCancelDeleteMeal={() => setDeleteMealConfirm(null)}
        onConfirmDeleteMeal={confirmDeleteMeal}
        deleteWeightConfirm={deleteWeightConfirm}
        onCancelDeleteWeight={() => setDeleteWeightConfirm(null)}
        onConfirmDeleteWeight={confirmDeleteWeight}
        confirmDeleteGoal={confirmDeleteGoal}
        onCancelDeleteGoal={() => setConfirmDeleteGoal(null)}
        onConfirmDeleteGoal={confirmDelete}
      />
    </View>
  );
}
