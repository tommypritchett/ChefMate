import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { healthGoalsApi, nutritionApi } from '../src/services/api';
import { LineChart } from 'react-native-chart-kit';

// ─── Goal Definitions ─────────────────────────────────────────────────────

const PRIMARY_GOALS = [
  { key: 'high-protein', label: 'High Protein', icon: 'barbell', color: '#3b82f6', description: 'Prioritize protein-rich foods & recipes' },
  { key: 'low-carb', label: 'Low Carb', icon: 'trending-down-outline', color: '#f97316', description: 'Reduce carbohydrates, favor low-carb options' },
  { key: 'keto', label: 'Keto', icon: 'flash-outline', color: '#8b5cf6', description: 'High fat, very low carb ketogenic diet' },
  { key: 'vegetarian', label: 'Vegetarian', icon: 'leaf', color: '#10b981', description: 'No meat, plant-based with dairy & eggs' },
  { key: 'vegan', label: 'Vegan', icon: 'leaf', color: '#059669', description: 'Fully plant-based, no animal products' },
  { key: 'gluten-free', label: 'Gluten Free', icon: 'ban-outline', color: '#ec4899', description: 'Avoid wheat, barley, rye' },
  { key: 'dairy-free', label: 'Dairy Free', icon: 'ban-outline', color: '#06b6d4', description: 'No milk, cheese, butter, cream' },
];

const TRACKING_GOALS = [
  { key: 'calories', label: 'Daily Calories', unit: 'kcal', icon: 'flame-outline', color: '#f59e0b', placeholder: 'e.g. 2000' },
  { key: 'protein', label: 'Daily Protein', unit: 'g', icon: 'barbell-outline', color: '#3b82f6', placeholder: 'e.g. 150' },
  { key: 'carbs', label: 'Daily Carbs', unit: 'g', icon: 'leaf-outline', color: '#f97316', placeholder: 'e.g. 200' },
  { key: 'fat', label: 'Daily Fat', unit: 'g', icon: 'water-outline', color: '#ef4444', placeholder: 'e.g. 65' },
  { key: 'weight', label: 'Target Weight', unit: 'lbs', icon: 'scale-outline', color: '#8b5cf6', placeholder: 'e.g. 160' },
];

const ALL_GOAL_DEFS = [...PRIMARY_GOALS.map(g => ({ ...g, hasTarget: false, unit: '' })), ...TRACKING_GOALS.map(g => ({ ...g, hasTarget: true }))];
const MAX_PRIMARY_GOALS = 2;
const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ─── Helpers ──────────────────────────────────────────────────────────────

function getWeekDates(dateStr: string): string[] {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dayOfWeek = dt.getDay(); // 0=Sun
  const start = new Date(dt);
  start.setDate(start.getDate() - dayOfWeek);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(start);
    dd.setDate(dd.getDate() + i);
    dates.push(dd.toISOString().split('T')[0]);
  }
  return dates;
}

function getMonthGrid(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const rows: (string | null)[][] = [];
  let row: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) row.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const str = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    row.push(str);
    if (row.length === 7) { rows.push(row); row = []; }
  }
  if (row.length > 0) { while (row.length < 7) row.push(null); rows.push(row); }
  return rows;
}

function getMotivation(percent: number, goalReached: boolean) {
  if (goalReached) return { text: 'Goal reached! Amazing work!', color: '#10b981', icon: 'trophy' as const };
  if (percent >= 90) return { text: "Almost there! You're so close!", color: '#10b981', icon: 'checkmark-circle' as const };
  if (percent >= 75) return { text: 'Incredible progress! The finish line is near!', color: '#3b82f6', icon: 'rocket' as const };
  if (percent >= 50) return { text: 'Over halfway! Keep the momentum going!', color: '#3b82f6', icon: 'trending-up' as const };
  if (percent >= 25) return { text: "Great start — you're building real momentum!", color: '#f59e0b', icon: 'flash' as const };
  return { text: 'Every step counts. Stay consistent!', color: '#6b7280', icon: 'footsteps' as const };
}

