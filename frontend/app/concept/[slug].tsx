import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { conceptsApi, healthGoalsApi } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import type { RecipeConceptDetail, RecipeVariantDetail } from '../../src/types';

const VARIANT_TYPE_LABEL: Record<string, string> = {
  classic: 'Classic',
  'high-protein': 'High Protein',
  keto: 'Keto',
  vegan: 'Vegan',
  'dairy-free': 'Dairy Free',
  budget: 'Budget',
  quick: 'Quick',
  'air-fryer': 'Air Fryer',
  crockpot: 'Crockpot',
  spicy: 'Spicy',
};

const TAG_DISPLAY: Record<string, string> = {
  'high-protein': 'High Protein',
  'low-carb': 'Low-Carb',
  keto: 'Keto',
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  'dairy-free': 'Dairy-Free',
  'gluten-free': 'Gluten-Free',
  'budget-friendly': 'Budget',
  'meal-prep': 'Meal Prep',
  quick: 'Quick',
};

function buildPillLabel(variant: RecipeVariantDetail): string {
  // Build label from all dietary tags joined by " / "
  if (variant.dietaryTags.length > 0) {
    return variant.dietaryTags
      .map((tag) => TAG_DISPLAY[tag] || tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      .join(' / ');
  }
  // No tags — use the variant type label (e.g., Classic, Air Fryer, Spicy)
  return VARIANT_TYPE_LABEL[variant.variantType] || variant.title;
}

// Map user dietary preference keys (from onboarding OR health goals) to variant types
const PREFERENCE_TO_VARIANT: Record<string, string> = {
  'high-protein': 'high-protein',
  'low-carb': 'keto',
  keto: 'keto',
  vegetarian: 'vegan',
  vegan: 'vegan',
  'dairy-free': 'dairy-free',
  'gluten-free': 'classic',
};

// Health goal types that represent dietary preferences (vs tracking goals like calories/protein/weight)
const DIETARY_GOAL_TYPES = new Set([
  'high-protein', 'low-carb', 'keto', 'vegetarian', 'vegan', 'gluten-free', 'dairy-free',
]);

function pickDefaultVariant(
  variants: RecipeVariantDetail[],
  userPreferences: string[],
): RecipeVariantDetail {
  // Try each user preference in order — first match wins
  for (const pref of userPreferences) {
    const targetType = PREFERENCE_TO_VARIANT[pref];
    if (targetType) {
      const match = variants.find((v) => v.variantType === targetType);
      if (match) return match;
    }
  }
  // Fall back to isDefault flag, then first variant
  return variants.find((v) => v.isDefault) || variants[0];
}

export default function ConceptDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuthStore();
  const [concept, setConcept] = useState<RecipeConceptDetail | null>(null);
  const [variants, setVariants] = useState<RecipeVariantDetail[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<RecipeVariantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    loadConcept();
  }, [slug]);

  const loadConcept = async () => {
    try {
      setLoading(true);

      // Fetch concept + health goals in parallel
      const [data, goalsData] = await Promise.all([
        conceptsApi.getBySlug(slug!),
        healthGoalsApi.getGoals().catch(() => ({ goals: [] })),
      ]);

      setConcept(data.concept);
      setVariants(data.variants);

      // Source 1: dietaryPreferences from user.preferences JSON (set during onboarding)
      let onboardingPrefs: string[] = [];
      try {
        const prefs = user?.preferences
          ? (typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences)
          : {};
        onboardingPrefs = prefs.dietaryPreferences || [];
      } catch {}

      // Source 2: active health goals that are dietary types (e.g., "high-protein", "keto")
      const goalPrefs = (goalsData.goals || [])
        .filter((g: any) => g.isActive && DIETARY_GOAL_TYPES.has(g.goalType))
        .map((g: any) => g.goalType as string);

      // Merge both sources — health goals first (more recently set), then onboarding prefs
      const seen = new Set<string>();
      const allPrefs: string[] = [];
      for (const p of [...goalPrefs, ...onboardingPrefs]) {
        if (!seen.has(p)) { seen.add(p); allPrefs.push(p); }
      }

      const availableTypes = data.variants.map((v: RecipeVariantDetail) => v.variantType);
      console.log('[concept-detail] Onboarding prefs:', onboardingPrefs);
      console.log('[concept-detail] Health goal prefs:', goalPrefs);
      console.log('[concept-detail] Merged prefs (priority order):', allPrefs);
      console.log('[concept-detail] Available variant types:', availableTypes);

      const defaultV = pickDefaultVariant(data.variants, allPrefs);
      console.log('[concept-detail] Selected default:', defaultV?.variantType, '| isDefault flag:', defaultV?.isDefault);
      setSelectedVariant(defaultV || null);
    } catch (err) {
      console.error('Failed to load concept:', err);
      setError('Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-cream items-center justify-center">
        <ActivityIndicator size="large" color="#D4652E" />
      </View>
    );
  }

  if (error || !concept || !selectedVariant) {
    return (
      <View className="flex-1 bg-cream items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#B8A68E" />
        <Text className="text-brown-light mt-3 text-center font-sans">{error || 'Recipe not found'}</Text>
        <TouchableOpacity className="mt-4 px-6 py-2 bg-warm-dark rounded-xl" onPress={() => router.back()}>
          <Text className="text-cream font-sans-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nutrition = selectedVariant.nutrition;
  const totalTime = selectedVariant.totalTimeMinutes || 0;

  return (
    <View className="flex-1 bg-cream">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ height: 280 }}>
          {concept.heroImageUrl ? (
            <Image source={{ uri: concept.heroImageUrl }} className="w-full h-full" contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View className="w-full h-full items-center justify-center" style={{ backgroundColor: '#ecfdf5' }}>
              <Ionicons name="leaf-outline" size={64} color="#10b981" />
            </View>
          )}
          {/* Gradient overlay */}
          <View className="absolute bottom-0 left-0 right-0 h-32" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />

          {/* Back button */}
          <TouchableOpacity
            className="absolute top-14 left-5 w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,251,245,0.9)' }}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color="#2D2520" />
          </TouchableOpacity>

          {/* Save button */}
          <TouchableOpacity
            className="absolute top-14 right-5 w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,251,245,0.9)' }}
          >
            <Ionicons name="heart-outline" size={22} color="#E8445A" />
          </TouchableOpacity>
        </View>

        <View className="px-5 -mt-6 bg-cream rounded-t-3xl pt-6">
          {/* Title + tagline */}
          <Text className="text-2xl font-serif-bold text-warm-dark">{concept.name}</Text>
          {concept.tagline && (
            <Text className="text-sm text-brown-light font-sans mt-1">{concept.tagline}</Text>
          )}

          {/* Variant pill selector */}
          {variants.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-4"
              contentContainerStyle={{ gap: 8 }}
            >
              {variants.map((v) => {
                const isActive = v.id === selectedVariant.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    className={`px-4 py-2 rounded-full ${isActive ? 'bg-warm-dark' : 'bg-cream-dark border border-cream-deeper'}`}
                    onPress={() => setSelectedVariant(v)}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-sm font-sans-semibold ${isActive ? 'text-cream' : 'text-brown'}`}>
                      {buildPillLabel(v)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Stats row */}
          <View className="flex-row items-center mt-5 gap-5">
            {totalTime > 0 && (
              <View className="items-center">
                <Ionicons name="time-outline" size={20} color="#8B7355" />
                <Text className="text-xs font-sans-semibold text-warm-dark mt-1">{totalTime} min</Text>
                <Text className="text-[10px] font-sans text-brown-light">Total</Text>
              </View>
            )}
            {nutrition?.calories && (
              <View className="items-center">
                <Ionicons name="flame-outline" size={20} color="#8B7355" />
                <Text className="text-xs font-sans-semibold text-warm-dark mt-1">{nutrition.calories}</Text>
                <Text className="text-[10px] font-sans text-brown-light">Calories</Text>
              </View>
            )}
            <View className="items-center">
              <Ionicons name="people-outline" size={20} color="#8B7355" />
              <Text className="text-xs font-sans-semibold text-warm-dark mt-1">{selectedVariant.servings}</Text>
              <Text className="text-[10px] font-sans text-brown-light">Servings</Text>
            </View>
            {selectedVariant.difficulty && (
              <View className="items-center">
                <Ionicons name="speedometer-outline" size={20} color="#8B7355" />
                <Text className="text-xs font-sans-semibold text-warm-dark mt-1 capitalize">{selectedVariant.difficulty}</Text>
                <Text className="text-[10px] font-sans text-brown-light">Difficulty</Text>
              </View>
            )}
          </View>

          {/* Dietary tags */}
          {selectedVariant.dietaryTags.length > 0 && (
            <View className="flex-row flex-wrap mt-4 gap-1.5">
              {selectedVariant.dietaryTags.map((tag) => (
                <View key={tag} className="bg-orange-light px-2.5 py-1 rounded-lg">
                  <Text className="text-[10px] text-orange font-sans-bold uppercase">{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Nutrition circles */}
          {nutrition && (
            <View className="mt-6">
              <Text className="text-base font-serif-bold text-warm-dark mb-3">Nutrition per Serving</Text>
              <View className="flex-row justify-between">
                {[
                  { label: 'Protein', value: nutrition.protein, unit: 'g', color: '#10b981' },
                  { label: 'Carbs', value: nutrition.carbs, unit: 'g', color: '#F59E0B' },
                  { label: 'Fat', value: nutrition.fat, unit: 'g', color: '#D4652E' },
                  { label: 'Calories', value: nutrition.calories, unit: '', color: '#8B7355' },
                ].map((macro) => (
                  <View key={macro.label} className="items-center">
                    <View
                      className="w-16 h-16 rounded-full items-center justify-center border-[3px]"
                      style={{ borderColor: macro.color }}
                    >
                      <Text className="text-sm font-sans-bold text-warm-dark">
                        {macro.value}{macro.unit}
                      </Text>
                    </View>
                    <Text className="text-[10px] font-sans-semibold text-brown-light mt-1.5">{macro.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Ingredients */}
          <View className="mt-6">
            <Text className="text-base font-serif-bold text-warm-dark mb-3">Ingredients</Text>
            <View className="bg-white rounded-2xl p-4" style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }}>
              {selectedVariant.ingredients.map((ing, i) => (
                <View key={i} className={`flex-row items-center py-2.5 ${i < selectedVariant.ingredients.length - 1 ? 'border-b border-cream-deeper' : ''}`}>
                  <View className="w-6 h-6 rounded-full bg-cream-dark items-center justify-center mr-3">
                    <Ionicons name="ellipse" size={8} color="#D4652E" />
                  </View>
                  <Text className="flex-1 text-sm font-sans text-warm-dark">
                    <Text className="font-sans-semibold">{ing.amount} {ing.unit}</Text> {ing.name}
                    {ing.notes ? <Text className="text-brown-light"> ({ing.notes})</Text> : null}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Instructions */}
          <View className="mt-6 mb-10">
            <Text className="text-base font-serif-bold text-warm-dark mb-3">Instructions</Text>
            {selectedVariant.instructions.map((step, i) => (
              <View key={i} className="flex-row mb-4">
                <View className="w-8 h-8 rounded-full bg-warm-dark items-center justify-center mr-3 mt-0.5">
                  <Text className="text-cream text-sm font-sans-bold">{step.step_number}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-sans text-warm-dark leading-5">{step.text}</Text>
                  {step.time_minutes && (
                    <View className="flex-row items-center mt-1.5">
                      <Ionicons name="time-outline" size={12} color="#B8A68E" />
                      <Text className="text-xs text-brown-light font-sans ml-1">{step.time_minutes} min</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
