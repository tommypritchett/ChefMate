import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { validateMacro } from './nutritionHelpers';
import { nutritionApi, inventoryApi } from '../../services/api';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';

function calcCaloriesFromMacros(protein: string, carbs: string, fat: string): string {
  const p = parseFloat(protein) || 0;
  const c = parseFloat(carbs) || 0;
  const f = parseFloat(fat) || 0;
  if (p === 0 && c === 0 && f === 0) return '';
  return String(Math.round((p * 4) + (c * 4) + (f * 9)));
}

interface BreakdownItem {
  item: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface RecentMeal {
  id: string;
  mealType: string;
  mealName: string | null;
  notes: string | null;
  calories: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
}

interface MealLogModalProps {
  visible: boolean;
  onClose: () => void;
  editingMealId: string | null;
  editingNotes?: string | null;
  logMealType: string;
  setLogMealType: (type: string) => void;
  logMealName: string;
  onMealNameChange: (text: string) => void;
  logCalories: string;
  setLogCalories: (text: string) => void;
  logCaloriesError: string;
  setLogCaloriesError: (error: string) => void;
  logProtein: string;
  setLogProtein: (text: string) => void;
  logProteinError: string;
  setLogProteinError: (error: string) => void;
  logCarbs: string;
  setLogCarbs: (text: string) => void;
  logCarbsError: string;
  setLogCarbsError: (error: string) => void;
  logFat: string;
  setLogFat: (text: string) => void;
  logFatError: string;
  setLogFatError: (error: string) => void;
  savingMeal: boolean;
  onSave: (ingredients?: string[], notes?: string) => void;
  searchResults: any[];
  selectedRecipe: any;
  onSelectRecipe: (recipe: any) => void;
  estimating: boolean;
  onEstimateWithAI: () => void;
}

type InputMode = 'type' | 'voice' | 'photo' | 'recent';

export default function MealLogModal({
  visible, onClose, editingMealId, editingNotes,
  logMealType, setLogMealType, logMealName, onMealNameChange,
  logCalories, setLogCalories, logCaloriesError, setLogCaloriesError,
  logProtein, setLogProtein, logProteinError, setLogProteinError,
  logCarbs, setLogCarbs, logCarbsError, setLogCarbsError,
  logFat, setLogFat, logFatError, setLogFatError,
  savingMeal, onSave,
  searchResults, selectedRecipe, onSelectRecipe,
  estimating, onEstimateWithAI,
}: MealLogModalProps) {
  const [caloriesManual, setCaloriesManual] = useState(false);
  const prevVisible = useRef(visible);

  // Multi-modal state
  const [inputMode, setInputMode] = useState<InputMode>('type');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [ingredientText, setIngredientText] = useState('');
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [estimatingIngredients, setEstimatingIngredients] = useState(false);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);
  const [recentMeals, setRecentMeals] = useState<RecentMeal[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [servings, setServings] = useState(1);
  const [editingBreakdownIdx, setEditingBreakdownIdx] = useState<number | null>(null);

  // Voice
  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  // Reset state when modal opens/closes
  if (visible !== prevVisible.current) {
    prevVisible.current = visible;
    if (visible) {
      setCaloriesManual(false);
      setIngredientText('');
      setInputMode('type');
      setServings(1);
      setEditingBreakdownIdx(null);
      resetTranscript();
      // When editing, restore ingredients and fetch breakdown from notes
      if (editingMealId && editingNotes) {
        const items = editingNotes.split(',').map(s => s.trim()).filter(Boolean);
        setIngredients(items);
        setBreakdown([]);
        // Auto-fetch breakdown for display
        if (items.length > 0) {
          nutritionApi.estimateIngredients(items)
            .then(result => setBreakdown(result.breakdown || []))
            .catch(() => {});
        }
      } else {
        setIngredients([]);
        setBreakdown([]);
      }
    }
  }

  // Fetch recent meals when switching to recent tab
  useEffect(() => {
    if (visible && inputMode === 'recent' && recentMeals.length === 0) {
      setLoadingRecent(true);
      nutritionApi.getRecentMeals()
        .then(data => setRecentMeals(data.meals || []))
        .catch(() => {})
        .finally(() => setLoadingRecent(false));
    }
  }, [visible, inputMode]);

  // Voice transcript → add to ingredients on stop
  useEffect(() => {
    if (!isListening && transcript && transcript.trim()) {
      const items = transcript.split(/,|and |\n/).map(s => s.trim()).filter(Boolean);
      setIngredients(prev => [...prev, ...items]);
      resetTranscript();
    }
  }, [isListening, transcript]);

  const handleMacroChange = useCallback(
    (field: 'protein' | 'carbs' | 'fat', text: string) => {
      const setter = field === 'protein' ? setLogProtein : field === 'carbs' ? setLogCarbs : setLogFat;
      const errSetter = field === 'protein' ? setLogProteinError : field === 'carbs' ? setLogCarbsError : setLogFatError;
      setter(text);
      errSetter(validateMacro(text, field.charAt(0).toUpperCase() + field.slice(1)));

      if (!caloriesManual) {
        const p = field === 'protein' ? text : logProtein;
        const c = field === 'carbs' ? text : logCarbs;
        const f = field === 'fat' ? text : logFat;
        const calc = calcCaloriesFromMacros(p, c, f);
        setLogCalories(calc);
        setLogCaloriesError(validateMacro(calc, 'Calories'));
      }
    },
    [caloriesManual, logProtein, logCarbs, logFat, setLogProtein, setLogCarbs, setLogFat, setLogProteinError, setLogCarbsError, setLogFatError, setLogCalories, setLogCaloriesError],
  );

  const handleCaloriesChange = useCallback(
    (text: string) => {
      setCaloriesManual(true);
      setLogCalories(text);
      setLogCaloriesError(validateMacro(text, 'Calories'));
    },
    [setLogCalories, setLogCaloriesError],
  );

  const addIngredient = () => {
    const text = ingredientText.trim();
    if (!text) return;
    const items = text.split(',').map(s => s.trim()).filter(Boolean);
    setIngredients(prev => [...prev, ...items]);
    setIngredientText('');
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
    setBreakdown(prev => prev.filter((_, i) => i !== index));
    recalcTotalsAfterEdit(breakdown.filter((_, i) => i !== index));
  };

  // Recalculate totals from breakdown, applying servings
  const recalcTotalsAfterEdit = (bd: BreakdownItem[], mult?: number) => {
    const s = mult ?? servings;
    const totals = bd.reduce(
      (acc, row) => ({
        calories: acc.calories + row.calories,
        protein: acc.protein + row.protein,
        carbs: acc.carbs + row.carbs,
        fat: acc.fat + row.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
    setLogCalories(String(Math.round(totals.calories * s)));
    setLogProtein(String(Math.round(totals.protein * s)));
    setLogCarbs(String(Math.round(totals.carbs * s)));
    setLogFat(String(Math.round(totals.fat * s)));
    setLogCaloriesError('');
    setLogProteinError('');
    setLogCarbsError('');
    setLogFatError('');
    setCaloriesManual(true);
  };

  const handleEstimateIngredients = async () => {
    if (ingredients.length === 0) return;
    setEstimatingIngredients(true);
    try {
      const result = await nutritionApi.estimateIngredients(ingredients);
      const bd = result.breakdown || [];
      setBreakdown(bd);
      recalcTotalsAfterEdit(bd);
      // Auto-set meal name from ingredients if empty
      if (!logMealName.trim()) {
        const name = ingredients.length <= 3
          ? ingredients.join(', ')
          : `${ingredients[0]} + ${ingredients.length - 1} more`;
        onMealNameChange(name);
      }
    } catch {
      Alert.alert('Error', 'Failed to estimate nutrition from ingredients.');
    } finally {
      setEstimatingIngredients(false);
    }
  };

  const handlePhotoScan = async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required.'); return; }
        result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Photo library access is required.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      }
      if (result.canceled || !result.assets?.[0]) return;

      setPhotoAnalyzing(true);
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (!manipulated.base64) { Alert.alert('Error', 'Failed to process image.'); setPhotoAnalyzing(false); return; }

      const analysis = await inventoryApi.analyzePhoto(manipulated.base64);
      const foodItems = (analysis.items || []).map((i: any) =>
        i.quantity ? `${i.quantity} ${i.unit || ''} ${i.name}`.trim() : i.name
      );
      if (foodItems.length > 0) {
        setIngredients(prev => [...prev, ...foodItems]);
      } else {
        Alert.alert('No Food Found', 'Could not identify food items in the photo.');
      }
    } catch {
      Alert.alert('Error', 'Failed to analyze photo.');
    } finally {
      setPhotoAnalyzing(false);
    }
  };

  const handleSelectRecentMeal = (meal: RecentMeal) => {
    onMealNameChange(meal.mealName || '');
    setLogMealType(meal.mealType);
    if (meal.calories) setLogCalories(String(meal.calories));
    if (meal.proteinGrams) setLogProtein(String(meal.proteinGrams));
    if (meal.carbsGrams) setLogCarbs(String(meal.carbsGrams));
    if (meal.fatGrams) setLogFat(String(meal.fatGrams));
    if (meal.notes) {
      const items = meal.notes.split(',').map(s => s.trim()).filter(Boolean);
      setIngredients(items);
    }
    setInputMode('type');
    setCaloriesManual(true);
  };

  const handleServingsChange = (newServings: number) => {
    if (newServings < 1) return;
    setServings(newServings);
    if (breakdown.length > 0) {
      recalcTotalsAfterEdit(breakdown, newServings);
    } else if (newServings !== servings) {
      // Scale existing totals proportionally
      const ratio = newServings / servings;
      const cal = parseFloat(logCalories) || 0;
      const prot = parseFloat(logProtein) || 0;
      const carb = parseFloat(logCarbs) || 0;
      const f = parseFloat(logFat) || 0;
      setLogCalories(String(Math.round(cal * ratio)));
      setLogProtein(String(Math.round(prot * ratio)));
      setLogCarbs(String(Math.round(carb * ratio)));
      setLogFat(String(Math.round(f * ratio)));
      setCaloriesManual(true);
    }
  };

  const updateBreakdownRow = (idx: number, field: keyof BreakdownItem, value: string) => {
    const numVal = parseFloat(value) || 0;
    setBreakdown(prev => {
      const updated = prev.map((row, i) => {
        if (i !== idx) return row;
        const newRow = { ...row, [field]: numVal };
        // Recalculate calories from macros for this row
        if (field === 'protein' || field === 'carbs' || field === 'fat') {
          newRow.calories = Math.round((newRow.protein * 4) + (newRow.carbs * 4) + (newRow.fat * 9));
        }
        return newRow;
      });
      recalcTotalsAfterEdit(updated);
      return updated;
    });
  };

  const handleSave = () => {
    const notes = ingredients.length > 0 ? ingredients.join(', ') : undefined;
    onSave(ingredients, notes);
  };

  const INPUT_MODES: { key: InputMode; icon: string; label: string }[] = [
    { key: 'type', icon: 'create-outline', label: 'Type' },
    { key: 'voice', icon: 'mic-outline', label: 'Voice' },
    { key: 'photo', icon: 'camera-outline', label: 'Photo' },
    { key: 'recent', icon: 'time-outline', label: 'Recent' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 bg-cream"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-cream-deeper">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-brown font-sans">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-lg font-sans-semibold text-warm-dark">{editingMealId ? 'Edit Meal' : 'Log a Meal'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={savingMeal || !logMealName.trim()}>
            <Text className={`font-sans-semibold ${savingMeal || !logMealName.trim() ? 'text-brown-light' : 'text-primary-500'}`}>
              {savingMeal ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          {/* Meal Type */}
          <Text className="text-sm font-sans-semibold text-brown mb-2">Meal Type</Text>
          <View className="flex-row gap-2 mb-4">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => {
              const icons: Record<string, string> = { breakfast: 'sunny-outline', lunch: 'restaurant-outline', dinner: 'moon-outline', snack: 'cafe-outline' };
              const selected = logMealType === type;
              return (
                <TouchableOpacity
                  key={type}
                  className={`flex-1 py-2.5 rounded-lg border items-center ${selected ? 'bg-primary-50 border-primary-400' : 'bg-white border-cream-deeper'}`}
                  onPress={() => setLogMealType(type)}
                >
                  <Ionicons name={icons[type] as any} size={18} color={selected ? '#D4652E' : '#B8A68E'} />
                  <Text className={`text-xs mt-1 capitalize font-sans ${selected ? 'text-primary-700 font-sans-semibold' : 'text-brown'}`}>{type}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Meal Name */}
          <Text className="text-sm font-sans-semibold text-brown mb-1">Meal Name *</Text>
          <TextInput
            className="bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark"
            placeholder="e.g. Protein Shake, Grilled Salmon..."
            placeholderTextColor="#B8A68E"
            value={logMealName}
            onChangeText={onMealNameChange}
            autoFocus
          />

          {/* Recipe search results */}
          {searchResults.length > 0 && !selectedRecipe && (
            <View className="bg-white border border-cream-deeper rounded-xl mt-1 overflow-hidden">
              {searchResults.map((r: any, idx: number) => {
                const n = r.nutrition;
                return (
                  <TouchableOpacity
                    key={r.id || idx}
                    className={`px-4 py-3 flex-row items-center ${idx > 0 ? 'border-t border-cream-deeper' : ''}`}
                    onPress={() => onSelectRecipe(r)}
                  >
                    <Ionicons name="restaurant-outline" size={16} color="#D4652E" />
                    <View className="flex-1 ml-2">
                      <Text className="text-sm font-sans text-warm-dark" numberOfLines={1}>{r.title}</Text>
                      {r.brand && <Text className="text-xs font-sans text-brown-light">{r.brand}</Text>}
                    </View>
                    {n && <Text className="text-xs font-sans text-brown-light">{n.calories} cal</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Servings */}
          <View className="flex-row items-center mt-4 mb-3">
            <Text className="text-sm font-sans-semibold text-brown mr-3">Servings</Text>
            <TouchableOpacity
              className="w-8 h-8 rounded-lg bg-cream-dark items-center justify-center"
              onPress={() => handleServingsChange(servings - 1)}
            >
              <Ionicons name="remove" size={18} color="#8B7355" />
            </TouchableOpacity>
            <Text className="text-base font-sans-semibold text-warm-dark mx-3">{servings}</Text>
            <TouchableOpacity
              className="w-8 h-8 rounded-lg bg-cream-dark items-center justify-center"
              onPress={() => handleServingsChange(servings + 1)}
            >
              <Ionicons name="add" size={18} color="#8B7355" />
            </TouchableOpacity>
            {servings > 1 && (
              <Text className="text-xs text-brown-light font-sans ml-2">({servings}× multiplier)</Text>
            )}
          </View>

          {/* Input Mode Tabs */}
          <Text className="text-sm font-sans-semibold text-brown mb-2">Add Ingredients</Text>
          <View className="flex-row bg-cream-dark rounded-xl overflow-hidden mb-3">
            {INPUT_MODES.map(mode => {
              const active = inputMode === mode.key;
              return (
                <TouchableOpacity
                  key={mode.key}
                  className={`flex-1 flex-row items-center justify-center py-2.5 ${active ? 'bg-warm-dark' : ''}`}
                  onPress={() => setInputMode(mode.key)}
                >
                  <Ionicons name={mode.icon as any} size={15} color={active ? '#FFFBF5' : '#8B7355'} />
                  <Text className={`text-xs ml-1 font-sans-medium ${active ? 'text-cream' : 'text-brown'}`}>{mode.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Type Input */}
          {inputMode === 'type' && (
            <View className="flex-row items-center gap-2 mb-2">
              <TextInput
                className="flex-1 bg-white border border-cream-deeper rounded-xl px-4 py-2.5 text-sm text-warm-dark"
                placeholder="e.g. 1 scoop whey protein, 1 banana"
                placeholderTextColor="#B8A68E"
                value={ingredientText}
                onChangeText={setIngredientText}
                onSubmitEditing={addIngredient}
                returnKeyType="done"
              />
              <TouchableOpacity className="bg-primary-500 rounded-xl px-4 py-2.5" onPress={addIngredient}>
                <Ionicons name="add" size={20} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {/* Voice Input */}
          {inputMode === 'voice' && (
            <View className="items-center py-4">
              {isListening && transcript ? (
                <Text className="text-sm text-warm-dark font-sans mb-3 text-center px-4" numberOfLines={3}>{transcript}</Text>
              ) : null}
              <TouchableOpacity
                className={`w-16 h-16 rounded-full items-center justify-center ${isListening ? 'bg-red-500' : 'bg-primary-500'}`}
                onPress={() => {
                  if (Platform.OS !== 'web' || !isSupported) {
                    setInputMode('type');
                    Alert.alert('Voice Input', 'Use your keyboard\'s microphone button for voice dictation.');
                    return;
                  }
                  if (isListening) { stopListening(); } else { resetTranscript(); startListening(); }
                }}
              >
                <Ionicons name={isListening ? 'stop' : 'mic'} size={28} color="white" />
              </TouchableOpacity>
              <Text className="text-xs text-brown font-sans mt-2">
                {isListening ? 'Listening... tap to stop' : 'Tap to speak your ingredients'}
              </Text>
            </View>
          )}

          {/* Photo Input */}
          {inputMode === 'photo' && (
            <View className="items-center py-3">
              {photoAnalyzing ? (
                <View className="items-center py-4">
                  <ActivityIndicator size="large" color="#D4652E" />
                  <Text className="text-sm text-brown font-sans mt-2">Analyzing food...</Text>
                </View>
              ) : (
                <View className="flex-row gap-4">
                  <TouchableOpacity className="items-center bg-white border border-cream-deeper rounded-xl px-6 py-4" onPress={() => handlePhotoScan('camera')}>
                    <Ionicons name="camera" size={28} color="#D4652E" />
                    <Text className="text-xs text-brown font-sans-medium mt-1">Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="items-center bg-white border border-cream-deeper rounded-xl px-6 py-4" onPress={() => handlePhotoScan('gallery')}>
                    <Ionicons name="images" size={28} color="#D4652E" />
                    <Text className="text-xs text-brown font-sans-medium mt-1">Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Recent Meals */}
          {inputMode === 'recent' && (
            <View className="mb-2">
              {loadingRecent ? (
                <ActivityIndicator size="small" color="#D4652E" className="py-4" />
              ) : recentMeals.length === 0 ? (
                <Text className="text-sm text-brown-light font-sans text-center py-4">No recent meals yet</Text>
              ) : (
                recentMeals.map(meal => (
                  <TouchableOpacity key={meal.id} className="bg-white border border-cream-deeper rounded-xl px-4 py-3 mb-2" onPress={() => handleSelectRecentMeal(meal)}>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-sans-semibold text-warm-dark flex-1 mr-2" numberOfLines={1}>{meal.mealName}</Text>
                      <Text className="text-xs text-brown-light font-sans capitalize">{meal.mealType}</Text>
                    </View>
                    {meal.notes && <Text className="text-xs text-brown font-sans mt-0.5" numberOfLines={1}>{meal.notes}</Text>}
                    <View className="flex-row gap-3 mt-1">
                      {meal.calories != null && <Text className="text-xs text-brown-light font-sans">{meal.calories} cal</Text>}
                      {meal.proteinGrams != null && <Text className="text-xs text-brown-light font-sans">{meal.proteinGrams}g P</Text>}
                      {meal.carbsGrams != null && <Text className="text-xs text-brown-light font-sans">{meal.carbsGrams}g C</Text>}
                      {meal.fatGrams != null && <Text className="text-xs text-brown-light font-sans">{meal.fatGrams}g F</Text>}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Ingredient Chips */}
          {ingredients.length > 0 && (
            <View className="mb-3">
              <Text className="text-xs font-sans-medium text-brown mb-1.5">
                {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {ingredients.map((item, idx) => (
                  <View key={idx} className="flex-row items-center bg-primary-50 border border-primary-200 rounded-lg px-3 py-1.5">
                    <Text className="text-xs font-sans text-primary-700 mr-1.5">{item}</Text>
                    <TouchableOpacity onPress={() => removeIngredient(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={16} color="#D4652E" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Estimate button */}
              <TouchableOpacity
                className="flex-row items-center justify-center bg-primary-500 rounded-xl px-4 py-3 mt-3"
                onPress={handleEstimateIngredients}
                disabled={estimatingIngredients}
              >
                {estimatingIngredients ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="sparkles" size={16} color="white" />
                )}
                <Text className="text-sm font-sans-semibold text-white ml-2">
                  {estimatingIngredients ? 'Estimating...' : breakdown.length > 0 ? 'Re-estimate Macros' : 'Estimate Macros with AI'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Per-ingredient breakdown (editable) */}
          {breakdown.length > 0 && (
            <View className="bg-white border border-cream-deeper rounded-xl overflow-hidden mb-3">
              <View className="flex-row items-center px-3 py-2 bg-cream-dark">
                <Text className="flex-1 text-[10px] font-sans-semibold text-brown">ITEM</Text>
                <Text className="w-12 text-[10px] font-sans-semibold text-brown text-center">CAL</Text>
                <Text className="w-10 text-[10px] font-sans-semibold text-brown text-center">P</Text>
                <Text className="w-10 text-[10px] font-sans-semibold text-brown text-center">C</Text>
                <Text className="w-10 text-[10px] font-sans-semibold text-brown text-center">F</Text>
                <View className="w-6" />
              </View>
              {breakdown.map((row, idx) => (
                <View key={idx} className={idx > 0 ? 'border-t border-cream-deeper' : ''}>
                  {editingBreakdownIdx === idx ? (
                    /* Editing row */
                    <View className="px-3 py-2">
                      <Text className="text-xs font-sans-medium text-warm-dark mb-1.5">{row.item}</Text>
                      <View className="flex-row gap-2">
                        <View className="flex-1">
                          <Text className="text-[10px] text-brown font-sans mb-0.5">Cal</Text>
                          <TextInput
                            className="bg-cream border border-cream-deeper rounded px-2 py-1 text-xs text-warm-dark"
                            value={String(row.calories)}
                            onChangeText={v => updateBreakdownRow(idx, 'calories', v)}
                            keyboardType="numeric"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[10px] text-brown font-sans mb-0.5">Protein</Text>
                          <TextInput
                            className="bg-cream border border-cream-deeper rounded px-2 py-1 text-xs text-warm-dark"
                            value={String(row.protein)}
                            onChangeText={v => updateBreakdownRow(idx, 'protein', v)}
                            keyboardType="numeric"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[10px] text-brown font-sans mb-0.5">Carbs</Text>
                          <TextInput
                            className="bg-cream border border-cream-deeper rounded px-2 py-1 text-xs text-warm-dark"
                            value={String(row.carbs)}
                            onChangeText={v => updateBreakdownRow(idx, 'carbs', v)}
                            keyboardType="numeric"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[10px] text-brown font-sans mb-0.5">Fat</Text>
                          <TextInput
                            className="bg-cream border border-cream-deeper rounded px-2 py-1 text-xs text-warm-dark"
                            value={String(row.fat)}
                            onChangeText={v => updateBreakdownRow(idx, 'fat', v)}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                      <TouchableOpacity className="mt-2 self-end" onPress={() => setEditingBreakdownIdx(null)}>
                        <Text className="text-xs font-sans-semibold text-primary-500">Done</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* Display row */
                    <TouchableOpacity className="flex-row px-3 py-2 items-center" onPress={() => setEditingBreakdownIdx(idx)}>
                      <Text className="flex-1 text-xs font-sans text-warm-dark" numberOfLines={1}>{row.item}</Text>
                      <Text className="w-12 text-xs font-sans text-brown text-center">{row.calories}</Text>
                      <Text className="w-10 text-xs font-sans text-brown text-center">{row.protein}g</Text>
                      <Text className="w-10 text-xs font-sans text-brown text-center">{row.carbs}g</Text>
                      <Text className="w-10 text-xs font-sans text-brown text-center">{row.fat}g</Text>
                      <View className="w-6 items-center">
                        <Ionicons name="pencil-outline" size={12} color="#B8A68E" />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {servings > 1 && (
                <View className="flex-row px-3 py-2 bg-primary-50 border-t border-primary-200">
                  <Text className="flex-1 text-xs font-sans-semibold text-primary-700">× {servings} servings</Text>
                  <Text className="w-12 text-xs font-sans-semibold text-primary-700 text-center">
                    {Math.round(breakdown.reduce((s, r) => s + r.calories, 0) * servings)}
                  </Text>
                  <Text className="w-10 text-xs font-sans-semibold text-primary-700 text-center">
                    {Math.round(breakdown.reduce((s, r) => s + r.protein, 0) * servings)}g
                  </Text>
                  <Text className="w-10 text-xs font-sans-semibold text-primary-700 text-center">
                    {Math.round(breakdown.reduce((s, r) => s + r.carbs, 0) * servings)}g
                  </Text>
                  <Text className="w-10 text-xs font-sans-semibold text-primary-700 text-center">
                    {Math.round(breakdown.reduce((s, r) => s + r.fat, 0) * servings)}g
                  </Text>
                  <View className="w-6" />
                </View>
              )}
            </View>
          )}

          {/* Fallback: single-item AI estimate if no ingredients added */}
          {ingredients.length === 0 && logMealName.trim().length >= 3 && !selectedRecipe && (
            <TouchableOpacity
              className="flex-row items-center justify-center bg-primary-50 border border-primary-200 rounded-xl px-4 py-2.5 mt-2"
              onPress={onEstimateWithAI}
              disabled={estimating}
            >
              {estimating ? <ActivityIndicator size="small" color="#D4652E" /> : <Ionicons name="sparkles" size={16} color="#D4652E" />}
              <Text className="text-sm font-sans-semibold text-primary-600 ml-2">
                {estimating ? 'Estimating...' : 'Estimate from Meal Name'}
              </Text>
            </TouchableOpacity>
          )}

          <Text className="text-xs font-sans text-brown-light mt-2 mb-4">
            {breakdown.length > 0
              ? 'Tap any row to edit its macros'
              : selectedRecipe?._estimated
              ? 'Nutrition estimated by AI — feel free to adjust'
              : selectedRecipe
              ? 'Nutrition auto-filled from recipe database'
              : ingredients.length > 0
              ? 'Add ingredients then tap Estimate to get macros'
              : 'Add ingredients, estimate with AI, or enter manually'}
          </Text>

          {/* Nutrition Fields */}
          <Text className="text-sm font-sans-semibold text-brown mb-1">
            Nutrition{servings > 1 ? ` (${servings} servings total)` : ''}
          </Text>
          <View className="flex-row gap-2 mb-2">
            <View className="flex-1">
              <Text className="text-xs font-sans text-brown mb-1">Calories</Text>
              <TextInput
                className="bg-white border border-cream-deeper rounded-lg px-3 py-2 text-sm text-warm-dark"
                placeholder="kcal"
                placeholderTextColor="#B8A68E"
                value={logCalories}
                onChangeText={handleCaloriesChange}
                keyboardType="numeric"
              />
              {logCaloriesError ? <Text className="text-xs text-orange mt-0.5 font-sans">{logCaloriesError}</Text> : null}
            </View>
            <View className="flex-1">
              <Text className="text-xs font-sans text-brown mb-1">Protein</Text>
              <TextInput
                className="bg-white border border-cream-deeper rounded-lg px-3 py-2 text-sm text-warm-dark"
                placeholder="g"
                placeholderTextColor="#B8A68E"
                value={logProtein}
                onChangeText={(text) => handleMacroChange('protein', text)}
                keyboardType="numeric"
              />
              {logProteinError ? <Text className="text-xs text-orange mt-0.5 font-sans">{logProteinError}</Text> : null}
            </View>
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="text-xs font-sans text-brown mb-1">Carbs</Text>
              <TextInput
                className="bg-white border border-cream-deeper rounded-lg px-3 py-2 text-sm text-warm-dark"
                placeholder="g"
                placeholderTextColor="#B8A68E"
                value={logCarbs}
                onChangeText={(text) => handleMacroChange('carbs', text)}
                keyboardType="numeric"
              />
              {logCarbsError ? <Text className="text-xs text-orange mt-0.5 font-sans">{logCarbsError}</Text> : null}
            </View>
            <View className="flex-1">
              <Text className="text-xs font-sans text-brown mb-1">Fat</Text>
              <TextInput
                className="bg-white border border-cream-deeper rounded-lg px-3 py-2 text-sm text-warm-dark"
                placeholder="g"
                placeholderTextColor="#B8A68E"
                value={logFat}
                onChangeText={(text) => handleMacroChange('fat', text)}
                keyboardType="numeric"
              />
              {logFatError ? <Text className="text-xs text-orange mt-0.5 font-sans">{logFatError}</Text> : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
