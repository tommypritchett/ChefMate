import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuthStore } from '../src/store/authStore';
import { authApi, inventoryApi, shoppingApi } from '../src/services/api';
import { PRIMARY_GOALS, TRACKING_GOALS } from '../src/components/health/nutritionHelpers';
import useSpeechRecognition from '../src/hooks/useSpeechRecognition';

const DIETARY_OPTIONS = PRIMARY_GOALS;
const QUICK_GOAL_OPTIONS = TRACKING_GOALS.filter(g => g.key !== 'weight');

const STEPS = ['welcome', 'diet', 'goals'] as const;
type Step = typeof STEPS[number];

export default function OnboardingScreen() {
  const { user, setUser } = useAuthStore();
  const [step, setStep] = useState<Step>('welcome');
  const [saving, setSaving] = useState(false);

  // Step 1 — Pantry input
  const [pantryText, setPantryText] = useState('');
  const [addingItems, setAddingItems] = useState(false);
  const [itemsAdded, setItemsAdded] = useState(0);

  // Photo scanning
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);

  // Voice input (web only — native uses keyboard dictation)
  const { isListening, transcript, isSupported: webVoiceSupported, startListening, stopListening } = useSpeechRecognition();
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  // When web voice finishes, send transcript to GPT for item extraction
  useEffect(() => {
    if (!isListening && transcript && transcript.trim().length > 0) {
      parseVoiceTranscript(transcript);
    }
  }, [isListening]);

  const parseVoiceTranscript = async (text: string) => {
    setVoiceProcessing(true);
    try {
      const result = await shoppingApi.parseItems(text);
      const parsed = (result.items || []).filter((s: string) => s.trim().length > 0);
      if (parsed.length > 0) {
        const joined = parsed.join(', ');
        setPantryText(prev => {
          const trimmed = prev.trim();
          return trimmed ? `${trimmed}, ${joined}` : joined;
        });
      } else {
        // Fallback: just add the raw transcript
        setPantryText(prev => {
          const trimmed = prev.trim();
          return trimmed ? `${trimmed}, ${text}` : text;
        });
      }
    } catch {
      // If GPT parsing fails, fall back to raw text
      setPantryText(prev => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed}, ${text}` : text;
      });
    } finally {
      setVoiceProcessing(false);
    }
  };

  // Step 2 — Dietary preferences
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);

  // Step 3 — Health goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const toggleDiet = (key: string) => {
    setSelectedDiets(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : prev.length < 2 ? [...prev, key] : prev,
    );
  };

  const toggleGoal = (key: string) => {
    setSelectedGoals(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  };

  // ─── Photo Analysis (reuses inventory pipeline) ────────────────────

  const preprocessImage = async (uri: string): Promise<string> => {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1500 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    return manipulated.base64 || '';
  };

  const handlePhotoScan = async (source: 'camera' | 'library') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access is needed to scan food items.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library access is needed.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      }

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setPhotoAnalyzing(true);
      const base64 = await preprocessImage(result.assets[0].uri);
      if (!base64) {
        Alert.alert('Error', 'Could not process image. Try a different photo.');
        setPhotoAnalyzing(false);
        return;
      }

      const analysis = await inventoryApi.analyzePhoto(base64);
      const detected = (analysis.items || []).map((item: any) => item.name || 'Unknown').filter(Boolean);

      if (detected.length === 0) {
        Alert.alert('No Food Found', analysis.message || 'No food items detected. Try a clearer photo.');
      } else {
        const names = detected.join(', ');
        setPantryText(prev => {
          const trimmed = prev.trim();
          return trimmed ? `${trimmed}, ${names}` : names;
        });
      }
    } catch (err: any) {
      console.error('Onboarding photo scan error:', err);
      Alert.alert('Error', 'Photo analysis failed. Try again or type items manually.');
    } finally {
      setPhotoAnalyzing(false);
    }
  };

  // ─── Voice button handler (native) ─────────────────────────────────

  const handleNativeVoice = () => {
    // Focus the text input so the keyboard appears with iOS dictation button
    textInputRef.current?.focus();
    Alert.alert(
      'Voice Input',
      'Tap the microphone icon on your keyboard to dictate food items. When done, tap "Add to My Food".',
    );
  };

  // ─── Add Items ─────────────────────────────────────────────────────

  const handleAddPantryItems = async () => {
    const raw = pantryText.trim();
    if (!raw) return;

    setAddingItems(true);

    // First try GPT parsing to handle natural language like "chicken steak and rice"
    let itemNames: string[];
    try {
      const result = await shoppingApi.parseItems(raw);
      itemNames = (result.items || []).filter((s: string) => s.trim().length > 0);
    } catch {
      // Fallback: split on commas/newlines
      itemNames = raw.split(/[,\n]+/).map(s => s.trim()).filter(s => s.length > 0);
    }

    if (itemNames.length === 0) {
      itemNames = raw.split(/[,\n]+/).map(s => s.trim()).filter(s => s.length > 0);
    }

    let added = 0;
    for (const name of itemNames) {
      try {
        await inventoryApi.addItem({ name, storageLocation: 'pantry' });
        added++;
      } catch {
        // skip failed items
      }
    }
    setItemsAdded(added);
    setAddingItems(false);
  };

  // ─── Finish / Skip ────────────────────────────────────────────────

  const markOnboardingComplete = async (prefs?: Record<string, any>): Promise<boolean> => {
    try {
      const payload: any = { onboardingCompleted: true };
      if (prefs) {
        const existingPrefs = user?.preferences
          ? (typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences)
          : {};
        payload.preferences = { ...existingPrefs, ...prefs };
      }
      const res = await authApi.updateProfile(payload);
      setUser(res.user);
      return true;
    } catch (err: any) {
      console.error('Onboarding save error:', err?.response?.data || err?.message || err);
      return false;
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    const prefs: Record<string, any> = {};
    if (selectedDiets.length > 0) prefs.dietaryPreferences = selectedDiets;
    if (selectedGoals.length > 0) prefs.quickGoals = selectedGoals;

    const success = await markOnboardingComplete(Object.keys(prefs).length > 0 ? prefs : undefined);
    setSaving(false);

    if (success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    const success = await markOnboardingComplete();
    setSaving(false);

    if (success) {
      router.replace('/(tabs)');
    } else {
      // Even if the API fails, let them through
      if (user) {
        setUser({ ...user, onboardingCompleted: true });
      }
      router.replace('/(tabs)');
    }
  };

  const nextStep = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const stepIndex = STEPS.indexOf(step);
  const isNative = Platform.OS !== 'web';

  return (
    <View className="flex-1 bg-cream">
      {/* Header */}
      <View style={{ backgroundColor: '#2D2520' }} className="pt-16 pb-6 px-6">
        <Text className="text-cream text-[28px] font-serif-bold tracking-tight leading-none">
          Welcome to Kitcho<Text className="text-orange"> AI</Text>
        </Text>
        <Text className="text-brown-light font-sans text-sm mt-2 opacity-80">
          Let's set up your kitchen in a few quick steps
        </Text>
      </View>

      {/* Progress dots */}
      <View className="flex-row items-center justify-center gap-2 py-4">
        {STEPS.map((s, i) => (
          <View
            key={s}
            className={`rounded-full ${i <= stepIndex ? 'bg-primary-500' : 'bg-cream-deeper'}`}
            style={{ width: i === stepIndex ? 24 : 8, height: 8, borderRadius: 4 }}
          />
        ))}
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Step 1: Welcome / Pantry ── */}
        {step === 'welcome' && (
          <View>
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-primary-50 items-center justify-center mb-3">
                <Text style={{ fontSize: 32 }}>🍳</Text>
              </View>
              <Text className="text-warm-dark text-xl font-serif-semibold text-center">
                What's in your kitchen?
              </Text>
              <Text className="text-brown text-sm font-sans text-center mt-1 max-w-[280px]">
                Type, scan a photo, or use your voice to add items
              </Text>
            </View>

            {/* Input mode buttons — Camera, Photo, Voice */}
            <View className="flex-row gap-2 mb-3">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center bg-white border border-cream-deeper rounded-xl py-3 gap-2"
                onPress={() => handlePhotoScan('camera')}
                disabled={photoAnalyzing}
              >
                <Ionicons name="camera-outline" size={20} color="#D4652E" />
                <Text className="text-sm font-sans-semibold text-warm-dark">Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center bg-white border border-cream-deeper rounded-xl py-3 gap-2"
                onPress={() => handlePhotoScan('library')}
                disabled={photoAnalyzing}
              >
                <Ionicons name="image-outline" size={20} color="#D4652E" />
                <Text className="text-sm font-sans-semibold text-warm-dark">Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 flex-row items-center justify-center border rounded-xl py-3 gap-2 ${
                  isListening ? 'bg-red-50 border-red-300' : 'bg-white border-cream-deeper'
                }`}
                onPress={isNative ? handleNativeVoice : (isListening ? stopListening : startListening)}
              >
                <Ionicons
                  name={isListening ? 'stop-circle' : 'mic-outline'}
                  size={20}
                  color={isListening ? '#ef4444' : '#D4652E'}
                />
                <Text className={`text-sm font-sans-semibold ${isListening ? 'text-red-500' : 'text-warm-dark'}`}>
                  {isListening ? 'Stop' : 'Voice'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Status indicators */}
            {photoAnalyzing && (
              <View className="flex-row items-center justify-center bg-primary-50 rounded-xl py-3 mb-3 gap-2">
                <ActivityIndicator size="small" color="#D4652E" />
                <Text className="text-sm font-sans text-primary-700">Analyzing photo...</Text>
              </View>
            )}

            {isListening && (
              <View className="bg-red-50 rounded-xl py-3 px-4 mb-3">
                <View className="flex-row items-center gap-2 mb-1">
                  <View className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <Text className="text-sm font-sans-semibold text-red-600">Listening...</Text>
                </View>
                {transcript ? (
                  <Text className="text-sm font-sans text-warm-dark mt-1">{transcript}</Text>
                ) : (
                  <Text className="text-xs font-sans text-red-400">Say your food items aloud</Text>
                )}
              </View>
            )}

            {voiceProcessing && (
              <View className="flex-row items-center justify-center bg-primary-50 rounded-xl py-3 mb-3 gap-2">
                <ActivityIndicator size="small" color="#D4652E" />
                <Text className="text-sm font-sans text-primary-700">Processing voice input...</Text>
              </View>
            )}

            <TextInput
              ref={textInputRef}
              className="bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark min-h-[100px]"
              placeholder="e.g. chicken, rice, broccoli, olive oil, eggs..."
              placeholderTextColor="#B8A68E"
              value={pantryText}
              onChangeText={setPantryText}
              multiline
              textAlignVertical="top"
            />

            {pantryText.trim().length > 0 && itemsAdded === 0 && (
              <TouchableOpacity
                className="bg-primary-500 rounded-xl py-3 mt-3 items-center flex-row justify-center gap-2"
                onPress={handleAddPantryItems}
                disabled={addingItems}
              >
                {addingItems ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                )}
                <Text className="text-white font-sans-semibold text-sm">
                  {addingItems ? 'Adding...' : 'Add to My Food'}
                </Text>
              </TouchableOpacity>
            )}

            {itemsAdded > 0 && (
              <View className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 mt-3 flex-row items-center gap-2">
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text className="text-primary-700 font-sans-semibold text-sm">
                  {itemsAdded} item{itemsAdded !== 1 ? 's' : ''} added to your kitchen!
                </Text>
              </View>
            )}

            <TouchableOpacity
              className="bg-warm-dark rounded-xl py-3.5 mt-6 items-center"
              onPress={nextStep}
            >
              <Text className="text-cream font-sans-semibold text-[15px]">
                {pantryText.trim() || itemsAdded > 0 ? 'Next' : 'Skip for now'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: Dietary Preferences ── */}
        {step === 'diet' && (
          <View>
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-primary-50 items-center justify-center mb-3">
                <Text style={{ fontSize: 32 }}>🥗</Text>
              </View>
              <Text className="text-warm-dark text-xl font-serif-semibold text-center">
                Any dietary preferences?
              </Text>
              <Text className="text-brown text-sm font-sans text-center mt-1 max-w-[280px]">
                Pick up to 2 — we'll tailor recipes and meal plans for you
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {DIETARY_OPTIONS.map(opt => {
                const selected = selectedDiets.includes(opt.key);
                return (
                  <TouchableOpacity
                    key={opt.key}
                    className={`flex-row items-center rounded-xl px-4 py-3.5 border ${
                      selected ? 'bg-primary-50 border-primary-400' : 'bg-white border-cream-deeper'
                    }`}
                    onPress={() => toggleDiet(opt.key)}
                  >
                    <View
                      className="w-9 h-9 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: selected ? opt.color + '20' : '#F5EDE0' }}
                    >
                      <Ionicons name={opt.icon as any} size={18} color={selected ? opt.color : '#8B7355'} />
                    </View>
                    <View className="flex-1">
                      <Text className={`font-sans-semibold text-sm ${selected ? 'text-warm-dark' : 'text-brown'}`}>
                        {opt.label}
                      </Text>
                      <Text className="text-brown-light text-xs font-sans">{opt.description}</Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={22} color="#10b981" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              className="bg-warm-dark rounded-xl py-3.5 mt-6 items-center"
              onPress={nextStep}
            >
              <Text className="text-cream font-sans-semibold text-[15px]">
                {selectedDiets.length > 0 ? 'Next' : 'Skip for now'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 3: Health Goals ── */}
        {step === 'goals' && (
          <View>
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-primary-50 items-center justify-center mb-3">
                <Text style={{ fontSize: 32 }}>🎯</Text>
              </View>
              <Text className="text-warm-dark text-xl font-serif-semibold text-center">
                What would you like to track?
              </Text>
              <Text className="text-brown text-sm font-sans text-center mt-1 max-w-[280px]">
                You can always change these later in Health Goals
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {QUICK_GOAL_OPTIONS.map(opt => {
                const selected = selectedGoals.includes(opt.key);
                return (
                  <TouchableOpacity
                    key={opt.key}
                    className={`flex-row items-center rounded-xl px-4 py-3.5 border ${
                      selected ? 'bg-primary-50 border-primary-400' : 'bg-white border-cream-deeper'
                    }`}
                    onPress={() => toggleGoal(opt.key)}
                  >
                    <View
                      className="w-9 h-9 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: selected ? opt.color + '20' : '#F5EDE0' }}
                    >
                      <Ionicons name={opt.icon as any} size={18} color={selected ? opt.color : '#8B7355'} />
                    </View>
                    <View className="flex-1">
                      <Text className={`font-sans-semibold text-sm ${selected ? 'text-warm-dark' : 'text-brown'}`}>
                        {opt.label}
                      </Text>
                      <Text className="text-brown-light text-xs font-sans">
                        Track daily {opt.key} ({opt.unit})
                      </Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={22} color="#10b981" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              className="bg-primary-500 rounded-xl py-3.5 mt-6 items-center"
              onPress={handleFinish}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-sans-bold text-[15px]">Get Cooking!</Text>
              )}
            </TouchableOpacity>

            {selectedGoals.length === 0 && (
              <TouchableOpacity className="mt-3 items-center" onPress={handleSkip} disabled={saving}>
                <Text className="text-brown font-sans text-sm">Skip for now</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Skip all */}
      {step !== 'goals' && (
        <View className="px-6 pb-8">
          <TouchableOpacity className="items-center" onPress={handleSkip} disabled={saving}>
            <Text className="text-brown font-sans text-sm">Skip setup entirely</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
