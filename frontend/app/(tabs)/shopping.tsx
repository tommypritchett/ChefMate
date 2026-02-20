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
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { shoppingApi, mealPlansApi, inventoryApi, groceryApi, krogerApi } from '../../src/services/api';

const CATEGORY_ORDER = ['produce', 'dairy', 'meat', 'grains', 'condiments', 'beverages', 'other'];

// Suggest storage location based on item category
function suggestStorage(category?: string, name?: string): string {
  const cat = (category || '').toLowerCase();
  const n = (name || '').toLowerCase();
  // Frozen items
  if (n.includes('frozen') || n.includes('ice cream')) return 'freezer';
  // Refrigerated categories
  if (['meat', 'dairy', 'produce'].includes(cat)) return 'fridge';
  // Pantry categories
  if (['grains', 'condiments', 'beverages', 'canned'].includes(cat)) return 'pantry';
  // Name-based heuristics
  if (n.includes('milk') || n.includes('cheese') || n.includes('yogurt') || n.includes('butter') || n.includes('egg')) return 'fridge';
  if (n.includes('chicken') || n.includes('beef') || n.includes('pork') || n.includes('salmon') || n.includes('shrimp')) return 'fridge';
  if (n.includes('lettuce') || n.includes('tomato') || n.includes('spinach') || n.includes('broccoli')) return 'fridge';
  return 'pantry';
}
const STORAGE_OPTIONS = ['fridge', 'freezer', 'pantry'] as const;
const STORAGE_ICONS: Record<string, string> = {
  fridge: 'snow-outline',
  freezer: 'cube-outline',
  pantry: 'file-tray-stacked-outline',
};

const KROGER_BANNERS = ['Kroger', "Mariano's", 'King Soopers', 'Fred Meyer', 'Ralphs', "Fry's", 'QFC', "Smith's", 'Dillons', "Pick 'n Save", 'Metro Market', 'Harris Teeter', 'Food 4 Less'];

