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
        // Cost estimation unavailable
      } finally {
        setLoadingCost(false);
      }
    })();
  }, [recipe?.id]);

  const haveItems = ingredientStatuses.filter(i => i.inInventory);
  const missingItems = ingredientStatuses.filter(i => !i.inInventory);
  const totalCount = ingredientStatuses.length;
  const coveragePercent = totalCount > 0 ? Math.round((haveItems.length / totalCount) * 100) : 0;

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
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator size="large" color="#D4652E" />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <Text className="text-brown font-sans">Recipe not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-orange font-sans-semibold">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
  const nutrition = recipe.nutrition || {};
  const ingredients = recipe.ingredients || [];
  const instructions = recipe.instructions || [];

  return (
    <ScrollView className="flex-1 bg-cream">
      {/* Hero image */}
      {recipe.imageUrl ? (
        <Image source={{ uri: recipe.imageUrl }} className="w-full h-72" contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View className="w-full h-72 bg-cream-dark items-center justify-center">
          <Ionicons name="restaurant-outline" size={60} color="#B8A68E" />
        </View>
      )}

      {/* Back button overlay */}
      <TouchableOpacity
        onPress={() => router.back()}
        className="absolute top-14 left-5 rounded-2xl w-10 h-10 items-center justify-center"
        style={{ backgroundColor: 'rgba(255,251,245,0.85)' }}
      >
        <Ionicons name="arrow-back" size={20} color="#2D2520" />
      </TouchableOpacity>

      {/* Save button overlay */}
      <TouchableOpacity
        onPress={handleSave}
        className="absolute top-14 right-5 rounded-2xl w-10 h-10 items-center justify-center"
        style={{ backgroundColor: 'rgba(255,251,245,0.85)' }}
      >
        <Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={saved ? '#E8445A' : '#2D2520'} />
      </TouchableOpacity>

      <View className="px-6 py-5 -mt-6 bg-cream rounded-t-3xl">
        {/* Title & brand */}
        <Text className="text-2xl font-serif-bold text-warm-dark leading-tight">{recipe.title}</Text>
        {recipe.brand && (
          <Text className="text-sm text-orange font-sans-semibold mt-1.5">Inspired by {recipe.brand}</Text>
        )}
        <Text className="text-brown mt-2 font-sans leading-6 text-sm">{recipe.description}</Text>

        {/* Stats row */}
        <View className="flex-row justify-around bg-white rounded-2xl p-4 mt-5"
          style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
        >
          <View className="items-center">
            <View className="w-9 h-9 rounded-xl bg-orange-light items-center justify-center mb-1.5">
              <Ionicons name="time-outline" size={18} color="#D4652E" />
            </View>
            <Text className="text-sm font-sans-bold text-warm-dark">{totalTime} min</Text>
            <Text className="text-[10px] text-brown-light font-sans-medium uppercase" style={{ letterSpacing: 0.5 }}>Total</Text>
          </View>
          <View className="items-center">
            <View className="w-9 h-9 rounded-xl items-center justify-center mb-1.5" style={{ backgroundColor: '#FEE2E2' }}>
              <Ionicons name="flame-outline" size={18} color="#991B1B" />
            </View>
            <Text className="text-sm font-sans-bold text-warm-dark">{nutrition.calories || '—'}</Text>
            <Text className="text-[10px] text-brown-light font-sans-medium uppercase" style={{ letterSpacing: 0.5 }}>Calories</Text>
          </View>
          <View className="items-center">
            <View className="w-9 h-9 rounded-xl items-center justify-center mb-1.5" style={{ backgroundColor: '#E0E7FF' }}>
              <Ionicons name="people-outline" size={18} color="#3730A3" />
            </View>
            <Text className="text-sm font-sans-bold text-warm-dark">{recipe.servings}</Text>
            <Text className="text-[10px] text-brown-light font-sans-medium uppercase" style={{ letterSpacing: 0.5 }}>Servings</Text>
          </View>
          <View className="items-center">
            <View className="w-9 h-9 rounded-xl bg-orange-light items-center justify-center mb-1.5">
              <Ionicons name="speedometer-outline" size={18} color="#D4652E" />
            </View>
            <Text className="text-sm font-sans-bold text-warm-dark capitalize">{recipe.difficulty}</Text>
            <Text className="text-[10px] text-brown-light font-sans-medium uppercase" style={{ letterSpacing: 0.5 }}>Difficulty</Text>
          </View>
        </View>

        {/* Nutrition breakdown */}
        {nutrition.protein && (
          <View className="bg-white rounded-2xl p-4 mt-4"
            style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
          >
            <Text className="text-lg font-serif-bold text-warm-dark mb-4">Nutrition per Serving</Text>
            <View className="flex-row justify-between">
              {[
                { label: 'Protein', value: `${nutrition.protein}g`, color: '#3b82f6' },
                { label: 'Carbs', value: `${nutrition.carbs}g`, color: '#f59e0b' },
                { label: 'Fat', value: `${nutrition.fat}g`, color: '#ef4444' },
                { label: 'Fiber', value: `${nutrition.fiber}g`, color: '#D4652E' },
              ].map((item) => (
                <View key={item.label} className="items-center flex-1">
                  <View className="w-12 h-12 rounded-full items-center justify-center mb-1.5" style={{ backgroundColor: item.color + '15', borderWidth: 3, borderColor: item.color + '30' }}>
                    <Text className="text-xs font-sans-bold" style={{ color: item.color }}>{item.value}</Text>
                  </View>
                  <Text className="text-xs text-brown font-sans-medium">{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Ingredients with Have/Need Split */}
        <View className="mt-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-serif-bold text-warm-dark">Ingredients</Text>
            {totalCount > 0 && (
              <View className="flex-row items-center bg-orange-light px-3 py-1.5 rounded-full">
                <Ionicons
                  name={coveragePercent === 100 ? 'checkmark-circle' : 'pie-chart-outline'}
                  size={13}
                  color="#D4652E"
                />
                <Text className="text-xs font-sans-semibold text-orange ml-1.5">
                  {haveItems.length}/{totalCount} ({coveragePercent}%)
                </Text>
              </View>
            )}
          </View>

          {/* In Your Kitchen */}
          {haveItems.length > 0 && (
            <View className="mb-4">
              <View className="flex-row items-center mb-2.5 gap-2">
                <Ionicons name="home-outline" size={14} color="#D4652E" />
                <Text className="text-xs font-sans-bold text-orange uppercase" style={{ letterSpacing: 1 }}>
                  In Your Kitchen
                </Text>
                <Text className="text-xs text-orange font-sans" style={{ opacity: 0.7 }}>{haveItems.length} items</Text>
              </View>
              <View className="bg-orange-light rounded-2xl overflow-hidden">
                {haveItems.map((ing, i) => (
                  <View key={i} className={`flex-row items-center px-4 py-3 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'rgba(212,101,46,0.1)' }}>
                    <View className="w-6 h-6 rounded-lg bg-orange items-center justify-center mr-3">
                      <Ionicons name="checkmark" size={14} color="white" />
                    </View>
                    <Text className="flex-1 text-sm text-warm-dark font-sans">{ing.name}</Text>
                    <Text className="text-sm text-brown font-sans-medium">
                      {ing.amount} {ing.unit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Need to Buy */}
          {missingItems.length > 0 && (
            <View className="mb-4">
              <View className="flex-row items-center mb-2.5 gap-2">
                <Ionicons name="cart-outline" size={14} color="#D4652E" />
                <Text className="text-xs font-sans-bold text-orange uppercase" style={{ letterSpacing: 1 }}>
                  Need to Buy
                </Text>
                <Text className="text-xs text-orange font-sans" style={{ opacity: 0.7 }}>{missingItems.length} items</Text>
              </View>
              <View className="bg-white rounded-2xl overflow-hidden border-2 border-orange-soft">
                {missingItems.map((ing, i) => (
                  <View
                    key={i}
                    className={`flex-row items-center px-4 py-3 ${i > 0 ? 'border-t' : ''}`}
                    style={{ borderColor: 'rgba(212,101,46,0.08)', borderLeftWidth: 4, borderLeftColor: '#D4652E' }}
                  >
                    <View className="w-6 h-6 rounded-lg bg-orange-light items-center justify-center mr-3">
                      <Ionicons name="cart-outline" size={13} color="#D4652E" />
                    </View>
                    <Text className="flex-1 text-sm text-warm-soft font-sans">{ing.name}</Text>
                    <Text className="text-sm text-brown font-sans-medium">
                      {ing.amount} {ing.unit}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Add Missing button */}
              <TouchableOpacity
                onPress={handleAddMissing}
                className="flex-row items-center justify-center bg-orange rounded-2xl py-4 mt-3"
                style={{ shadowColor: '#D4652E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 }}
                activeOpacity={0.85}
              >
                <Ionicons name="cart-outline" size={18} color="white" />
                <Text className="text-white font-sans-bold text-base ml-2.5">
                  Add {missingItems.length} Missing to Shopping List
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {missingItems.length === 0 && totalCount > 0 && (
            <View className="flex-row items-center justify-center bg-orange-light rounded-2xl py-4">
              <Ionicons name="checkmark-circle" size={20} color="#D4652E" />
              <Text className="text-base font-sans-semibold text-orange ml-2">
                You have everything! Ready to cook
              </Text>
            </View>
          )}
        </View>

        {/* Cost Estimation Card */}
        {(costData || loadingCost) && (
          <View className="bg-white rounded-2xl p-4 mt-4"
            style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Ionicons name="pricetag-outline" size={16} color="#D4652E" />
                <Text className="text-base font-serif-semibold text-warm-dark ml-2">Estimated Cost</Text>
              </View>
              {costData?.storeName && (
                <Text className="text-xs text-brown-light font-sans">at {costData.storeName}</Text>
              )}
            </View>
            {loadingCost ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color="#D4652E" />
                <Text className="text-xs text-brown-light font-sans mt-2">Estimating cost...</Text>
              </View>
            ) : costData ? (
              <>
                <View className="flex-row items-baseline gap-3 mb-3">
                  <Text className="text-2xl font-sans-bold text-warm-dark">
                    ${costData.totalCost?.toFixed(2)}
                  </Text>
                  {costData.perServing != null && (
                    <Text className="text-sm text-brown font-sans">
                      ${costData.perServing.toFixed(2)}/serving
                    </Text>
                  )}
                </View>
                {costData.ingredients?.map((ing: any, i: number) => (
                  <View key={i} className="flex-row items-center justify-between py-1.5 border-t border-cream-dark">
                    <View className="flex-1 flex-row items-center">
                      <Text className="text-sm text-brown font-sans">{ing.name}</Text>
                      {ing.isEstimated && (
                        <View className="ml-1.5 bg-orange-light px-1.5 py-0.5 rounded">
                          <Text className="text-[8px] text-orange font-sans-bold">EST</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm font-sans-semibold text-warm-dark">
                      {ing.price != null ? `$${ing.price.toFixed(2)}` : '—'}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}
          </View>
        )}

        {/* Instructions */}
        <View className="mt-5 mb-10">
          <Text className="text-lg font-serif-bold text-warm-dark mb-4">Instructions</Text>
          {instructions.map((step: any, i: number) => (
            <View key={i} className="flex-row mb-5">
              <View className="w-9 h-9 rounded-xl bg-warm-dark items-center justify-center mr-4 mt-0.5">
                <Text className="text-cream text-sm font-sans-bold">{step.step || i + 1}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-warm-soft font-sans leading-6">{step.text}</Text>
                {step.tips && (
                  <Text className="text-xs text-orange font-sans-medium mt-1.5 italic">{step.tips}</Text>
                )}
                {step.time && (
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="time-outline" size={11} color="#B8A68E" />
                    <Text className="text-xs text-brown-light font-sans ml-1">{step.time} min</Text>
                  </View>
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
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(45,37,32,0.5)' }}
          activeOpacity={1}
          onPress={() => !addingToList && setShowListPicker(false)}
        >
          <View className="bg-cream rounded-t-3xl px-5 pt-5 pb-10">
            <Text className="text-base font-serif-bold text-warm-dark text-center mb-1">
              Add to Shopping List
            </Text>
            <Text className="text-sm text-brown text-center font-sans mb-5">
              {missingItems.length} missing ingredient{missingItems.length !== 1 ? 's' : ''}
            </Text>

            {addingToList ? (
              <View className="items-center py-6">
                <ActivityIndicator size="small" color="#D4652E" />
                <Text className="text-sm text-brown-light font-sans mt-2">Adding items...</Text>
              </View>
            ) : (
              <>
                {shoppingLists.map((list: any) => (
                  <TouchableOpacity
                    key={list.id}
                    className="flex-row items-center py-3.5 border-b border-cream-dark"
                    onPress={() => handleAddToList(list.id)}
                  >
                    <Ionicons name="list-outline" size={20} color="#8B7355" />
                    <View className="flex-1 ml-3">
                      <Text className="text-sm font-sans-semibold text-warm-dark">{list.name}</Text>
                      <Text className="text-xs text-brown-light font-sans">
                        {list.items?.length || 0} items
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={20} color="#D4652E" />
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  className="flex-row items-center py-3.5 mt-1"
                  onPress={handleCreateListAndAdd}
                >
                  <Ionicons name="add-outline" size={20} color="#D4652E" />
                  <Text className="text-sm font-sans-semibold text-orange ml-3">
                    Create New List
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="mt-3 py-2"
                  onPress={() => setShowListPicker(false)}
                >
                  <Text className="text-sm text-brown-light text-center font-sans">Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}