export default function HealthGoalsScreen() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayTotals, setTodayTotals] = useState<any>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [weeklyAvg, setWeeklyAvg] = useState<any>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Add/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add-primary' | 'add-tracking' | 'edit'>('add-primary');
  const [editGoal, setEditGoal] = useState<any>(null);
  const [selectedGoalType, setSelectedGoalType] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [confirmDeleteGoal, setConfirmDeleteGoal] = useState<any>(null);

  // Weight goal creation extras
  const [startingWeightInput, setStartingWeightInput] = useState('');
  const [targetDateInput, setTargetDateInput] = useState('');

  // Log Meal modal state
  const [showLogMealModal, setShowLogMealModal] = useState(false);
  const [logMealType, setLogMealType] = useState('lunch');
  const [logMealName, setLogMealName] = useState('');
  const [logCalories, setLogCalories] = useState('');
  const [logProtein, setLogProtein] = useState('');
  const [logCarbs, setLogCarbs] = useState('');
  const [logFat, setLogFat] = useState('');
  const [savingMeal, setSavingMeal] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [estimating, setEstimating] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);

  // Weight tracking state
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [weightStats, setWeightStats] = useState<any>(null);
  const [showLogWeightModal, setShowLogWeightModal] = useState(false);
  const [logWeightValue, setLogWeightValue] = useState('');
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

  const todayStr = new Date().toISOString().split('T')[0];
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
    const iso = dt.toISOString().split('T')[0];
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
            startWeightDate: new Date().toISOString().split('T')[0],
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
      setEditGoal(null);
      setStartingWeightInput('');
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
      setLogMealType(meal.mealType || 'lunch');
      setLogMealName(meal.mealName || '');
      setLogCalories(meal.calories ? String(meal.calories) : '');
      setLogProtein(meal.proteinGrams ? String(meal.proteinGrams) : '');
      setLogCarbs(meal.carbsGrams ? String(meal.carbsGrams) : '');
      setLogFat(meal.fatGrams ? String(meal.fatGrams) : '');
    } else {
      setEditingMealId(null);
      setLogMealType('lunch');
      setLogMealName('');
      setLogCalories('');
      setLogProtein('');
      setLogCarbs('');
      setLogFat('');
    }
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

  const handleLogMeal = async () => {
    if (!logMealName.trim()) return;
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
        });
      }
      setShowLogMealModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save meal:', err);
      Alert.alert('Error', 'Failed to save meal.');
    } finally {
      setSavingMeal(false);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    const doDelete = async () => {
      try { await nutritionApi.deleteMeal(mealId); fetchData(); } catch { Alert.alert('Error', 'Failed to delete meal.'); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Remove this meal?')) await doDelete();
    } else {
      Alert.alert('Delete Meal', 'Remove this meal?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // ─── Weight log handlers ──────────────────────────────────────────────

  const openLogWeight = () => {
    setLogWeightValue('');
    setLogWeightDate(todayStr);
    setLogWeightNotes('');
    setShowLogWeightModal(true);
  };

  const handleLogWeight = async () => {
    if (!logWeightValue.trim()) return;
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

  const handleDeleteWeightLog = async (logId: string) => {
    const doDelete = async () => {
      try { await healthGoalsApi.deleteWeightLog(logId); fetchData(); } catch { Alert.alert('Error', 'Failed to delete weight entry.'); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Remove this weight entry?')) await doDelete();
    } else {
      Alert.alert('Delete Entry', 'Remove this weight entry?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
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
    const iso = dt.toISOString().split('T')[0];
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

    if (macroGoals.length === 0) return '#10b981'; // has data, no goals to compare — green

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
    if (avgScore >= 0.85) return '#10b981'; // green
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
      datasets: [{ data: last30.map((l: any) => l.weight), color: () => '#10b981', strokeWidth: 2 }],
    };
  }, [weightLogs]);

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#10b981" />
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

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <Pressable onPress={() => router.back()} style={{ padding: 6, marginLeft: -6 }} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-800">My Nutrition</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Date Navigation Bar */}
      <View className="flex-row items-center justify-center px-4 py-2.5 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => shiftDate(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} className="p-1">
          <Ionicons name="chevron-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text className="text-sm font-semibold text-gray-800 mx-4 min-w-[120px] text-center">
          {formatDateLabel(selectedDate)}
        </Text>
        <TouchableOpacity onPress={() => shiftDate(1)} disabled={isToday} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} className="p-1">
          <Ionicons name="chevron-forward" size={22} color={isToday ? '#d1d5db' : '#374151'} />
        </TouchableOpacity>
        {!isToday && (
          <TouchableOpacity onPress={() => setSelectedDate(todayStr)} className="ml-3 bg-primary-50 px-3 py-1 rounded-full">
            <Text className="text-xs font-medium text-primary-600">Today</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ─── Calendar View ─────────────────────────────────────────── */}
        <View className="mx-4 mt-3 bg-white rounded-xl p-3">
          {/* Calendar header: mode toggle + navigation */}
          <View className="flex-row items-center justify-between mb-2">
            {calendarMode === 'week' ? (
              <>
                <TouchableOpacity onPress={() => shiftWeek(-1)} className="p-1">
                  <Ionicons name="chevron-back" size={18} color="#374151" />
                </TouchableOpacity>
                <Text className="text-xs font-medium text-gray-600">
                  {(() => {
                    const s = weekDates[0], e = weekDates[6];
                    const sd = new Date(s + 'T12:00:00'), ed = new Date(e + 'T12:00:00');
                    return `${sd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${ed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                  })()}
                </Text>
                <TouchableOpacity onPress={() => shiftWeek(1)} className="p-1">
                  <Ionicons name="chevron-forward" size={18} color="#374151" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={() => shiftMonth(-1)} className="p-1">
                  <Ionicons name="chevron-back" size={18} color="#374151" />
                </TouchableOpacity>
                <Text className="text-xs font-medium text-gray-600">{calMonthLabel}</Text>
                <TouchableOpacity onPress={() => shiftMonth(1)} className="p-1">
                  <Ionicons name="chevron-forward" size={18} color="#374151" />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              onPress={() => setCalendarMode(calendarMode === 'week' ? 'month' : 'week')}
              className="bg-gray-100 px-2 py-1 rounded-md"
            >
              <Text className="text-[10px] font-medium text-gray-500">
                {calendarMode === 'week' ? 'Month' : 'Week'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Day name headers */}
          <View className="flex-row mb-1">
            {DAY_NAMES.map((name, i) => (
              <View key={i} className="flex-1 items-center">
                <Text className="text-[10px] font-medium text-gray-400">{name}</Text>
              </View>
            ))}
          </View>

          {/* Week view */}
          {calendarMode === 'week' && (
            <View className="flex-row">
              {weekDates.map((dateStr) => {
                const day = parseInt(dateStr.split('-')[2]);
                const isSelected = dateStr === selectedDate;
                const isTodayCell = dateStr === todayStr;
                const isFuture = dateStr > todayStr;
                const dotColor = getCalendarDotColor(dateStr);
                const hasWeight = calendarData[dateStr]?.hasWeightLog;
                return (
                  <TouchableOpacity
                    key={dateStr}
                    className="flex-1 items-center py-1.5"
                    onPress={() => !isFuture && setSelectedDate(dateStr)}
                    disabled={isFuture}
                  >
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={[
                        isTodayCell && !isSelected ? { backgroundColor: '#ecfdf5' } : {},
                        isSelected ? { backgroundColor: '#10b981' } : {},
                      ]}
                    >
                      <Text
                        className={`text-xs font-medium ${isSelected ? 'text-white' : isFuture ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        {day}
                      </Text>
                    </View>
                    <View className="flex-row mt-0.5 gap-0.5">
                      {dotColor && <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />}
                      {hasWeight && <View className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Month view */}
          {calendarMode === 'month' && (
            <View>
              {monthGrid.map((row, ri) => (
                <View key={ri} className="flex-row">
                  {row.map((dateStr, ci) => {
                    if (!dateStr) return <View key={ci} className="flex-1 py-1" />;
                    const day = parseInt(dateStr.split('-')[2]);
                    const isSelected = dateStr === selectedDate;
                    const isTodayCell = dateStr === todayStr;
                    const isFuture = dateStr > todayStr;
                    const dotColor = getCalendarDotColor(dateStr);
                    const hasWeight = calendarData[dateStr]?.hasWeightLog;
                    return (
                      <TouchableOpacity
                        key={ci}
                        className="flex-1 items-center py-1"
                        onPress={() => !isFuture && setSelectedDate(dateStr)}
                        disabled={isFuture}
                      >
                        <View
                          className="w-7 h-7 rounded-full items-center justify-center"
                          style={[
                            isTodayCell && !isSelected ? { backgroundColor: '#ecfdf5' } : {},
                            isSelected ? { backgroundColor: '#10b981' } : {},
                          ]}
                        >
                          <Text className={`text-[10px] font-medium ${isSelected ? 'text-white' : isFuture ? 'text-gray-300' : 'text-gray-700'}`}>
                            {day}
                          </Text>
                        </View>
                        <View className="flex-row mt-0.5 gap-0.5">
                          {dotColor && <View className="w-1 h-1 rounded-full" style={{ backgroundColor: dotColor }} />}
                          {hasWeight && <View className="w-1 h-1 rounded-full bg-purple-400" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Today's Summary */}
        <View className="mx-4 mt-3 bg-white rounded-xl p-4">
          <Text className="text-base font-semibold text-gray-800 mb-3">{isToday ? "Today's Nutrition" : `Nutrition — ${formatDateLabel(selectedDate)}`}</Text>
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

        {/* ─── Today's Meals ──────────────────────────────────────────── */}
        <View className="mx-4 mt-3 bg-white rounded-xl p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-gray-800">{isToday ? "Today's Meals" : `Meals — ${formatDateLabel(selectedDate)}`}</Text>
            <TouchableOpacity onPress={() => openLogMeal()} className="flex-row items-center bg-primary-50 px-3 py-1.5 rounded-lg">
              <Ionicons name="add" size={16} color="#10b981" />
              <Text className="text-xs font-medium text-primary-600 ml-1">Log a Meal</Text>
            </TouchableOpacity>
          </View>

          {todayMeals.length === 0 ? (
            <View className="items-center py-3">
              <Ionicons name="restaurant-outline" size={28} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-1">No meals logged yet</Text>
            </View>
          ) : (
            todayMeals.map((meal: any, idx: number) => {
              const typeIcons: Record<string, string> = { breakfast: 'sunny-outline', lunch: 'restaurant-outline', dinner: 'moon-outline', snack: 'cafe-outline' };
              const typeColors: Record<string, string> = { breakfast: '#f59e0b', lunch: '#10b981', dinner: '#6366f1', snack: '#ec4899' };
              return (
                <View key={meal.id || idx} className="flex-row items-center py-2 border-t border-gray-100">
                  <TouchableOpacity className="flex-row items-center flex-1" onPress={() => openLogMeal(meal)} activeOpacity={0.6}>
                    <Ionicons name={(typeIcons[meal.mealType] || 'restaurant-outline') as any} size={18} color={typeColors[meal.mealType] || '#6b7280'} />
                    <View className="flex-1 ml-3">
                      <Text className="text-sm text-gray-800">{meal.mealName || 'Meal'}</Text>
                      <Text className="text-xs text-gray-400 capitalize">
                        {meal.mealType}
                        {meal.mealTime ? ` · ${new Date(meal.mealTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
                      </Text>
                    </View>
                    {meal.calories ? (
                      <View className="bg-gray-100 px-2 py-0.5 rounded">
                        <Text className="text-xs text-gray-600">{meal.calories} cal</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteMeal(meal.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} className="ml-2 p-1">
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* ─── Primary Goals (Diet Preferences) ──────────────────────── */}
        <View className="flex-row items-center justify-between mx-4 mt-5 mb-2">
          <View>
            <Text className="text-base font-semibold text-gray-800">Primary Goals</Text>
            <Text className="text-xs text-gray-400">Max {MAX_PRIMARY_GOALS} — shapes your search & recipe suggestions</Text>
          </View>
          <TouchableOpacity onPress={openAddPrimary}>
            <Ionicons name="add-circle" size={26} color="#10b981" />
          </TouchableOpacity>
        </View>

        {primaryGoals.length === 0 ? (
          <TouchableOpacity onPress={openAddPrimary} className="mx-4 bg-white rounded-xl p-5 items-center border border-dashed border-gray-300">
            <Ionicons name="nutrition-outline" size={32} color="#d1d5db" />
            <Text className="text-gray-400 mt-2 text-sm">Tap to set a primary goal (e.g. High Protein)</Text>
          </TouchableOpacity>
        ) : (
          primaryGoals.map((goal: any) => {
            const def = PRIMARY_GOALS.find(p => p.key === goal.goalType);
            return (
              <View key={goal.id} className="mx-4 mb-2 bg-white rounded-xl p-4 flex-row items-center">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: `${def?.color || '#10b981'}20` }}>
                  <Ionicons name={def?.icon as any || 'flag'} size={20} color={def?.color || '#10b981'} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-800">{def?.label || goal.goalType}</Text>
                  <Text className="text-xs text-gray-400">{def?.description}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(goal)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* ─── Tracking Goals (Measurable Targets) ───────────────────── */}
        <View className="flex-row items-center justify-between mx-4 mt-5 mb-2">
          <View>
            <Text className="text-base font-semibold text-gray-800">Tracking Goals</Text>
            <Text className="text-xs text-gray-400">Specific daily/weight targets</Text>
          </View>
          <TouchableOpacity onPress={openAddTracking}>
            <Ionicons name="add-circle" size={26} color="#10b981" />
          </TouchableOpacity>
        </View>

        {macroTrackingGoals.length === 0 && !weightGoal ? (
          <TouchableOpacity onPress={openAddTracking} className="mx-4 bg-white rounded-xl p-5 items-center border border-dashed border-gray-300">
            <Ionicons name="analytics-outline" size={32} color="#d1d5db" />
            <Text className="text-gray-400 mt-2 text-sm">Tap to add a tracking goal (e.g. 200g protein)</Text>
          </TouchableOpacity>
        ) : null}

        {/* Macro tracking goals with over-100% bars */}
        {macroTrackingGoals.map((goal: any) => {
          const def = TRACKING_GOALS.find(t => t.key === goal.goalType);
          const { current, percent, rawPercent, isOver, overAmount, isMacro } = getProgress(goal.goalType, goal.targetValue);

          return (
            <TouchableOpacity key={goal.id} onPress={() => openEditGoal(goal)} className="mx-4 mb-2 bg-white rounded-xl p-4" activeOpacity={0.7}>
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Ionicons name={def?.icon as any || 'flag'} size={20} color={def?.color || '#10b981'} />
                  <Text className="text-sm font-semibold text-gray-800 ml-2">{def?.label || goal.goalType}</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <TouchableOpacity onPress={() => openEditGoal(goal)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="pencil-outline" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(goal)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {isMacro ? (
                <>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs text-gray-400">
                      {current} / {goal.targetValue} {goal.unit}
                    </Text>
                    <Text className="text-xs font-medium" style={{ color: isOver ? '#ef4444' : (def?.color || '#10b981') }}>
                      {Math.round(rawPercent)}%
                    </Text>
                  </View>
                  <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: isOver ? '#ef4444' : (def?.color || '#10b981'),
                      }}
                    />
                  </View>
                  {isOver && (
                    <Text className="text-xs text-red-500 mt-1">
                      Over by {overAmount} {goal.unit}
                    </Text>
                  )}
                </>
              ) : (
                <Text className="text-sm text-gray-500">
                  Target: {goal.targetValue} {goal.unit}
                </Text>
              )}

              <Text className="text-[10px] text-gray-300 mt-1.5">Tap to edit</Text>
            </TouchableOpacity>
          );
        })}

        {/* ─── Weight Goal Card — Rich Section ───────────────────────── */}
        {weightGoal && (
          <View className="mx-4 mt-2 mb-2 bg-white rounded-xl p-4">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Ionicons name="scale-outline" size={20} color="#8b5cf6" />
                <Text className="text-sm font-semibold text-gray-800 ml-2">Weight Goal</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity onPress={() => openEditGoal(weightGoal)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="pencil-outline" size={16} color="#9ca3af" />
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
                  <Text className="text-xs text-gray-400">Starting: {wStart} lbs</Text>
                  <Text className="text-xs font-medium text-purple-600">Current: {wCurrent} lbs</Text>
                  <Text className="text-xs text-gray-400">Goal: {wTarget} lbs</Text>
                </View>
                <View className="h-3 bg-gray-100 rounded-full overflow-hidden mb-1">
                  <View className="h-full rounded-full bg-purple-500" style={{ width: `${wPercent}%` }} />
                </View>
                <Text className="text-xs text-gray-500 mb-2">
                  {wLost.toFixed(1)} lbs {wStart > wTarget ? 'lost' : 'gained'} of {wTotalGoal.toFixed(1)} lbs goal — {Math.round(wPercent)}%
                </Text>
              </>
            )}

            {/* Motivational text */}
            {motivation && (
              <View className="flex-row items-center mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: `${motivation.color}10` }}>
                <Ionicons name={motivation.icon as any} size={16} color={motivation.color} />
                <Text className="text-xs font-medium ml-2" style={{ color: motivation.color }}>{motivation.text}</Text>
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
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                    labelColor: () => '#9ca3af',
                    propsForDots: { r: '3', strokeWidth: '1', stroke: '#10b981' },
                    propsForBackgroundLines: { stroke: '#f3f4f6' },
                  }}
                  bezier
                  style={{ borderRadius: 8 }}
                  withInnerLines={true}
                  withOuterLines={false}
                  fromZero={false}
                />
                {wTarget != null && (
                  <Text className="text-[10px] text-gray-400 text-center mt-1">Goal: {wTarget} lbs (dashed line)</Text>
                )}
              </View>
            )}

            {/* Log Weight button */}
            <TouchableOpacity onPress={openLogWeight} className="bg-purple-50 border border-purple-200 rounded-xl py-3 items-center mb-3">
              <View className="flex-row items-center">
                <Ionicons name="add-circle" size={18} color="#8b5cf6" />
                <Text className="text-sm font-medium text-purple-600 ml-2">Log Weight</Text>
              </View>
            </TouchableOpacity>

            {/* Recent weigh-ins */}
            {weightLogs.length > 0 && (
              <>
                <Text className="text-xs font-medium text-gray-500 mb-2">Recent Weigh-ins</Text>
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
                    <View key={log.id} className="flex-row items-center py-1.5 border-t border-gray-50">
                      <Text className="text-xs text-gray-500 w-16">{dateLabel}</Text>
                      <Text className="text-xs font-medium text-gray-800 flex-1">{log.weight} lbs</Text>
                      {delta !== 0 && (
                        <View className="flex-row items-center mr-2">
                          <Ionicons name={isLoss ? 'caret-down' : 'caret-up'} size={10} color={isLoss ? '#10b981' : '#ef4444'} />
                          <Text className="text-[10px] font-medium ml-0.5" style={{ color: isLoss ? '#10b981' : '#ef4444' }}>
                            {Math.abs(delta).toFixed(1)}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity onPress={() => handleDeleteWeightLog(log.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={14} color="#d1d5db" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}

            {/* Stats summary */}
            {weightStats && weightStats.streak > 0 && (
              <View className="flex-row items-center mt-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                <Ionicons name="flame" size={14} color="#8b5cf6" />
                <Text className="text-[10px] text-purple-600 ml-1">{weightStats.streak}-day logging streak!</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── Add/Edit Modal ──────────────────────────────────────────────── */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">
              {modalMode === 'edit' ? 'Edit Goal' : modalMode === 'add-primary' ? 'Add Primary Goal' : 'Add Tracking Goal'}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || (modalMode !== 'edit' && !selectedGoalType) || (modalMode === 'add-tracking' && !targetValue.trim()) || (modalMode === 'edit' && TRACKING_GOALS.some(t => t.key === editGoal?.goalType) && !targetValue.trim())}
            >
              <Text className={`font-medium ${saving ? 'text-gray-300' : 'text-primary-500'}`}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 30 }}>
            {modalMode === 'edit' && editGoal ? (
              <View>
                {(() => {
                  const def = ALL_GOAL_DEFS.find(d => d.key === editGoal.goalType);
                  const trackingDef = TRACKING_GOALS.find(t => t.key === editGoal.goalType);
                  return (
                    <>
                      <View className="flex-row items-center mb-4">
                        <Ionicons name={def?.icon as any || 'flag'} size={24} color={def?.color || '#10b981'} />
                        <Text className="text-base font-semibold text-gray-800 ml-2">{def?.label || editGoal.goalType}</Text>
                      </View>
                      {trackingDef ? (
                        <View>
                          <Text className="text-sm font-medium text-gray-700 mb-1">
                            {editGoal.goalType === 'weight' ? 'Goal Weight' : 'Daily Target'} ({trackingDef.unit})
                          </Text>
                          <TextInput
                            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                            placeholder={trackingDef.placeholder}
                            placeholderTextColor="#9ca3af"
                            value={targetValue}
                            onChangeText={setTargetValue}
                            keyboardType="numeric"
                            autoFocus
                          />
                        </View>
                      ) : (
                        <Text className="text-sm text-gray-500">This is a primary goal — no target to edit. You can remove and re-add it.</Text>
                      )}
                    </>
                  );
                })()}
              </View>
            ) : modalMode === 'add-primary' ? (
              <View>
                <Text className="text-sm text-gray-500 mb-3">
                  Choose a diet preference ({primaryGoals.length}/{MAX_PRIMARY_GOALS} used)
                </Text>
                <View className="gap-2">
                  {PRIMARY_GOALS.map(pg => {
                    const isActive = activePrimaryKeys.has(pg.key);
                    const isSelected = selectedGoalType === pg.key;
                    return (
                      <TouchableOpacity
                        key={pg.key}
                        className={`flex-row items-center p-3 rounded-xl ${
                          isActive ? 'bg-gray-100 opacity-50' :
                          isSelected ? 'bg-primary-50 border-2 border-primary-300' : 'bg-white border border-gray-200'
                        }`}
                        onPress={() => !isActive && setSelectedGoalType(pg.key)}
                        disabled={isActive}
                      >
                        <Ionicons name={pg.icon as any} size={20} color={pg.color} />
                        <View className="flex-1 ml-3">
                          <Text className="text-sm text-gray-800">{pg.label}</Text>
                          <Text className="text-xs text-gray-400">{pg.description}</Text>
                        </View>
                        {isActive ? (
                          <Text className="text-xs text-gray-400">Active</Text>
                        ) : isSelected ? (
                          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View>
                <Text className="text-sm text-gray-500 mb-3">Choose a metric to track</Text>
                <View className="gap-2 mb-4">
                  {TRACKING_GOALS.map(tg => {
                    const isActive = activeTrackingKeys.has(tg.key);
                    const isSelected = selectedGoalType === tg.key;
                    return (
                      <TouchableOpacity
                        key={tg.key}
                        className={`flex-row items-center p-3 rounded-xl ${
                          isActive ? 'bg-gray-100 opacity-50' :
                          isSelected ? 'bg-primary-50 border-2 border-primary-300' : 'bg-white border border-gray-200'
                        }`}
                        onPress={() => !isActive && setSelectedGoalType(tg.key)}
                        disabled={isActive}
                      >
                        <Ionicons name={tg.icon as any} size={20} color={tg.color} />
                        <Text className="text-sm text-gray-800 ml-3 flex-1">{tg.label}</Text>
                        <Text className="text-xs text-gray-400">{tg.unit}</Text>
                        {isActive ? (
                          <Text className="text-xs text-gray-400 ml-2">Active</Text>
                        ) : isSelected ? (
                          <Ionicons name="checkmark-circle" size={20} color="#10b981" style={{ marginLeft: 8 }} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {selectedGoalType && selectedGoalType !== 'weight' && (
                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-1">
                      Daily Target ({TRACKING_GOALS.find(t => t.key === selectedGoalType)?.unit})
                    </Text>
                    <TextInput
                      className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                      placeholder={TRACKING_GOALS.find(t => t.key === selectedGoalType)?.placeholder}
                      placeholderTextColor="#9ca3af"
                      value={targetValue}
                      onChangeText={setTargetValue}
                      keyboardType="numeric"
                      autoFocus
                    />
                  </View>
                )}

                {/* Weight goal — special inputs */}
                {selectedGoalType === 'weight' && (
                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-1">Starting Weight (lbs) *</Text>
                    <TextInput
                      className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 mb-3"
                      placeholder="e.g. 210"
                      placeholderTextColor="#9ca3af"
                      value={startingWeightInput}
                      onChangeText={setStartingWeightInput}
                      keyboardType="numeric"
                      autoFocus
                    />
                    <Text className="text-sm font-medium text-gray-700 mb-1">Goal Weight (lbs) *</Text>
                    <TextInput
                      className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 mb-3"
                      placeholder="e.g. 185"
                      placeholderTextColor="#9ca3af"
                      value={targetValue}
                      onChangeText={setTargetValue}
                      keyboardType="numeric"
                    />
                    <Text className="text-sm font-medium text-gray-700 mb-1">Target Date (optional)</Text>
                    <TextInput
                      className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9ca3af"
                      value={targetDateInput}
                      onChangeText={setTargetDateInput}
                    />
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Log Meal Modal ──────────────────────────────────────────── */}
      <Modal visible={showLogMealModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLogMealModal(false)}>
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowLogMealModal(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">{editingMealId ? 'Edit Meal' : 'Log a Meal'}</Text>
            <TouchableOpacity onPress={handleLogMeal} disabled={savingMeal || !logMealName.trim()}>
              <Text className={`font-medium ${savingMeal || !logMealName.trim() ? 'text-gray-300' : 'text-primary-500'}`}>
                {savingMeal ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 30 }}>
            <Text className="text-sm font-medium text-gray-700 mb-2">Meal Type</Text>
            <View className="flex-row gap-2 mb-4">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => {
                const icons: Record<string, string> = { breakfast: 'sunny-outline', lunch: 'restaurant-outline', dinner: 'moon-outline', snack: 'cafe-outline' };
                const selected = logMealType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    className={`flex-1 py-2.5 rounded-lg border items-center ${selected ? 'bg-primary-50 border-primary-400' : 'bg-white border-gray-200'}`}
                    onPress={() => setLogMealType(type)}
                  >
                    <Ionicons name={icons[type] as any} size={18} color={selected ? '#10b981' : '#9ca3af'} />
                    <Text className={`text-xs mt-1 capitalize ${selected ? 'text-primary-700 font-medium' : 'text-gray-500'}`}>{type}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-1">Meal Name *</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
              placeholder="e.g. McChicken, Grilled Salmon..."
              placeholderTextColor="#9ca3af"
              value={logMealName}
              onChangeText={handleMealNameChange}
              autoFocus
            />

            {searchResults.length > 0 && !selectedRecipe && (
              <View className="bg-white border border-gray-200 rounded-xl mt-1 overflow-hidden">
                {searchResults.map((r: any, idx: number) => {
                  const n = r.nutrition;
                  return (
                    <TouchableOpacity
                      key={r.id || idx}
                      className={`px-4 py-3 flex-row items-center ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                      onPress={() => selectRecipeResult(r)}
                    >
                      <Ionicons name="restaurant-outline" size={16} color="#10b981" />
                      <View className="flex-1 ml-2">
                        <Text className="text-sm text-gray-800" numberOfLines={1}>{r.title}</Text>
                        {r.brand && <Text className="text-xs text-gray-400">{r.brand}</Text>}
                      </View>
                      {n && (
                        <Text className="text-xs text-gray-400">{n.calories} cal • {n.protein}g P</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {logMealName.trim().length >= 3 && !selectedRecipe && (
              <TouchableOpacity
                className="flex-row items-center justify-center bg-primary-50 border border-primary-200 rounded-xl px-4 py-2.5 mt-2"
                onPress={handleEstimateWithAI}
                disabled={estimating}
              >
                {estimating ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Ionicons name="sparkles" size={16} color="#10b981" />
                )}
                <Text className="text-sm font-medium text-primary-600 ml-2">
                  {estimating ? 'Estimating...' : 'Estimate with AI'}
                </Text>
              </TouchableOpacity>
            )}

            <Text className="text-xs text-gray-400 mt-2 mb-4">
              {selectedRecipe?._estimated
                ? 'Nutrition estimated by AI — feel free to adjust'
                : selectedRecipe
                ? 'Nutrition auto-filled from recipe database'
                : 'Search above, estimate with AI, or enter manually'}
            </Text>

            <Text className="text-sm font-medium text-gray-700 mb-1">Nutrition (optional)</Text>
            <View className="flex-row gap-2 mb-2">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Calories</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                  placeholder="kcal"
                  placeholderTextColor="#d1d5db"
                  value={logCalories}
                  onChangeText={setLogCalories}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Protein</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                  placeholder="g"
                  placeholderTextColor="#d1d5db"
                  value={logProtein}
                  onChangeText={setLogProtein}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Carbs</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                  placeholder="g"
                  placeholderTextColor="#d1d5db"
                  value={logCarbs}
                  onChangeText={setLogCarbs}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Fat</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                  placeholder="g"
                  placeholderTextColor="#d1d5db"
                  value={logFat}
                  onChangeText={setLogFat}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Log Weight Modal ────────────────────────────────────────── */}
      <Modal visible={showLogWeightModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLogWeightModal(false)}>
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowLogWeightModal(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">Log Weight</Text>
            <TouchableOpacity onPress={handleLogWeight} disabled={savingWeight || !logWeightValue.trim()}>
              <Text className={`font-medium ${savingWeight || !logWeightValue.trim() ? 'text-gray-300' : 'text-primary-500'}`}>
                {savingWeight ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 30 }}>
            <Text className="text-sm font-medium text-gray-700 mb-1">Weight (lbs) *</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 mb-4"
              placeholder="e.g. 195.5"
              placeholderTextColor="#9ca3af"
              value={logWeightValue}
              onChangeText={setLogWeightValue}
              keyboardType="numeric"
              autoFocus
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Date</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 mb-4"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              value={logWeightDate}
              onChangeText={setLogWeightDate}
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Notes (optional)</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
              placeholder="e.g. morning weigh-in"
              placeholderTextColor="#9ca3af"
              value={logWeightNotes}
              onChangeText={setLogWeightNotes}
              multiline
            />
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Delete Confirmation Modal ───────────────────────────────── */}
      <Modal visible={!!confirmDeleteGoal} transparent animationType="fade" onRequestClose={() => setConfirmDeleteGoal(null)}>
        <TouchableOpacity
          className="flex-1 bg-black/40 items-center justify-center"
          activeOpacity={1}
          onPress={() => setConfirmDeleteGoal(null)}
        >
          <View className="bg-white rounded-2xl mx-8 p-5 w-72" onStartShouldSetResponder={() => true}>
            <Text className="text-base font-semibold text-gray-800 text-center mb-1">Remove Goal</Text>
            <Text className="text-sm text-gray-500 text-center mb-4">
              Remove "{ALL_GOAL_DEFS.find(d => d.key === confirmDeleteGoal?.goalType)?.label || confirmDeleteGoal?.goalType}"?
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-lg bg-gray-100 items-center"
                onPress={() => setConfirmDeleteGoal(null)}
              >
                <Text className="text-sm font-medium text-gray-600">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-lg bg-red-500 items-center"
                onPress={confirmDelete}
              >
                <Text className="text-sm font-medium text-white">Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
