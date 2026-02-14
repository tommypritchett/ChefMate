import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { recipesApi, favoritesApi } from '../../src/services/api';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await recipesApi.getRecipe(id);
        setRecipe(data.recipe);
      } catch (err) {
        console.error('Failed to load recipe:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSave = async () => {
    if (!recipe) return;
    try {
      if (saved) {
        await favoritesApi.unsaveRecipe(recipe.id);
        setSaved(false);
      } else {
        await favoritesApi.saveRecipe({ recipeId: recipe.id });
        setSaved(true);
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">Recipe not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary-500">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
  const nutrition = recipe.nutrition || {};
  const ingredients = recipe.ingredients || [];
  const instructions = recipe.instructions || [];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header image */}
      {recipe.imageUrl ? (
        <Image source={{ uri: recipe.imageUrl }} className="w-full h-56" contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View className="w-full h-56 bg-gray-200 items-center justify-center">
          <Ionicons name="restaurant-outline" size={60} color="#d1d5db" />
        </View>
      )}

      {/* Back button overlay */}
      <TouchableOpacity
        onPress={() => router.back()}
        className="absolute top-12 left-4 bg-white/90 rounded-full w-10 h-10 items-center justify-center"
      >
        <Ionicons name="arrow-back" size={22} color="#374151" />
      </TouchableOpacity>

      {/* Save button overlay */}
      <TouchableOpacity
        onPress={handleSave}
        className="absolute top-12 right-4 bg-white/90 rounded-full w-10 h-10 items-center justify-center"
      >
        <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? '#ef4444' : '#374151'} />
      </TouchableOpacity>

      <View className="px-4 py-4">
        {/* Title & brand */}
        <Text className="text-2xl font-bold text-gray-800">{recipe.title}</Text>
        {recipe.brand && (
          <Text className="text-sm text-primary-600 mt-1">Inspired by {recipe.brand}</Text>
        )}
        <Text className="text-gray-500 mt-2">{recipe.description}</Text>

        {/* Stats row */}
        <View className="flex-row justify-around bg-white rounded-xl p-4 mt-4">
          <View className="items-center">
            <Ionicons name="time-outline" size={20} color="#10b981" />
            <Text className="text-xs text-gray-500 mt-1">Total</Text>
            <Text className="text-sm font-semibold text-gray-800">{totalTime} min</Text>
          </View>
          <View className="items-center">
            <Ionicons name="flame-outline" size={20} color="#10b981" />
            <Text className="text-xs text-gray-500 mt-1">Calories</Text>
            <Text className="text-sm font-semibold text-gray-800">{nutrition.calories || '—'}</Text>
          </View>
          <View className="items-center">
            <Ionicons name="people-outline" size={20} color="#10b981" />
            <Text className="text-xs text-gray-500 mt-1">Servings</Text>
            <Text className="text-sm font-semibold text-gray-800">{recipe.servings}</Text>
          </View>
          <View className="items-center">
            <Ionicons name="speedometer-outline" size={20} color="#10b981" />
            <Text className="text-xs text-gray-500 mt-1">Difficulty</Text>
            <Text className="text-sm font-semibold text-gray-800 capitalize">{recipe.difficulty}</Text>
          </View>
        </View>

        {/* Nutrition breakdown */}
        {nutrition.protein && (
          <View className="bg-white rounded-xl p-4 mt-3">
            <Text className="text-base font-semibold text-gray-800 mb-3">Nutrition per serving</Text>
            <View className="flex-row justify-between">
              {[
                { label: 'Protein', value: `${nutrition.protein}g`, color: '#3b82f6' },
                { label: 'Carbs', value: `${nutrition.carbs}g`, color: '#f59e0b' },
                { label: 'Fat', value: `${nutrition.fat}g`, color: '#ef4444' },
                { label: 'Fiber', value: `${nutrition.fiber}g`, color: '#10b981' },
              ].map((item) => (
                <View key={item.label} className="items-center flex-1">
                  <View className="w-10 h-10 rounded-full items-center justify-center mb-1" style={{ backgroundColor: item.color + '20' }}>
                    <Text className="text-xs font-bold" style={{ color: item.color }}>{item.value}</Text>
                  </View>
                  <Text className="text-xs text-gray-500">{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Ingredients */}
        <View className="bg-white rounded-xl p-4 mt-3">
          <Text className="text-base font-semibold text-gray-800 mb-3">
            Ingredients ({ingredients.length})
          </Text>
          {ingredients.map((ing: any, i: number) => (
            <View key={i} className="flex-row items-start py-2 border-b border-gray-100">
              <View className="w-5 h-5 rounded-full bg-primary-100 items-center justify-center mr-3 mt-0.5">
                <View className="w-2 h-2 rounded-full bg-primary-500" />
              </View>
              <Text className="flex-1 text-sm text-gray-700">
                <Text className="font-medium">{ing.amount} {ing.unit}</Text> {ing.name}
                {ing.notes ? <Text className="text-gray-400"> ({ing.notes})</Text> : null}
              </Text>
            </View>
          ))}
        </View>

        {/* Instructions */}
        <View className="bg-white rounded-xl p-4 mt-3 mb-8">
          <Text className="text-base font-semibold text-gray-800 mb-3">Instructions</Text>
          {instructions.map((step: any, i: number) => (
            <View key={i} className="flex-row mb-4">
              <View className="w-7 h-7 rounded-full bg-primary-500 items-center justify-center mr-3 mt-0.5">
                <Text className="text-white text-xs font-bold">{step.step || i + 1}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-700 leading-5">{step.text}</Text>
                {step.tips && (
                  <Text className="text-xs text-primary-600 mt-1 italic">{step.tips}</Text>
                )}
                {step.time && (
                  <Text className="text-xs text-gray-400 mt-1">{step.time} min</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
