import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { recipesApi, favoritesApi, inventoryApi, shoppingApi, recipeCostApi } from '../../src/services/api';

type IngredientStatus = {
  name: string;
  amount: number;
  unit: string;
  notes?: string;
  inInventory: boolean;
  inventoryName?: string;
};

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [ingredientStatuses, setIngredientStatuses] = useState<IngredientStatus[]>([]);
  const [showListPicker, setShowListPicker] = useState(false);
  const [shoppingLists, setShoppingLists] = useState<any[]>([]);
  const [addingToList, setAddingToList] = useState(false);
  const [costData, setCostData] = useState<any>(null);
  const [loadingCost, setLoadingCost] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [recipeData, inventoryData] = await Promise.all([
          recipesApi.getRecipe(id),
          inventoryApi.getInventory(),
        ]);
        setRecipe(recipeData.recipe);

        // Compare ingredients against inventory
        const inventoryItems = inventoryData.items || [];
        const invNames = inventoryItems.map((i: any) => i.name.toLowerCase());
        const ings = recipeData.recipe.ingredients || [];
        const statuses: IngredientStatus[] = ings.map((ing: any) => {
          const ingName = (ing.name || '').toLowerCase();
          const match = invNames.find((inv: string) =>
            inv.includes(ingName) || ingName.includes(inv) ||
            ingName.split(' ').some((w: string) => w.length > 3 && inv.includes(w))
          );
          return {
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            notes: ing.notes,
            inInventory: !!match,
            inventoryName: match || undefined,
          };
        });
        setIngredientStatuses(statuses);
      } catch (err) {
        console.error('Failed to load recipe:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Fetch cost estimation when recipe loads
  useEffect(() => {
    if (!recipe?.id) return;
    (async () => {
      setLoadingCost(true);
      try {
        let lat: number | undefined, lng: number | undefined;
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
        const data = await recipeCostApi.getRecipeCost(recipe.id, lat, lng);
        setCostData(data);
      } catch {
        // Cost estimation unavailable — not critical
      } finally {
        setLoadingCost(false);
      }
    })();
  }, [recipe?.id]);

  const missingItems = ingredientStatuses.filter(i => !i.inInventory);
  const haveCount = ingredientStatuses.filter(i => i.inInventory).length;
  const totalCount = ingredientStatuses.length;
  const coveragePercent = totalCount > 0 ? Math.round((haveCount / totalCount) * 100) : 0;

  const handleAddMissing = async () => {
    try {
      const data = await shoppingApi.getLists();
      setShoppingLists(data.lists || []);
      setShowListPicker(true);
    } catch (err) {
      console.error('Failed to fetch lists:', err);
    }
  };

  const handleAddToList = async (listId: string) => {
    setAddingToList(true);
    try {
      for (const item of missingItems) {
        await shoppingApi.addItem(listId, {
          name: item.name,
          quantity: item.amount || undefined,
          unit: item.unit || undefined,
        });
      }
      setShowListPicker(false);
      Alert.alert('Added!', `${missingItems.length} missing item(s) added to your shopping list.`);
    } catch (err) {
      console.error('Failed to add items:', err);
      Alert.alert('Error', 'Failed to add items to shopping list.');
    } finally {
      setAddingToList(false);
    }
  };

  const handleCreateListAndAdd = async () => {
    setAddingToList(true);
    try {
      const result = await shoppingApi.createList({
        name: `${recipe?.title || 'Recipe'} Ingredients`,
        sourceType: 'recipe',
        items: missingItems.map(i => ({
          name: i.name,
          quantity: i.amount || undefined,
          unit: i.unit || undefined,
        })),
      });
      setShowListPicker(false);
      Alert.alert('Created!', `New list "${result.list.name}" with ${missingItems.length} item(s).`);
    } catch (err) {
      console.error('Failed to create list:', err);
      Alert.alert('Error', 'Failed to create shopping list.');
    } finally {
      setAddingToList(false);
    }
  };

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

        {/* Ingredients with Inventory Indicators */}
        <View className="bg-white rounded-xl p-4 mt-3">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-gray-800">
              Ingredients ({totalCount})
            </Text>
            {totalCount > 0 && (
              <View className="flex-row items-center bg-gray-50 px-2.5 py-1 rounded-lg">
                <Ionicons
                  name={coveragePercent === 100 ? 'checkmark-circle' : 'pie-chart-outline'}
                  size={14}
                  color={coveragePercent === 100 ? '#10b981' : coveragePercent >= 50 ? '#f59e0b' : '#ef4444'}
                />
                <Text className={`text-xs font-medium ml-1 ${
                  coveragePercent === 100 ? 'text-primary-600' : coveragePercent >= 50 ? 'text-amber-600' : 'text-red-500'
                }`}>
                  {haveCount}/{totalCount} in inventory ({coveragePercent}%)
                </Text>
              </View>
            )}
          </View>
          {ingredientStatuses.map((ing, i) => (
            <View key={i} className="flex-row items-start py-2 border-b border-gray-100">
              <View className={`w-5 h-5 rounded-full items-center justify-center mr-3 mt-0.5 ${
                ing.inInventory ? 'bg-primary-100' : 'bg-red-50'
              }`}>
                <Ionicons
                  name={ing.inInventory ? 'checkmark' : 'close'}
                  size={12}
                  color={ing.inInventory ? '#10b981' : '#ef4444'}
                />
              </View>
              <Text className={`flex-1 text-sm ${ing.inInventory ? 'text-gray-700' : 'text-gray-500'}`}>
                <Text className="font-medium">{ing.amount} {ing.unit}</Text> {ing.name}
                {ing.notes ? <Text className="text-gray-400"> ({ing.notes})</Text> : null}
              </Text>
            </View>
          ))}

          {/* Add Missing to Shopping List button */}
          {missingItems.length > 0 && (
            <TouchableOpacity
              onPress={handleAddMissing}
              className="flex-row items-center justify-center bg-primary-50 border border-primary-200 rounded-xl py-3 mt-3"
            >
              <Ionicons name="cart-outline" size={18} color="#10b981" />
              <Text className="text-sm font-medium text-primary-600 ml-2">
                Add {missingItems.length} Missing to Shopping List
              </Text>
            </TouchableOpacity>
          )}
          {missingItems.length === 0 && totalCount > 0 && (
            <View className="flex-row items-center justify-center bg-primary-50 rounded-xl py-3 mt-3">
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              <Text className="text-sm font-medium text-primary-600 ml-2">
                You have everything! Ready to cook
              </Text>
            </View>
          )}
        </View>

        {/* Cost Estimation Card */}
        {(costData || loadingCost) && (
          <View className="bg-white rounded-xl p-4 mt-3">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Ionicons name="pricetag-outline" size={18} color="#10b981" />
                <Text className="text-base font-semibold text-gray-800 ml-2">Estimated Cost</Text>
              </View>
              {costData?.storeName && (
                <Text className="text-xs text-gray-400">at {costData.storeName}</Text>
              )}
            </View>
            {loadingCost ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color="#10b981" />
                <Text className="text-xs text-gray-400 mt-2">Estimating cost...</Text>
              </View>
            ) : costData ? (
              <>
                <View className="flex-row items-baseline gap-3 mb-3">
                  <Text className="text-2xl font-bold text-gray-800">
                    ${costData.totalCost?.toFixed(2)}
                  </Text>
                  {costData.perServing != null && (
                    <Text className="text-sm text-gray-500">
                      ${costData.perServing.toFixed(2)}/serving
                    </Text>
                  )}
                </View>
                {costData.ingredients?.map((ing: any, i: number) => (
                  <View key={i} className="flex-row items-center justify-between py-1.5 border-t border-gray-50">
                    <View className="flex-1 flex-row items-center">
                      <Text className="text-sm text-gray-600">{ing.name}</Text>
                      {ing.isEstimated && (
                        <View className="ml-1.5 bg-amber-50 px-1 py-0.5 rounded">
                          <Text className="text-[8px] text-amber-600 font-medium">EST</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm font-medium text-gray-700">
                      {ing.price != null ? `$${ing.price.toFixed(2)}` : '—'}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}
          </View>
        )}

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

      {/* Shopping List Picker Modal */}
      <Modal
        visible={showListPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowListPicker(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={() => !addingToList && setShowListPicker(false)}
        >
          <View className="bg-white rounded-t-2xl px-4 pt-4 pb-8">
            <Text className="text-base font-semibold text-gray-800 text-center mb-1">
              Add to Shopping List
            </Text>
            <Text className="text-sm text-gray-500 text-center mb-4">
              {missingItems.length} missing ingredient{missingItems.length !== 1 ? 's' : ''}
            </Text>

            {addingToList ? (
              <View className="items-center py-6">
                <ActivityIndicator size="small" color="#10b981" />
                <Text className="text-sm text-gray-400 mt-2">Adding items...</Text>
              </View>
            ) : (
              <>
                {shoppingLists.map((list: any) => (
                  <TouchableOpacity
                    key={list.id}
                    className="flex-row items-center py-3 border-b border-gray-100"
                    onPress={() => handleAddToList(list.id)}
                  >
                    <Ionicons name="list-outline" size={20} color="#6b7280" />
                    <View className="flex-1 ml-3">
                      <Text className="text-sm font-medium text-gray-800">{list.name}</Text>
                      <Text className="text-xs text-gray-400">
                        {list.items?.length || 0} items
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={20} color="#10b981" />
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  className="flex-row items-center py-3 mt-1"
                  onPress={handleCreateListAndAdd}
                >
                  <Ionicons name="add-outline" size={20} color="#10b981" />
                  <Text className="text-sm font-medium text-primary-600 ml-3">
                    Create New List
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="mt-2 py-2"
                  onPress={() => setShowListPicker(false)}
                >
                  <Text className="text-sm text-gray-400 text-center">Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}
