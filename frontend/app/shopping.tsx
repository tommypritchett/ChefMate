import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { shoppingApi, mealPlansApi, inventoryApi } from '../src/services/api';

const CATEGORY_ORDER = ['produce', 'dairy', 'meat', 'grains', 'condiments', 'beverages', 'other'];

export default function ShoppingScreen() {
  const [lists, setLists] = useState<any[]>([]);
  const [activeList, setActiveList] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      const data = await shoppingApi.getLists();
      const allLists = data.lists || [];
      setLists(allLists);
      // Auto-select the first active list
      const active = allLists.find((l: any) => l.isActive);
      setActiveList(active || null);
    } catch (err) {
      console.error('Failed to load shopping lists:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, []);

  const handleGenerateFromMealPlan = async () => {
    setGenerating(true);
    try {
      // Get current meal plan
      const { plans } = await mealPlansApi.getPlans();
      const now = new Date();
      const activePlan = plans.find((p: any) => {
        const end = new Date(p.endDate);
        return end >= now;
      });

      if (!activePlan || !activePlan.slots?.length) {
        Alert.alert('No Meal Plan', 'Create a meal plan with recipes first, then generate a shopping list.');
        return;
      }

      // Get inventory to diff against
      const { items: inventoryItems } = await inventoryApi.getInventory();
      const inventoryNames = new Set(inventoryItems.map((i: any) => i.name.toLowerCase()));

      // Collect all ingredients from meal plan recipes
      const ingredientMap: Record<string, { name: string; quantity: number; unit: string; category: string }> = {};
      for (const slot of activePlan.slots) {
        if (!slot.recipe?.ingredients) continue;
        const ingredients = typeof slot.recipe.ingredients === 'string'
          ? JSON.parse(slot.recipe.ingredients)
          : slot.recipe.ingredients;
        for (const ing of ingredients) {
          const key = ing.name?.toLowerCase() || 'unknown';
          if (inventoryNames.has(key)) continue; // Already in inventory
          if (!ingredientMap[key]) {
            ingredientMap[key] = {
              name: ing.name || key,
              quantity: parseFloat(ing.amount) || 1,
              unit: ing.unit || '',
              category: ing.category || 'other',
            };
          } else {
            ingredientMap[key].quantity += parseFloat(ing.amount) || 1;
          }
        }
      }

      const items = Object.values(ingredientMap);
      if (items.length === 0) {
        Alert.alert('All Stocked', 'You already have all the ingredients in your inventory!');
        return;
      }

      // Create the shopping list
      const { list } = await shoppingApi.createList({
        name: `Meal Plan - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        sourceType: 'recipe',
        items,
      });

      fetchLists();
    } catch (err) {
      console.error('Failed to generate shopping list:', err);
      Alert.alert('Error', 'Failed to generate shopping list. Make sure you have a meal plan with recipes.');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleItem = async (itemId: string, isChecked: boolean) => {
    if (!activeList) return;
    try {
      await shoppingApi.toggleItem(activeList.id, itemId, !isChecked);
      // Optimistic update
      setActiveList((prev: any) => ({
        ...prev,
        items: prev.items.map((i: any) =>
          i.id === itemId ? { ...i, isChecked: !isChecked } : i
        ),
      }));
    } catch (err) {
      console.error('Failed to toggle item:', err);
    }
  };

  const handleAddItem = async () => {
    if (!activeList || !newItemName.trim()) return;
    try {
      await shoppingApi.addItem(activeList.id, {
        name: newItemName.trim(),
        quantity: newItemQty ? parseFloat(newItemQty) : undefined,
        unit: newItemUnit || undefined,
      });
      setShowAddItem(false);
      setNewItemName('');
      setNewItemQty('');
      setNewItemUnit('');
      fetchLists();
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  };

  const handleDeleteList = (listId: string, name: string) => {
    Alert.alert('Delete List', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await shoppingApi.deleteList(listId);
          fetchLists();
        },
      },
    ]);
  };

  const handlePurchaseAll = async () => {
    if (!activeList) return;
    Alert.alert('Add to Inventory', 'Mark all items as purchased and add them to your inventory?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Add All',
        onPress: async () => {
          try {
            await shoppingApi.purchaseAll(activeList.id);
            fetchLists();
          } catch (err) {
            console.error('Failed to purchase all:', err);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const uncheckedItems = activeList?.items?.filter((i: any) => !i.isChecked) || [];
  const checkedItems = activeList?.items?.filter((i: any) => i.isChecked) || [];

  // Group unchecked by category
  const grouped: Record<string, any[]> = {};
  for (const item of uncheckedItems) {
    const cat = item.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  const sortedCategories = CATEGORY_ORDER.filter(c => grouped[c]);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-800">Shopping Lists</Text>
        <TouchableOpacity onPress={handleGenerateFromMealPlan} disabled={generating}>
          <Ionicons name="sparkles" size={22} color={generating ? '#d1d5db' : '#10b981'} />
        </TouchableOpacity>
      </View>

      {/* List selector */}
      {lists.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-white border-b border-gray-200">
          <View className="flex-row px-3 py-2 gap-2">
            {lists.map((list: any) => (
              <TouchableOpacity
                key={list.id}
                className={`px-4 py-1.5 rounded-full ${
                  activeList?.id === list.id ? 'bg-primary-500' : 'bg-gray-100'
                }`}
                onPress={() => setActiveList(list)}
                onLongPress={() => handleDeleteList(list.id, list.name)}
              >
                <Text className={`text-sm ${activeList?.id === list.id ? 'text-white font-medium' : 'text-gray-600'}`}>
                  {list.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {!activeList ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cart-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-400 mt-3 text-center">
            No shopping lists yet. Generate one from your meal plan!
          </Text>
          <TouchableOpacity
            onPress={handleGenerateFromMealPlan}
            disabled={generating}
            className="mt-4 bg-primary-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-medium">
              {generating ? 'Generating...' : 'Generate from Meal Plan'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Summary bar */}
          <View className="flex-row items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
            <Text className="text-sm text-gray-500">
              {uncheckedItems.length} items remaining
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setShowAddItem(true)}
                className="flex-row items-center bg-gray-100 px-3 py-1.5 rounded-lg"
              >
                <Ionicons name="add" size={16} color="#6b7280" />
                <Text className="text-xs text-gray-600 ml-1">Add</Text>
              </TouchableOpacity>
              {checkedItems.length > 0 && (
                <TouchableOpacity
                  onPress={handlePurchaseAll}
                  className="flex-row items-center bg-primary-500 px-3 py-1.5 rounded-lg"
                >
                  <Ionicons name="checkmark-done" size={16} color="white" />
                  <Text className="text-xs text-white ml-1">Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Unchecked items by category */}
            {sortedCategories.map(cat => (
              <View key={cat}>
                <Text className="text-xs font-semibold text-gray-400 uppercase px-4 pt-3 pb-1">
                  {cat}
                </Text>
                {grouped[cat].map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    className="flex-row items-center px-4 py-2.5 bg-white border-b border-gray-50"
                    onPress={() => handleToggleItem(item.id, item.isChecked)}
                  >
                    <View className="w-5 h-5 rounded border-2 border-gray-300 items-center justify-center mr-3" />
                    <View className="flex-1">
                      <Text className="text-sm text-gray-800">{item.name}</Text>
                      {(item.quantity || item.unit) && (
                        <Text className="text-xs text-gray-400">
                          {item.quantity} {item.unit}
                        </Text>
                      )}
                    </View>
                    {item.estimatedPrice && (
                      <Text className="text-xs text-gray-400">${item.estimatedPrice.toFixed(2)}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Checked items */}
            {checkedItems.length > 0 && (
              <View>
                <Text className="text-xs font-semibold text-gray-400 uppercase px-4 pt-4 pb-1">
                  Checked ({checkedItems.length})
                </Text>
                {checkedItems.map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    className="flex-row items-center px-4 py-2 bg-white border-b border-gray-50 opacity-60"
                    onPress={() => handleToggleItem(item.id, item.isChecked)}
                  >
                    <View className="w-5 h-5 rounded bg-primary-500 items-center justify-center mr-3">
                      <Ionicons name="checkmark" size={14} color="white" />
                    </View>
                    <Text className="text-sm text-gray-500 line-through">{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* Add Item Modal */}
      <Modal visible={showAddItem} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddItem(false)}>
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowAddItem(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">Add Item</Text>
            <TouchableOpacity onPress={handleAddItem} disabled={!newItemName.trim()}>
              <Text className={`font-medium ${newItemName.trim() ? 'text-primary-500' : 'text-gray-300'}`}>Add</Text>
            </TouchableOpacity>
          </View>
          <View className="px-4 pt-4 gap-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Item Name *</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                placeholder="e.g. Milk"
                placeholderTextColor="#9ca3af"
                value={newItemName}
                onChangeText={setNewItemName}
                autoFocus
              />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Quantity</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                  placeholder="e.g. 2"
                  placeholderTextColor="#9ca3af"
                  value={newItemQty}
                  onChangeText={setNewItemQty}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Unit</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                  placeholder="e.g. gallons"
                  placeholderTextColor="#9ca3af"
                  value={newItemUnit}
                  onChangeText={setNewItemUnit}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