export default function ShoppingScreen() {
  const [lists, setLists] = useState<any[]>([]);
  const [activeList, setActiveList] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showPriceCompare, setShowPriceCompare] = useState(false);
  const [showPurchaseAll, setShowPurchaseAll] = useState(false);
  const [showStoragePicker, setShowStoragePicker] = useState<{ itemId: string; itemName: string } | null>(null);
  const [showEditItem, setShowEditItem] = useState<any>(null);
  const [showCompletedLists, setShowCompletedLists] = useState(false);
  const [listFilter, setListFilter] = useState<'active' | 'completed' | 'new' | 'all'>('active');
  const [actionSheetItem, setActionSheetItem] = useState<any>(null);
  const [purchasePreview, setPurchasePreview] = useState<Array<{ id: string; name: string; quantity: number; unit: string; category: string; storageLocation: string }>>([]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [priceData, setPriceData] = useState<any>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [dealsStoreName, setDealsStoreName] = useState<string>('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [krogerLinked, setKrogerLinked] = useState(false);

  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const fetchLists = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await shoppingApi.getLists();
      const allLists = data.lists || [];
      setLists(allLists);
      // Auto-select the first active list
      if (activeList) {
        // Re-fetch active list data
        const updated = allLists.find((l: any) => l.id === activeList.id);
        setActiveList(updated || allLists.find((l: any) => l.isActive) || null);
      } else {
        const active = allLists.find((l: any) => l.isActive);
        setActiveList(active || null);
      }
    } catch (err) {
      console.error('Failed to load shopping lists:', err);
    } finally {
      if (isInitial) {
        setLoading(false);
        setInitialLoadDone(true);
      }
    }
  }, [activeList?.id]);

  useEffect(() => {
    fetchLists(true);
  }, []);

  // Get user location for Kroger-enhanced autocomplete + deals
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setUserLocation(coords);
          // Fetch deals from nearest Kroger-family store
          setLoadingDeals(true);
          try {
            const data = await groceryApi.getDeals(coords.lat, coords.lng, 10);
            setDeals(data.deals || []);
            setDealsStoreName(data.storeName || '');
          } catch {
            // Deals unavailable — not critical
          } finally {
            setLoadingDeals(false);
          }
        }
      } catch {}
    })();
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
      await shoppingApi.createList({
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
    // Optimistic update first
    setActiveList((prev: any) => ({
      ...prev,
      items: prev.items.map((i: any) =>
        i.id === itemId ? { ...i, isChecked: !isChecked } : i
      ),
    }));
    try {
      await shoppingApi.toggleItem(activeList.id, itemId, !isChecked);
    } catch (err) {
      console.error('Failed to toggle item:', err);
      // Revert optimistic update
      setActiveList((prev: any) => ({
        ...prev,
        items: prev.items.map((i: any) =>
          i.id === itemId ? { ...i, isChecked: isChecked } : i
        ),
      }));
    }
  };

  const handlePurchaseItem = async (itemId: string, storageLocation: string) => {
    if (!activeList) return;
    try {
      await shoppingApi.purchaseItem(activeList.id, itemId, storageLocation);
      // Optimistic update — mark as checked
      setActiveList((prev: any) => ({
        ...prev,
        items: prev.items.map((i: any) =>
          i.id === itemId ? { ...i, isChecked: true } : i
        ),
      }));
      setShowStoragePicker(null);
    } catch (err) {
      console.error('Failed to purchase item:', err);
      Alert.alert('Error', 'Failed to add item to inventory.');
    }
  };

  // Autocomplete search with debounce
  const searchTimeout = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleItemNameChange = (text: string) => {
    setNewItemName(text);
    if (searchTimeout[0]) clearTimeout(searchTimeout[0]);
    if (text.trim().length >= 2) {
      searchTimeout[0] = setTimeout(async () => {
        try {
          const opts = userLocation
            ? { kroger: true, lat: userLocation.lat, lng: userLocation.lng }
            : undefined;
          const data = await shoppingApi.searchProducts(text.trim(), opts);
          setSuggestions(data.products || []);
        } catch {
          setSuggestions([]);
        }
      }, 250);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (product: any) => {
    setNewItemName(product.name);
    setNewItemUnit(product.defaultUnit || '');
    setSuggestions([]);
  };

  const handleAddItem = async () => {
    if (!activeList || !newItemName.trim()) return;
    const itemName = newItemName.trim();
    const itemQty = newItemQty ? parseFloat(newItemQty) : undefined;
    const itemUnit = newItemUnit || undefined;

    // Close modal immediately for responsiveness
    setShowAddItem(false);
    setNewItemName('');
    setNewItemQty('');
    setNewItemUnit('');
    setSuggestions([]);

    // Optimistic update — add temp item to active list
    const tempItem = {
      id: `temp-${Date.now()}`,
      name: itemName,
      quantity: itemQty,
      unit: itemUnit,
      isChecked: false,
      category: 'other',
    };
    setActiveList((prev: any) => ({
      ...prev,
      items: [...(prev.items || []), tempItem],
    }));

    try {
      const result = await shoppingApi.addItem(activeList.id, {
        name: itemName,
        quantity: itemQty,
        unit: itemUnit,
      });
      if (result.item?.action === 'aggregated') {
        Alert.alert('Combined', `"${result.item.name}" quantity updated (combined with existing item).`);
      }
      // Refresh to get server state (replaces temp item)
      fetchLists();
    } catch (err) {
      console.error('Failed to add item:', err);
      // Revert optimistic update
      setActiveList((prev: any) => ({
        ...prev,
        items: (prev.items || []).filter((i: any) => i.id !== tempItem.id),
      }));
      Alert.alert('Error', 'Failed to add item.');
    }
  };

  const handleBulkAdd = async () => {
    if (!activeList || !bulkText.trim()) return;
    const text = bulkText.trim();
    setShowAddItem(false);
    setBulkText('');
    setBulkMode(false);
    try {
      const result = await shoppingApi.bulkAddItems(activeList.id, text);
      Alert.alert('Added', `${result.count} item(s) added to your list.`);
      fetchLists();
    } catch (err) {
      console.error('Failed to bulk add items:', err);
      Alert.alert('Error', 'Failed to add items.');
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      await shoppingApi.createList({
        name: newListName.trim(),
        sourceType: 'manual',
        items: [],
      });
      setShowCreateList(false);
      setNewListName('');
      fetchLists();
    } catch (err) {
      console.error('Failed to create list:', err);
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
          if (activeList?.id === listId) setActiveList(null);
          fetchLists();
        },
      },
    ]);
  };

  const handleOpenPurchaseAll = async () => {
    if (!activeList) return;
    setPurchaseLoading(true);
    setShowPurchaseAll(true);
    try {
      const data = await shoppingApi.purchasePreview(activeList.id);
      setPurchasePreview(data.items || []);
    } catch (err) {
      console.error('Failed to load purchase preview:', err);
      setPurchasePreview([]);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const updatePreviewStorage = (itemId: string, storage: string) => {
    setPurchasePreview(prev =>
      prev.map(item => item.id === itemId ? { ...item, storageLocation: storage } : item)
    );
  };

  const handleConfirmPurchaseAll = async () => {
    if (!activeList) return;
    setPurchaseLoading(true);
    try {
      const itemLocations = purchasePreview.map(item => ({
        itemId: item.id,
        storageLocation: item.storageLocation,
      }));
      const result = await shoppingApi.purchaseAll(activeList.id, itemLocations);
      setShowPurchaseAll(false);
      Alert.alert('Added to Inventory', `${result.count} item(s) added to your inventory!`);
      fetchLists();
    } catch (err) {
      console.error('Failed to purchase all:', err);
      Alert.alert('Error', 'Failed to add items to inventory.');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleComparePrices = async () => {
    if (!activeList?.items?.length) return;
    setLoadingPrices(true);
    setShowPriceCompare(true);
    try {
      const unchecked = activeList.items
        .filter((i: any) => !i.isChecked)
        .map((i: any) => i.name);
      if (unchecked.length === 0) {
        setPriceData(null);
        return;
      }

      // Try to get user location for distance-based recommendations
      let location: { lat: number; lng: number } | undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          location = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setUserLocation(location);
        }
      } catch {
        // Location not available — proceed without it
      }

      const data = await groceryApi.comparePrices(unchecked, location);
      setPriceData(data);
      // Auto-select the Kroger-family store (has live API data)
      const ranked = data.rankedStores || [];
      const krogerEntry = ranked.find((s: any) => KROGER_BANNERS.includes(s.store));
      if (krogerEntry) {
        setSelectedStore(krogerEntry.store);
      }
    } catch (err) {
      console.error('Failed to compare prices:', err);
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleOpenStore = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open store link.');
    }
  };

  // --- Kroger Cart (OAuth + Add to Cart) ---
  const handleLinkKrogerAccount = async () => {
    try {
      const { url } = await krogerApi.getAuthUrl();
      if (!url) {
        Alert.alert('Unavailable', 'Kroger integration is not configured.');
        return;
      }
      // Opens in-app browser; user signs in and authorizes
      await WebBrowser.openBrowserAsync(url);
      // After browser closes, check if linking succeeded
      const { isLinked } = await krogerApi.getStatus();
      setKrogerLinked(isLinked);
      if (isLinked) {
        Alert.alert('Linked!', 'Your store account is now connected. You can add items to your cart.');
      }
    } catch {
      Alert.alert('Error', 'Failed to open sign-in page.');
    }
  };

  const handleAddToKrogerCart = async (storeName: string) => {
    setAddingToCart(true);
    try {
      // Check link status first
      const { isLinked } = await krogerApi.getStatus();
      setKrogerLinked(isLinked);
      if (!isLinked) {
        Alert.alert(
          `Link ${storeName} Account`,
          `To add items to your ${storeName} cart, sign in to your account.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: handleLinkKrogerAccount },
          ]
        );
        return;
      }
      // Build cart items from price data
      const storeItems = priceData?.items?.map((item: any) => {
        const sp = item.stores?.find((s: any) => s.store === storeName);
        return { upc: sp?.krogerProductId || item.item, quantity: 1 };
      }).filter((i: any) => i.upc) || [];

      if (storeItems.length === 0) {
        Alert.alert('No Items', 'No items available to add to cart.');
        return;
      }
      await krogerApi.addToCart(storeItems);
      Alert.alert('Added to Cart', `${storeItems.length} item(s) added to your ${storeName} cart!`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to add items to cart.';
      if (msg.includes('not linked') || msg.includes('expired')) {
        Alert.alert('Sign In Required', 'Your session has expired. Please sign in again.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: handleLinkKrogerAccount },
        ]);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setAddingToCart(false);
    }
  };

  // --- Add deal to shopping list ---
  const handleAddDealToList = async (deal: any) => {
    if (!activeList) {
      Alert.alert('No List', 'Create or select a shopping list first.');
      return;
    }
    try {
      await shoppingApi.addItem(activeList.id, {
        name: deal.name,
        quantity: 1,
        unit: deal.size || 'each',
      });
      fetchLists();
    } catch {
      Alert.alert('Error', 'Failed to add item.');
    }
  };

  // --- Edit Item ---
  const openEditItem = (item: any) => {
    setEditName(item.name || '');
    setEditQty(item.quantity ? String(item.quantity) : '');
    setEditUnit(item.unit || '');
    setShowEditItem(item);
  };

  const handleSaveEditItem = async () => {
    if (!activeList || !showEditItem) return;
    const itemId = showEditItem.id;
    const updates = {
      name: editName.trim() || showEditItem.name,
      quantity: editQty ? parseFloat(editQty) : undefined,
      unit: editUnit || undefined,
    };
    setShowEditItem(null);
    // Optimistic update
    setActiveList((prev: any) => ({
      ...prev,
      items: prev.items.map((i: any) =>
        i.id === itemId ? { ...i, ...updates } : i
      ),
    }));
    try {
      await shoppingApi.editItem(activeList.id, itemId, updates);
      fetchLists();
    } catch (err) {
      console.error('Failed to edit item:', err);
      fetchLists(); // Revert by fetching server state
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!activeList) return;
    // Optimistic update — remove item immediately
    setActiveList((prev: any) => ({
      ...prev,
      items: (prev.items || []).filter((i: any) => i.id !== item.id),
    }));
    try {
      await shoppingApi.deleteItem(activeList.id, item.id);
      fetchLists();
    } catch (err) {
      console.error('Failed to delete item:', err);
      fetchLists(); // Revert by fetching server state
    }
  };

  const showItemActions = (item: any) => {
    setActionSheetItem(item);
  };

  // --- Archive ---
  const handleArchiveList = async (listId: string) => {
    try {
      await shoppingApi.updateList(listId, { isActive: false });
      fetchLists();
    } catch (err) {
      console.error('Failed to archive list:', err);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  // Completed = archived OR every item is checked (must have items)
  const isListCompleted = (list: any) => {
    if (list.isActive === false) return true;
    const items = list.items || [];
    return items.length > 0 && items.every((i: any) => i.isChecked);
  };
  // New = has 0 items (just created, nothing added yet)
  const isListNew = (list: any) => {
    if (list.isActive === false) return false;
    return (list.items || []).length === 0;
  };
  const activeLists = lists.filter((l: any) => !isListCompleted(l));
  const newLists = lists.filter((l: any) => isListNew(l));
  const completedLists = lists.filter((l: any) => isListCompleted(l));
  const filteredLists = listFilter === 'active' ? activeLists
    : listFilter === 'completed' ? completedLists
    : listFilter === 'new' ? newLists
    : lists;
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
      {/* Filter tabs + generate */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between px-4 py-2">
          {/* Filter: Active / Completed / All */}
          <View className="flex-row bg-gray-100 rounded-lg overflow-hidden">
            {(['active', 'new', 'completed', 'all'] as const).map(filter => {
              const count = filter === 'active' ? activeLists.length : filter === 'new' ? newLists.length : filter === 'completed' ? completedLists.length : lists.length;
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setListFilter(filter)}
                  className={`px-3 py-1.5 ${listFilter === filter ? 'bg-primary-500' : ''}`}
                >
                  <Text className={`text-xs capitalize ${listFilter === filter ? 'text-white font-medium' : 'text-gray-500'}`}>
                    {filter} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            onPress={handleGenerateFromMealPlan}
            disabled={generating}
            className="flex-row items-center bg-primary-50 px-3 py-1.5 rounded-lg"
          >
            <Ionicons name="sparkles" size={14} color={generating ? '#d1d5db' : '#10b981'} />
            <Text className="text-xs text-primary-600 ml-1 font-medium">
              {generating ? 'Generating...' : 'From Meal Plan'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-white border-b border-gray-200">
        <View className="flex-row px-3 py-2 gap-2">
          {filteredLists.map((list: any) => (
            <TouchableOpacity
              key={list.id}
              className={`px-4 py-1.5 rounded-full ${
                activeList?.id === list.id ? 'bg-primary-500' : list.isActive === false ? 'bg-gray-200' : 'bg-gray-100'
              }`}
              onPress={() => setActiveList(list)}
              onLongPress={() => {
                Alert.alert(list.name, undefined, [
                  ...(list.isActive !== false ? [{ text: 'Archive', onPress: () => handleArchiveList(list.id) }] : []),
                  { text: 'Delete', style: 'destructive' as const, onPress: () => handleDeleteList(list.id, list.name) },
                  { text: 'Cancel', style: 'cancel' as const },
                ]);
              }}
            >
              <Text className={`text-sm ${activeList?.id === list.id ? 'text-white font-medium' : list.isActive === false ? 'text-gray-500' : 'text-gray-600'}`}>
                {list.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            className="px-3 py-1.5 rounded-full bg-gray-100 border border-dashed border-gray-300"
            onPress={() => setShowCreateList(true)}
          >
            <Ionicons name="add" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </ScrollView>

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
              {uncheckedItems.length > 0 && (
                <TouchableOpacity
                  onPress={handleComparePrices}
                  className="flex-row items-center bg-blue-50 px-3 py-1.5 rounded-lg"
                >
                  <Ionicons name="pricetags-outline" size={14} color="#3b82f6" />
                  <Text className="text-xs text-blue-600 ml-1 font-medium">Compare</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setShowAddItem(true)}
                className="flex-row items-center bg-gray-100 px-3 py-1.5 rounded-lg"
              >
                <Ionicons name="add" size={16} color="#6b7280" />
                <Text className="text-xs text-gray-600 ml-1">Add</Text>
              </TouchableOpacity>
              {uncheckedItems.length > 0 && (
                <TouchableOpacity
                  onPress={handleOpenPurchaseAll}
                  className="flex-row items-center bg-primary-500 px-3 py-1.5 rounded-lg"
                >
                  <Ionicons name="cart-outline" size={16} color="white" />
                  <Text className="text-xs text-white ml-1">Purchase All</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
            {/* On Sale Deals */}
            {(deals.length > 0 || loadingDeals) && (
              <View className="mt-2 mx-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="flame" size={16} color="#ef4444" />
                  <Text className="text-sm font-semibold text-gray-800 ml-1">
                    On Sale{dealsStoreName ? ` at ${dealsStoreName}` : ''}
                  </Text>
                </View>
                {loadingDeals ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {deals.map((deal: any, idx: number) => (
                        <TouchableOpacity
                          key={idx}
                          className="bg-white rounded-xl p-2.5 w-36"
                          onPress={() => handleAddDealToList(deal)}
                          activeOpacity={0.7}
                        >
                          {deal.imageUrl ? (
                            <Image
                              source={{ uri: deal.imageUrl }}
                              style={{ width: '100%', height: 72, borderRadius: 8 }}
                              contentFit="contain"
                              cachePolicy="memory-disk"
                            />
                          ) : (
                            <View className="w-full h-[72px] rounded-lg bg-gray-100 items-center justify-center">
                              <Ionicons name="pricetag" size={24} color="#d1d5db" />
                            </View>
                          )}
                          <Text className="text-xs font-medium text-gray-800 mt-1.5" numberOfLines={2}>
                            {deal.name}
                          </Text>
                          <View className="flex-row items-center mt-1">
                            {deal.regularPrice != null && (
                              <Text className="text-[10px] text-gray-400 line-through mr-1">
                                ${deal.regularPrice.toFixed(2)}
                              </Text>
                            )}
                            <Text className="text-sm font-bold text-red-600">
                              ${deal.price.toFixed(2)}
                            </Text>
                          </View>
                          {deal.saleSavings > 0 && (
                            <View className="bg-red-50 self-start px-1.5 py-0.5 rounded mt-1">
                              <Text className="text-[9px] text-red-600 font-medium">Save ${deal.saleSavings.toFixed(2)}</Text>
                            </View>
                          )}
                          <View className="flex-row items-center mt-1">
                            <Ionicons name="add-circle-outline" size={12} color="#10b981" />
                            <Text className="text-[10px] text-primary-600 ml-0.5">Add to list</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            )}

            {/* Unchecked items by category */}
            {sortedCategories.map(cat => (
              <View key={cat}>
                <Text className="text-xs font-semibold text-gray-400 uppercase px-4 pt-3 pb-1">
                  {cat}
                </Text>
                {grouped[cat].map((item: any) => (
                  <View
                    key={item.id}
                    className="flex-row items-center px-4 py-2.5 bg-white border-b border-gray-50"
                  >
                    {/* Checkbox — separate touch target */}
                    <TouchableOpacity
                      onPress={() => handleToggleItem(item.id, item.isChecked)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      className="mr-3"
                    >
                      <View className="w-5 h-5 rounded border-2 border-gray-300 items-center justify-center" />
                    </TouchableOpacity>
                    {/* Item content — opens action sheet */}
                    <TouchableOpacity
                      className="flex-1 flex-row items-center"
                      onPress={() => showItemActions(item)}
                    >
                      <View className="flex-1">
                        <Text className="text-sm text-gray-800">{item.name}</Text>
                        {(item.quantity || item.unit) && (
                          <Text className="text-xs text-gray-400">
                            {item.quantity} {item.unit}
                          </Text>
                        )}
                        {item.notes && (
                          <Text className="text-[10px] text-gray-400 italic mt-0.5" numberOfLines={1}>
                            {item.notes}
                          </Text>
                        )}
                      </View>
                      {item.estimatedPrice && (
                        <Text className="text-xs text-gray-400 mr-2">${item.estimatedPrice.toFixed(2)}</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => showItemActions(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      className="px-1"
                    >
                      <Ionicons name="ellipsis-vertical" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
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
                  <View
                    key={item.id}
                    className="flex-row items-center px-4 py-2 bg-white border-b border-gray-50 opacity-60"
                  >
                    <TouchableOpacity
                      onPress={() => handleToggleItem(item.id, item.isChecked)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      className="mr-3"
                    >
                      <View className="w-5 h-5 rounded bg-primary-500 items-center justify-center">
                        <Ionicons name="checkmark" size={14} color="white" />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1"
                      onPress={() => showItemActions(item)}
                    >
                      <Text className="text-sm text-gray-500 line-through">{item.name}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => showItemActions(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      className="px-1"
                    >
                      <Ionicons name="ellipsis-vertical" size={16} color="#d1d5db" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* (Completed lists now shown via filter tabs above) */}
          </ScrollView>
        </>
      )}

      {/* Edit Item Modal */}
      <Modal
        visible={!!showEditItem}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditItem(null)}
      >
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowEditItem(null)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">Edit Item</Text>
            <TouchableOpacity onPress={handleSaveEditItem} disabled={!editName.trim()}>
              <Text className={`font-medium ${editName.trim() ? 'text-primary-500' : 'text-gray-300'}`}>Save</Text>
            </TouchableOpacity>
          </View>
          <View className="px-4 pt-4 gap-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Item Name *</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                value={editName}
                onChangeText={setEditName}
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
                  value={editQty}
                  onChangeText={setEditQty}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Unit</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                  placeholder="e.g. lbs"
                  placeholderTextColor="#9ca3af"
                  value={editUnit}
                  onChangeText={setEditUnit}
                />
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (showEditItem) handleDeleteItem(showEditItem);
                setShowEditItem(null);
              }}
              className="flex-row items-center justify-center py-3 mt-2"
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
              <Text className="text-sm text-red-500 ml-2">Delete Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Price Comparison Modal */}
      <Modal visible={showPriceCompare} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPriceCompare(false)}>
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowPriceCompare(false)}>
              <Text className="text-gray-500">Close</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">Price Comparison</Text>
            <View style={{ width: 40 }} />
          </View>

          {loadingPrices ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#10b981" />
              <Text className="text-gray-400 mt-3">Comparing prices across stores...</Text>
            </View>
          ) : priceData ? (
            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
              {/* Recommendation Banners — Cheapest + Closest */}
              {(() => {
                const ranked = priceData.rankedStores || [];
                const cheapestStore = ranked.find((s: any) => s.cheapest);
                const closestStore = ranked.find((s: any) => s.closest);
                const bestStore = ranked.find((s: any) => s.recommended) || cheapestStore;
                const getDistInfo = (name: string) => priceData.storeDistances?.find((s: any) => s.chain === name);

                // If no ranked data, fall back to simple bestStore
                const cheapest = cheapestStore || { store: priceData.bestStore?.name, total: priceData.bestStore?.total, distance: null };

                return (
                  <View className="mx-4 mt-4 gap-2">
                    {/* Cheapest */}
                    {cheapest?.store && (
                      <View className="bg-primary-50 border border-primary-200 rounded-xl p-3">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center flex-1">
                            <Ionicons name="pricetag" size={18} color="#10b981" />
                            <Text className="text-sm font-semibold text-primary-700 ml-2">Cheapest</Text>
                          </View>
                          <TouchableOpacity
                            className="bg-primary-500 rounded-lg px-3 py-1.5 flex-row items-center"
                            onPress={() => setSelectedStore(cheapest.store)}
                          >
                            <Text className="text-white text-xs font-medium">Shop at {cheapest.store}</Text>
                          </TouchableOpacity>
                        </View>
                        <View className="flex-row items-center mt-1 gap-3">
                          <Text className="text-lg font-bold text-primary-600">{cheapest.store} — ${cheapest.total?.toFixed(2)}</Text>
                          {(() => {
                            const di = getDistInfo(cheapest.store);
                            if (di && di.distance > 0) return (
                              <View className="flex-row items-center">
                                <Ionicons name="navigate-outline" size={11} color="#6b7280" />
                                <Text className="text-xs text-gray-500 ml-0.5">{di.distance} mi</Text>
                              </View>
                            );
                            if (di?.chain === 'Amazon Fresh') return <Text className="text-xs text-gray-500">Delivery</Text>;
                            return null;
                          })()}
                          {priceData.totalSavings > 0 && (
                            <Text className="text-xs text-primary-500">Save ${priceData.totalSavings.toFixed(2)}</Text>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Closest — only if different from cheapest */}
                    {closestStore && closestStore.store !== cheapest?.store && (
                      <View className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center flex-1">
                            <Ionicons name="navigate" size={18} color="#3b82f6" />
                            <Text className="text-sm font-semibold text-blue-700 ml-2">Closest</Text>
                          </View>
                          <TouchableOpacity
                            className="bg-blue-500 rounded-lg px-3 py-1.5 flex-row items-center"
                            onPress={() => setSelectedStore(closestStore.store)}
                          >
                            <Text className="text-white text-xs font-medium">Shop at {closestStore.store}</Text>
                          </TouchableOpacity>
                        </View>
                        <View className="flex-row items-center mt-1 gap-3">
                          <Text className="text-lg font-bold text-blue-600">{closestStore.store} — ${closestStore.total?.toFixed(2)}</Text>
                          {(() => {
                            const di = getDistInfo(closestStore.store);
                            if (di && di.distance > 0) return (
                              <View className="flex-row items-center">
                                <Ionicons name="navigate-outline" size={11} color="#6b7280" />
                                <Text className="text-xs text-gray-500 ml-0.5">{di.distance} mi</Text>
                              </View>
                            );
                            return null;
                          })()}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* Pricing note */}
              <Text className="text-[10px] text-gray-400 mx-4 mt-3 text-center italic">
                LIVE = real-time API prices. EST = estimated prices.
              </Text>

              {/* Store Totals with Distance */}
              <Text className="text-sm font-semibold text-gray-600 mx-4 mt-3 mb-2">Store Totals</Text>
              <View className="mx-4 bg-white rounded-xl overflow-hidden">
                {(() => {
                  // Sort by score (80% price + 20% distance) if ranked; otherwise by price
                  const storeEntries = priceData.rankedStores?.length
                    ? priceData.rankedStores
                    : Object.entries(priceData.storeTotals || {})
                        .sort(([, a], [, b]) => (a as number) - (b as number))
                        .map(([store, total]: any) => ({ store, total, cheapest: store === priceData.bestStore?.name, closest: false }));

                  return storeEntries.map((entry: any, idx: number) => {
                    const store = entry.store;
                    const total = entry.total;
                    const logoColor = priceData.items?.[0]?.stores?.find(
                      (s: any) => s.store === store
                    )?.logoColor || '#6b7280';
                    const storeHomeUrl = priceData.storeLinks?.[store]?.homeUrl;
                    const distInfo = priceData.storeDistances?.find((s: any) => s.chain === store);

                    return (
                      <TouchableOpacity
                        key={store}
                        className={`flex-row items-center px-4 py-3 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                        onPress={() => setSelectedStore(store)}
                      >
                        <View
                          className="w-8 h-8 rounded-full items-center justify-center mr-3"
                          style={{ backgroundColor: logoColor }}
                        >
                          <Text className="text-white text-xs font-bold">{store[0]}</Text>
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text className="text-sm text-gray-800 font-medium">{store}</Text>
                            {KROGER_BANNERS.includes(store) ? (
                              <View className="bg-green-100 px-1.5 py-0.5 rounded ml-1.5">
                                <Text className="text-[9px] text-green-700 font-semibold">LIVE</Text>
                              </View>
                            ) : (
                              <View className="bg-gray-100 px-1.5 py-0.5 rounded ml-1.5">
                                <Text className="text-[9px] text-gray-500 font-semibold">EST</Text>
                              </View>
                            )}
                          </View>
                          {distInfo && distInfo.distance > 0 && (
                            <View className="flex-row items-center mt-0.5">
                              <Ionicons name="navigate-outline" size={10} color="#9ca3af" />
                              <Text className="text-[10px] text-gray-400 ml-0.5">
                                {distInfo.distance} mi — {distInfo.address}
                              </Text>
                            </View>
                          )}
                          {distInfo?.chain === 'Amazon Fresh' && (
                            <Text className="text-[10px] text-gray-400 mt-0.5">Delivery to your area</Text>
                          )}
                        </View>
                        <View className="items-end">
                          <Text className="text-base font-semibold text-gray-600">
                            ${total?.toFixed(2)}
                          </Text>
                          {distInfo && distInfo.distance > 0 && (
                            <Text className="text-[10px] text-gray-400">{distInfo.distance} mi</Text>
                          )}
                        </View>
                        {entry.cheapest && (
                          <View className="ml-2 bg-primary-100 px-1.5 py-0.5 rounded">
                            <Text className="text-[9px] text-primary-700 font-semibold">CHEAPEST</Text>
                          </View>
                        )}
                        {entry.closest && !entry.cheapest && (
                          <View className="ml-2 bg-blue-100 px-1.5 py-0.5 rounded">
                            <Text className="text-[9px] text-blue-700 font-semibold">CLOSEST</Text>
                          </View>
                        )}
                        <Ionicons name="chevron-forward" size={14} color="#9ca3af" style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                    );
                  });
                })()}
              </View>

              {/* Item Breakdown with Distance */}
              <Text className="text-sm font-semibold text-gray-600 mx-4 mt-4 mb-2">Item Prices</Text>
              {priceData.items?.map((item: any, idx: number) => (
                <View key={idx} className="mx-4 mb-2 bg-white rounded-xl p-3">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm font-medium text-gray-800">{item.item}</Text>
                    {item.savings > 0 && (
                      <Text className="text-xs text-primary-500 font-medium">
                        Save ${item.savings.toFixed(2)}
                      </Text>
                    )}
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {[...item.stores]
                      .sort((a: any, b: any) => a.price - b.price)
                      .map((store: any, sIdx: number) => {
                        const isBest = store.store === item.bestPrice?.store;
                        const distInfo = priceData.storeDistances?.find((s: any) => s.chain === store.store);
                        return (
                          <TouchableOpacity
                            key={sIdx}
                            className={`px-2.5 py-1.5 rounded-lg ${
                              isBest ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'
                            }`}
                            onPress={() => handleOpenStore(store.deepLink)}
                          >
                            <View className="flex-row items-center">
                              {store.imageUrl ? (
                                <Image
                                  source={{ uri: store.imageUrl }}
                                  style={{ width: 28, height: 28, borderRadius: 4, marginRight: 6 }}
                                  cachePolicy="memory-disk"
                                />
                              ) : (
                                <View
                                  className="w-4 h-4 rounded-full items-center justify-center mr-1.5"
                                  style={{ backgroundColor: store.logoColor || '#6b7280' }}
                                >
                                  <Text className="text-white text-[8px] font-bold">{store.store[0]}</Text>
                                </View>
                              )}
                              {KROGER_BANNERS.includes(store.store) ? (
                                <View className="bg-green-100 px-1 py-0.5 rounded mr-1">
                                  <Text className="text-[8px] text-green-700 font-bold">LIVE</Text>
                                </View>
                              ) : (
                                <View className="bg-gray-100 px-1 py-0.5 rounded mr-1">
                                  <Text className="text-[8px] text-gray-500 font-bold">EST</Text>
                                </View>
                              )}
                              {store.onSale ? (
                                <View>
                                  <View className="flex-row items-center">
                                    <Text className="text-xs text-gray-400 line-through mr-1">
                                      ${store.regularPrice?.toFixed(2)}
                                    </Text>
                                    <Text className={`text-xs font-bold ${isBest ? 'text-primary-700' : 'text-red-600'}`}>
                                      ${store.price.toFixed(2)}
                                    </Text>
                                    <Text className="text-[10px] text-gray-400 ml-1">/{store.unit}</Text>
                                  </View>
                                  <View className="flex-row items-center mt-0.5">
                                    <View className="bg-red-500 px-1 py-0.5 rounded">
                                      <Text className="text-[8px] text-white font-bold">SALE</Text>
                                    </View>
                                    {store.saleSavings > 0 && (
                                      <Text className="text-[9px] text-red-500 ml-1">-${store.saleSavings.toFixed(2)}</Text>
                                    )}
                                  </View>
                                </View>
                              ) : (
                                <View className="flex-row items-center">
                                  <Text className={`text-xs ${isBest ? 'text-primary-700 font-semibold' : 'text-gray-600'}`}>
                                    ${store.price.toFixed(2)}
                                  </Text>
                                  <Text className="text-[10px] text-gray-400 ml-1">/{store.unit}</Text>
                                </View>
                              )}
                              {store.inStock === false && (
                                <View className="bg-red-100 px-1 py-0.5 rounded ml-1">
                                  <Text className="text-[8px] text-red-600 font-bold">OUT</Text>
                                </View>
                              )}
                            </View>
                            {distInfo && distInfo.distance > 0 && (
                              <View className="flex-row items-center mt-0.5">
                                <Ionicons name="navigate-outline" size={8} color="#9ca3af" />
                                <Text className="text-[9px] text-gray-400 ml-0.5">{distInfo.distance} mi</Text>
                              </View>
                            )}
                            {distInfo?.chain === 'Amazon Fresh' && (
                              <Text className="text-[9px] text-gray-400 mt-0.5">Delivery</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-gray-400 text-center">No price data available.</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Send to Store Modal */}
      <Modal
        visible={!!selectedStore}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedStore(null)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={() => setSelectedStore(null)}
        >
          <View
            className="bg-white rounded-t-2xl"
            onStartShouldSetResponder={() => true}
          >
            {(() => {
              if (!selectedStore || !priceData) return null;
              const logoColor = priceData.items?.[0]?.stores?.find(
                (s: any) => s.store === selectedStore
              )?.logoColor || '#6b7280';
              const storeTotal = priceData.storeTotals?.[selectedStore];
              const homeUrl = priceData.storeLinks?.[selectedStore]?.homeUrl;
              const itemSearchUrls = priceData.itemSearchUrls?.[selectedStore] || {};

              const storeItems = priceData.items?.map((item: any) => {
                const storePrice = item.stores?.find((s: any) => s.store === selectedStore);
                return {
                  name: item.item,
                  price: storePrice?.price,
                  unit: storePrice?.unit,
                  searchUrl: itemSearchUrls[item.item] || storePrice?.deepLink,
                  imageUrl: storePrice?.imageUrl,
                  onSale: storePrice?.onSale,
                  regularPrice: storePrice?.regularPrice,
                  saleSavings: storePrice?.saleSavings,
                  inStock: storePrice?.inStock,
                  krogerProductId: storePrice?.krogerProductId,
                };
              }) || [];

              const handleCopyList = async () => {
                const lines = storeItems.map((item: any) =>
                  `${item.name}${item.price ? ` — $${item.price.toFixed(2)}/${item.unit}` : ''}`
                );
                const text = `${selectedStore} Shopping List ($${storeTotal?.toFixed(2)} est.)\n${lines.join('\n')}`;
                await Clipboard.setStringAsync(text);
                Alert.alert('Copied', 'Shopping list copied to clipboard.');
              };

              return (
                <>
                  {/* Header */}
                  <View className="flex-row items-center px-4 pt-4 pb-3 border-b border-gray-100">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: logoColor }}
                    >
                      <Text className="text-white text-sm font-bold">{selectedStore[0]}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-800">{selectedStore}</Text>
                      {storeTotal != null && (
                        <Text className="text-sm text-gray-500">Est. total: ${storeTotal.toFixed(2)}</Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => setSelectedStore(null)}>
                      <Ionicons name="close" size={24} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>

                  {/* Item list */}
                  <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ paddingBottom: 8 }}>
                    {storeItems.map((item: any, idx: number) => (
                      <TouchableOpacity
                        key={idx}
                        className={`flex-row items-center px-4 py-3 ${idx > 0 ? 'border-t border-gray-50' : ''}`}
                        onPress={() => item.searchUrl && handleOpenStore(item.searchUrl)}
                      >
                        {item.imageUrl ? (
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={{ width: 32, height: 32, borderRadius: 4, marginRight: 8 }}
                            cachePolicy="memory-disk"
                          />
                        ) : null}
                        <View className="flex-1">
                          <Text className="text-sm text-gray-800">{item.name}</Text>
                          {item.onSale && (
                            <View className="flex-row items-center mt-0.5">
                              <View className="bg-red-500 px-1 py-0.5 rounded mr-1">
                                <Text className="text-[8px] text-white font-bold">SALE</Text>
                              </View>
                              {item.saleSavings > 0 && (
                                <Text className="text-[9px] text-red-500">Save ${item.saleSavings.toFixed(2)}</Text>
                              )}
                            </View>
                          )}
                        </View>
                        {item.price != null && (
                          <View className="items-end mr-2">
                            {item.onSale && item.regularPrice != null ? (
                              <>
                                <Text className="text-[10px] text-gray-400 line-through">${item.regularPrice.toFixed(2)}</Text>
                                <Text className="text-sm font-bold text-red-600">${item.price.toFixed(2)}</Text>
                              </>
                            ) : (
                              <Text className="text-sm font-medium text-gray-600">${item.price.toFixed(2)}</Text>
                            )}
                            {item.unit && (
                              <Text className="text-[10px] text-gray-400">/{item.unit}</Text>
                            )}
                          </View>
                        )}
                        {item.inStock === false && (
                          <View className="bg-red-100 px-1.5 py-0.5 rounded mr-2">
                            <Text className="text-[8px] text-red-600 font-bold">OUT</Text>
                          </View>
                        )}
                        <Ionicons name="open-outline" size={14} color="#9ca3af" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Actions */}
                  <View className="px-4 pt-2 pb-8 border-t border-gray-100 gap-2">
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className="flex-1 flex-row items-center justify-center py-3 rounded-xl border border-gray-200"
                        onPress={handleCopyList}
                      >
                        <Ionicons name="copy-outline" size={16} color="#6b7280" />
                        <Text className="text-sm text-gray-600 ml-2 font-medium">Copy List</Text>
                      </TouchableOpacity>
                      {homeUrl && (
                        <TouchableOpacity
                          className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
                          style={{ backgroundColor: logoColor }}
                          onPress={() => handleOpenStore(homeUrl)}
                        >
                          <Ionicons name="open-outline" size={16} color="white" />
                          <Text className="text-sm text-white ml-2 font-medium">
                            {selectedStore && KROGER_BANNERS.includes(selectedStore)
                              ? `Shop at ${selectedStore}`
                              : 'Open Store'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {selectedStore && KROGER_BANNERS.includes(selectedStore) && (
                      <TouchableOpacity
                        className="flex-row items-center justify-center py-3 rounded-xl bg-blue-600"
                        onPress={() => handleAddToKrogerCart(selectedStore)}
                        disabled={addingToCart}
                      >
                        <Ionicons name="cart-outline" size={16} color="white" />
                        <Text className="text-sm text-white ml-2 font-medium">
                          {addingToCart ? 'Adding...' : `Add to ${selectedStore} Cart`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create List Modal */}
      <Modal visible={showCreateList} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateList(false)}>
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowCreateList(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">New List</Text>
            <TouchableOpacity onPress={handleCreateList} disabled={!newListName.trim()}>
              <Text className={`font-medium ${newListName.trim() ? 'text-primary-500' : 'text-gray-300'}`}>Create</Text>
            </TouchableOpacity>
          </View>
          <View className="px-4 pt-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">List Name *</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
              placeholder="e.g. Weekly Groceries"
              placeholderTextColor="#9ca3af"
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
            />
          </View>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal visible={showAddItem} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowAddItem(false); setSuggestions([]); setBulkMode(false); }}>
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => { setShowAddItem(false); setSuggestions([]); setBulkMode(false); }}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">{bulkMode ? 'Add Items' : 'Add Item'}</Text>
            <TouchableOpacity
              onPress={bulkMode ? handleBulkAdd : handleAddItem}
              disabled={bulkMode ? !bulkText.trim() : !newItemName.trim()}
            >
              <Text className={`font-medium ${(bulkMode ? bulkText.trim() : newItemName.trim()) ? 'text-primary-500' : 'text-gray-300'}`}>
                Add
              </Text>
            </TouchableOpacity>
          </View>

          {/* Single / Bulk toggle */}
          <View className="flex-row mx-4 mt-3 bg-gray-100 rounded-lg overflow-hidden">
            <TouchableOpacity
              onPress={() => setBulkMode(false)}
              className={`flex-1 py-2 items-center ${!bulkMode ? 'bg-primary-500' : ''}`}
            >
              <Text className={`text-sm font-medium ${!bulkMode ? 'text-white' : 'text-gray-500'}`}>Single</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setBulkMode(true)}
              className={`flex-1 py-2 items-center ${bulkMode ? 'bg-primary-500' : ''}`}
            >
              <Text className={`text-sm font-medium ${bulkMode ? 'text-white' : 'text-gray-500'}`}>Bulk</Text>
            </TouchableOpacity>
          </View>

          {bulkMode ? (
            <View className="px-4 pt-4 gap-2">
              <Text className="text-sm font-medium text-gray-700">Type or paste items, one per line</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                placeholder={"chicken breast 3 lbs\nflour\nbread crumbs 2 cups"}
                placeholderTextColor="#9ca3af"
                value={bulkText}
                onChangeText={setBulkText}
                multiline
                numberOfLines={8}
                style={{ minHeight: 180, textAlignVertical: 'top' }}
                autoFocus
              />
              <Text className="text-[10px] text-gray-400">
                Supports: "item name", "item qty unit", or "qty unit item"
              </Text>
            </View>
          ) : (
            <View className="px-4 pt-4 gap-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Item Name *</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                  placeholder="Start typing to search..."
                  placeholderTextColor="#9ca3af"
                  value={newItemName}
                  onChangeText={handleItemNameChange}
                  autoFocus
                />
                {/* Autocomplete suggestions */}
                {suggestions.length > 0 && (
                  <View className="bg-white border border-gray-200 rounded-xl mt-1 overflow-hidden">
                    {suggestions.map((product: any, idx: number) => (
                      <TouchableOpacity
                        key={`${product.name}-${idx}`}
                        className={`flex-row items-center px-4 py-2.5 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                        onPress={() => selectSuggestion(product)}
                      >
                        {product.imageUrl ? (
                          <Image
                            source={{ uri: product.imageUrl }}
                            style={{ width: 32, height: 32, borderRadius: 4, marginRight: 8 }}
                            cachePolicy="memory-disk"
                          />
                        ) : (
                          <View className="w-8 h-8 rounded bg-gray-100 items-center justify-center mr-2">
                            <Ionicons name="nutrition-outline" size={16} color="#9ca3af" />
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="text-sm text-gray-800">{product.name}</Text>
                          <Text className="text-[10px] text-gray-400">
                            {product.category} · {product.size || product.defaultUnit}
                          </Text>
                        </View>
                        <View className="items-end">
                          {product.price != null && (
                            <Text className="text-xs font-medium text-gray-600">
                              ${product.promoPrice != null ? product.promoPrice.toFixed(2) : product.price.toFixed(2)}
                            </Text>
                          )}
                          {product.source === 'history' && (
                            <View className="bg-blue-50 px-1.5 py-0.5 rounded mt-0.5">
                              <Text className="text-[9px] text-blue-500">Recent</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
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
          )}
        </View>
      </Modal>

      {/* Storage Location Picker (single item) */}
      <Modal
        visible={!!showStoragePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStoragePicker(null)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={() => setShowStoragePicker(null)}
        >
          <View className="bg-white rounded-t-2xl px-4 pt-4 pb-8">
            <Text className="text-base font-semibold text-gray-800 text-center mb-1">
              Add to Inventory
            </Text>
            <Text className="text-sm text-gray-500 text-center mb-4">
              Where will you store "{showStoragePicker?.itemName}"?
            </Text>
            {(() => {
              // Find item to get category for suggestion
              const pickerItem = activeList?.items?.find((i: any) => i.id === showStoragePicker?.itemId);
              const suggested = suggestStorage(pickerItem?.category, showStoragePicker?.itemName);
              return (
                <View className="flex-row justify-center gap-4">
                  {STORAGE_OPTIONS.map(storage => {
                    const isSuggested = storage === suggested;
                    return (
                      <TouchableOpacity
                        key={storage}
                        className={`items-center rounded-xl px-5 py-3 border ${
                          isSuggested
                            ? 'bg-primary-50 border-primary-300'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                        onPress={() => showStoragePicker && handlePurchaseItem(showStoragePicker.itemId, storage)}
                      >
                        <Ionicons
                          name={STORAGE_ICONS[storage] as any}
                          size={28}
                          color={isSuggested ? '#10b981' : storage === 'fridge' ? '#3b82f6' : storage === 'freezer' ? '#8b5cf6' : '#f59e0b'}
                        />
                        <Text className={`text-sm font-medium mt-1 capitalize ${isSuggested ? 'text-primary-700' : 'text-gray-700'}`}>{storage}</Text>
                        {isSuggested && (
                          <Text className="text-[9px] text-primary-500 font-medium mt-0.5">Suggested</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })()}
            <TouchableOpacity
              className="mt-3 py-2"
              onPress={() => setShowStoragePicker(null)}
            >
              <Text className="text-sm text-gray-400 text-center">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Purchase All Modal */}
      <Modal
        visible={showPurchaseAll}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPurchaseAll(false)}
      >
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowPurchaseAll(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">Add to Inventory</Text>
            <TouchableOpacity onPress={handleConfirmPurchaseAll} disabled={purchaseLoading || purchasePreview.length === 0}>
              <Text className={`font-medium ${!purchaseLoading && purchasePreview.length > 0 ? 'text-primary-500' : 'text-gray-300'}`}>
                {purchaseLoading ? 'Adding...' : `Add (${purchasePreview.length})`}
              </Text>
            </TouchableOpacity>
          </View>

          {purchaseLoading && purchasePreview.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#10b981" />
              <Text className="text-gray-400 mt-3">Loading items...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
              <Text className="text-xs text-gray-500 px-4 pt-3 pb-2">
                Tap a storage location to change where each item is stored.
              </Text>
              {purchasePreview.map(item => (
                <View key={item.id} className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
                  <View className="flex-1 mr-3">
                    <Text className="text-sm font-medium text-gray-800">{item.name}</Text>
                    {(item.quantity || item.unit) && (
                      <Text className="text-xs text-gray-400">
                        {item.quantity} {item.unit}
                      </Text>
                    )}
                  </View>
                  <View className="flex-row gap-1.5">
                    {STORAGE_OPTIONS.map(storage => {
                      const isActive = item.storageLocation === storage;
                      return (
                        <TouchableOpacity
                          key={storage}
                          className={`px-2.5 py-1.5 rounded-lg flex-row items-center ${
                            isActive ? 'bg-primary-100 border border-primary-300' : 'bg-gray-50 border border-gray-200'
                          }`}
                          onPress={() => updatePreviewStorage(item.id, storage)}
                        >
                          <Ionicons
                            name={STORAGE_ICONS[storage] as any}
                            size={14}
                            color={isActive ? '#10b981' : '#9ca3af'}
                          />
                          <Text className={`text-xs ml-1 capitalize ${isActive ? 'text-primary-700 font-medium' : 'text-gray-500'}`}>
                            {storage}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
      {/* Item Action Sheet (cross-platform, replaces Alert.alert) */}
      <Modal
        visible={!!actionSheetItem}
        transparent
        animationType="fade"
        onRequestClose={() => setActionSheetItem(null)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={() => setActionSheetItem(null)}
        >
          <View className="bg-white rounded-t-2xl px-4 pt-4 pb-8">
            <Text className="text-base font-semibold text-gray-800 text-center mb-4">
              {actionSheetItem?.name}
            </Text>

            {/* Edit */}
            <TouchableOpacity
              className="flex-row items-center py-3 border-b border-gray-100"
              onPress={() => {
                const item = actionSheetItem;
                setActionSheetItem(null);
                openEditItem(item);
              }}
            >
              <Ionicons name="pencil-outline" size={20} color="#6b7280" />
              <Text className="text-sm text-gray-700 ml-3">Edit Item</Text>
            </TouchableOpacity>

            {/* Add to Inventory */}
            {!actionSheetItem?.isChecked && (
              <TouchableOpacity
                className="flex-row items-center py-3 border-b border-gray-100"
                onPress={() => {
                  const item = actionSheetItem;
                  setActionSheetItem(null);
                  setShowStoragePicker({ itemId: item.id, itemName: item.name });
                }}
              >
                <Ionicons name="enter-outline" size={20} color="#10b981" />
                <Text className="text-sm text-gray-700 ml-3">Add to Inventory</Text>
              </TouchableOpacity>
            )}

            {/* Delete */}
            <TouchableOpacity
              className="flex-row items-center py-3 border-b border-gray-100"
              onPress={() => {
                const item = actionSheetItem;
                setActionSheetItem(null);
                handleDeleteItem(item);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text className="text-sm text-red-500 ml-3">Delete Item</Text>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              className="py-3 mt-1"
              onPress={() => setActionSheetItem(null)}
            >
              <Text className="text-sm text-gray-400 text-center">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
