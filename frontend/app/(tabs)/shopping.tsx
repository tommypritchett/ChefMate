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
import useSpeechRecognition from '../../src/hooks/useSpeechRecognition';

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

// Simplify a verbose product name to a core search query
// e.g. "Simple Truth® Protein Plain 2% Milkfat Small Curd Cottage Cheese" → "cottage cheese"
// e.g. "Laura's Lean Beef® 92% Lean All Natural Ground Beef" → "ground beef"
function simplifyItemName(name: string): string {
  let s = name
    .replace(/[®™©Â\u2019\u2018]/g, "'")  // Normalize smart quotes + strip trademark symbols
    .replace(/['"]/g, '')                    // Then strip all quotes
    .replace(/\d+\.?\d*\s*%/g, '')           // Strip percentages like "92%", "2%"
    .replace(/\d+\.?\d*\s*(oz|lb|lbs|fl\s*oz|ct|count|pack|g|kg|ml|l|gal|qt|pt|slices?)\b/gi, '') // Strip sizes
    .replace(/\b\d+\s*(\/\s*\d+)?\b/g, '')  // Strip standalone numbers like "2" or "1/2"
    .split(/\s+/)                            // Split to words for per-word filtering
    .filter(w => !/^(simple|truth|kroger|private|selection|lauras?|lean|all|natural|organic|gluten|free|fat|low|non|gmo|artesano|original|instant|minute|sara|lee|singles|brand|style|classic|premium|value|pack|size|family)$/i.test(w))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  // If we over-stripped and the result is too short, fall back to last 2-3 meaningful words
  const words = s.split(' ').filter(w => w.length > 1);
  if (words.length <= 1 && name.length > 10) {
    const origWords = name.replace(/[®™©Â\u2019\u2018'"]/g, '').split(/\s+/).filter(w => w.length > 1);
    return origWords.slice(-3).join(' ');
  }
  // If still long (>4 words), take the last 3 words (item name is usually at the end)
  if (words.length > 4) return words.slice(-3).join(' ');
  return words.join(' ') || name;
}

// Parse natural speech like "some chocolate milk some Greek yogurt some beef and chicken breast"
// into individual items: ["chocolate milk", "Greek yogurt", "beef", "chicken breast"]
function parseNaturalItems(text: string): string[] {
  let s = text.trim();
  // Strip leading filler phrases (loop to handle chained fillers like "let's do how about")
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(/^(let'?s?\s+(do|get|add|see|try|have)|how\s+about|i\s+(need|want|would like)|can\s+(we|you)\s+(add|get)|get\s+me|we\s+need|add|please)\s+/i, '');
  }
  // Replace "and also" / "and then" / "and some" with delimiter
  s = s.replace(/\band\s+(also|then|some)\b/gi, ',');
  // Split on: commas, newlines, " and ", " some ", " also ", " plus "
  const parts = s.split(/,|\n|\band\b|\bsome\b|\balso\b|\bplus\b/i);
  return parts
    .map(p => p.trim())
    .map(p => p.replace(/^(a\s+|the\s+|of\s+)/i, '').trim()) // strip leading articles
    .filter(p => p.length >= 2); // drop empty/tiny fragments
}

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
  const [newItemQtyError, setNewItemQtyError] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemKrogerId, setNewItemKrogerId] = useState<string | undefined>();
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editQtyError, setEditQtyError] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [addMode, setAddMode] = useState<'single' | 'bulk' | 'smart'>('smart');
  const [smartText, setSmartText] = useState('');
  const [smartResults, setSmartResults] = useState<any[]>([]);
  const [smartStoreName, setSmartStoreName] = useState('');
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartSelected, setSmartSelected] = useState<Record<string, any>>({});
  const [priceData, setPriceData] = useState<any>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [dealsStoreName, setDealsStoreName] = useState<string>('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartAddedMsg, setCartAddedMsg] = useState<string | null>(null); // success banner after cart add
  const [showKrogerSuccess, setShowKrogerSuccess] = useState<{ count: number } | null>(null); // Kroger deep link modal
  const [krogerLinked, setKrogerLinked] = useState(false);

  // Cart Review modal state
  const [showCartReview, setShowCartReview] = useState(false);
  const [cartReviewData, setCartReviewData] = useState<{ ready: any[]; alreadyAdded: any[]; noMatch: any[] }>({ ready: [], alreadyAdded: [], noMatch: [] });
  const [cartSubstitutes, setCartSubstitutes] = useState<Record<string, any[]>>({}); // itemId → product[]
  const [cartSubSelected, setCartSubSelected] = useState<Record<string, any | null>>({}); // itemId → selected product or null
  const [cartReaddFlags, setCartReaddFlags] = useState<Record<string, boolean>>({}); // itemId → re-add toggle
  const [loadingCartReview, setLoadingCartReview] = useState(false);
  const [cartReviewSubmitting, setCartReviewSubmitting] = useState(false);
  const [cartSearchError, setCartSearchError] = useState<string | null>(null);

  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [showListActions, setShowListActions] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState<{ id: string; name: string } | null>(null);

  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  // Sync voice transcript to smart text input
  useEffect(() => {
    if (transcript && addMode === 'smart') {
      setSmartText(transcript);
    }
  }, [transcript, addMode]);

  // ─── Validation helpers ────────────────────────────────────────────────

  const validateQuantity = (value: string): string => {
    if (!value.trim()) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return 'Please enter a valid number';
    if (num <= 0) return 'Quantity must be greater than 0';
    if (num > 10000) return 'Quantity seems too high (max 10000)';
    return '';
  };

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

  // Auto-dismiss cart success message after 5 seconds
  useEffect(() => {
    if (!cartAddedMsg) return;
    const timer = setTimeout(() => setCartAddedMsg(null), 5000);
    return () => clearTimeout(timer);
  }, [cartAddedMsg]);

  // Get user location for Kroger-enhanced autocomplete + deals
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setUserLocation(coords);
          // Save Kroger location for AI chat (fire-and-forget)
          shoppingApi.setKrogerLocation(coords.lat, coords.lng).catch(() => {});
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
    setNewItemKrogerId(undefined); // Clear kroger ID when typing manually
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
    setNewItemKrogerId(product.krogerProductId);
    setSuggestions([]);
  };

  const handleAddItem = async () => {
    if (!activeList || !newItemName.trim()) return;
    const itemName = newItemName.trim();
    const itemQty = newItemQty ? parseFloat(newItemQty) : undefined;
    const itemUnit = newItemUnit || undefined;
    const itemKrogerId = newItemKrogerId;

    // Close modal immediately for responsiveness
    setShowAddItem(false);
    setNewItemName('');
    setNewItemQty('');
    setNewItemUnit('');
    setNewItemKrogerId(undefined);
    setSuggestions([]);

    // Optimistic update — add temp item to active list
    const tempItem = {
      id: `temp-${Date.now()}`,
      name: itemName,
      quantity: itemQty,
      unit: itemUnit,
      isChecked: false,
      category: 'other',
      krogerProductId: itemKrogerId,
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
        krogerProductId: itemKrogerId,
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

  const handleSmartSearch = async () => {
    if (!smartText.trim()) return;
    setSmartLoading(true);
    setSmartResults([]);
    setSmartSelected({});
    try {
      // If input has commas or newlines, use fast local parsing; otherwise AI-parse natural speech
      const hasStructure = /[,\n]/.test(smartText.trim());
      let items: string[];
      if (hasStructure) {
        items = parseNaturalItems(smartText);
      } else {
        const parsed = await shoppingApi.parseItems(smartText.trim());
        items = parsed.items;
      }
      if (items.length === 0) { setSmartLoading(false); return; }
      const data = await shoppingApi.smartSearch(items);
      setSmartResults(data.results || []);
      setSmartStoreName(data.storeName || '');
      // Auto-select the first (best) product for each item
      const autoSelect: Record<string, any> = {};
      for (const r of (data.results || [])) {
        if (r.products?.length > 0) {
          autoSelect[r.query] = r.products[0];
        }
      }
      setSmartSelected(autoSelect);
    } catch (err: any) {
      if (err?.response?.data?.error === 'no_store_set') {
        Alert.alert('No Store Set', 'Visit the Shopping tab and grant location access to set your store first.');
      } else {
        Alert.alert('Error', 'Smart search failed. Try again.');
      }
    } finally {
      setSmartLoading(false);
    }
  };

  const handleSmartAdd = async () => {
    if (!activeList || Object.keys(smartSelected).length === 0) return;
    setShowAddItem(false);
    const selected = Object.values(smartSelected);
    setSmartText('');
    setSmartResults([]);
    setSmartSelected({});
    setAddMode('smart');
    try {
      let count = 0;
      for (const product of selected) {
        await shoppingApi.addItem(activeList.id, {
          name: product.name,
          quantity: 1,
          unit: product.size || 'each',
          krogerProductId: product.krogerProductId,
        });
        count++;
      }
      Alert.alert('Added', `${count} item(s) added to your list.`);
      fetchLists();
    } catch (err) {
      console.error('Failed to add smart items:', err);
      Alert.alert('Error', 'Failed to add some items.');
      fetchLists();
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

  const handleDeleteList = async (listId: string, name: string) => {
    // Use confirm() on web since Alert.alert with buttons doesn't work on RN Web
    const confirmed = typeof window !== 'undefined' && window.confirm
      ? window.confirm(`Delete "${name}"?`)
      : await new Promise<boolean>(resolve => {
          Alert.alert('Delete List', `Delete "${name}"?`, [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });
    if (!confirmed) return;
    try {
      await shoppingApi.deleteList(listId);
      if (activeList?.id === listId) setActiveList(null);
      fetchLists();
    } catch (err) {
      console.error('Failed to delete list:', err);
    }
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
      setSelectedStore(null); // Open to comparison overview, not a specific store
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
    if (addingToCart || cartAddedMsg) return;
    setCartAddedMsg(null);
    try {
      // Check Kroger OAuth
      const { isLinked } = await krogerApi.getStatus();
      setKrogerLinked(isLinked);
      if (!isLinked) {
        await handleLinkKrogerAccount();
        const rechecked = await krogerApi.getStatus();
        if (!rechecked.isLinked) return;
      }

      // Build items from price data, matching back to shopping list items (quantity-aware)
      let ready: any[] = [];
      let alreadyAdded: any[] = [];
      const noMatch: any[] = [];

      for (const item of priceData?.items || []) {
        const sp = item.stores?.find((s: any) => s.store === storeName);
        const listItem = activeList?.items?.find((li: any) =>
          li.name.toLowerCase() === item.item.toLowerCase()
        );
        const merged = {
          id: listItem?.id || item.item,
          name: item.item,
          quantity: listItem?.quantity || 1,
          unit: listItem?.unit || '',
          krogerProductId: sp?.krogerProductId || listItem?.krogerProductId,
          addedToKrogerCartAt: listItem?.addedToKrogerCartAt,
          krogerCartQuantity: listItem?.krogerCartQuantity || 0,
        };

        const totalQty = merged.quantity || 1;
        const cartedQty = merged.krogerCartQuantity || 0;

        if (!merged.krogerProductId) {
          noMatch.push(merged);
        } else if (cartedQty <= 0) {
          ready.push(merged);
        } else if (cartedQty < totalQty) {
          const remaining = totalQty - cartedQty;
          ready.push({ ...merged, quantity: remaining, _fullQuantity: totalQty, _cartedQuantity: cartedQty });
          alreadyAdded.push({ ...merged, quantity: cartedQty, _isPartial: true });
        } else {
          alreadyAdded.push(merged);
        }
      }

      if (ready.length === 0 && noMatch.length === 0 && alreadyAdded.length === 0) {
        Alert.alert('No Items', 'No items have Kroger product IDs. Try comparing prices with location enabled.');
        return;
      }

      // If ALL items are fully added, ask user if they want to re-order
      if (ready.length === 0 && noMatch.length === 0 && alreadyAdded.length > 0) {
        Alert.alert(
          'All Items Already in Cart',
          'All items on this list have already been added to your Kroger cart. Would you like to add them again?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Re-Add All',
              onPress: () => {
                setCartReaddFlags({});
                setCartReviewData({ ready: alreadyAdded, alreadyAdded: [], noMatch: [] });
                setCartSubstitutes({});
                setCartSubSelected({});
                setShowCartReview(true);
              },
            },
          ]
        );
        return;
      }

      setCartReaddFlags({});
      setCartReviewData({ ready, alreadyAdded, noMatch });
      setCartSubstitutes({});
      setCartSubSelected({});
      setCartSearchError(null);
      setShowCartReview(true);

      // Auto-search substitutes for unmatched items
      if (noMatch.length > 0) {
        setLoadingCartReview(true);
        try {
          const searchNames = noMatch.map((i: any) => simplifyItemName(i.name));
          const { results } = await shoppingApi.smartSearch(searchNames);
          const subs: Record<string, any[]> = {};
          const selected: Record<string, any | null> = {};
          for (let idx = 0; idx < results.length; idx++) {
            const r = results[idx];
            const matchItem = noMatch[idx];
            if (matchItem) {
              subs[matchItem.id] = (r.products || []).slice(0, 3);
              selected[matchItem.id] = r.products?.[0] || null;
            }
          }
          setCartSubstitutes(subs);
          setCartSubSelected(selected);
        } catch (searchErr: any) {
          const errCode = searchErr?.response?.data?.error;
          if (errCode === 'no_store_set') {
            setCartSearchError('Set your store location on the Shopping tab to find product matches.');
          }
        } finally {
          setLoadingCartReview(false);
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to prepare cart review.';
      Alert.alert('Error', msg);
    }
  };

  // --- Add deal to shopping list ---
  const [addedDealIdx, setAddedDealIdx] = useState<number | null>(null);
  const handleAddDealToList = async (deal: any, idx: number) => {
    if (!activeList) {
      Alert.alert('No List', 'Create or select a shopping list first.');
      return;
    }
    try {
      await shoppingApi.addItem(activeList.id, {
        name: deal.name,
        quantity: 1,
        unit: deal.size || 'each',
        krogerProductId: deal.krogerProductId,
      });
      setAddedDealIdx(idx);
      setTimeout(() => setAddedDealIdx(null), 2000);
      fetchLists();
    } catch {
      Alert.alert('Error', 'Failed to add item.');
    }
  };

  // --- Add to Kroger Cart from Shopping List (Cart Review flow) ---
  const handleAddListToKrogerCart = async () => {
    if (!activeList || addingToCart || cartAddedMsg) return;
    setCartAddedMsg(null);
    try {
      // Check Kroger OAuth
      const { isLinked } = await krogerApi.getStatus();
      setKrogerLinked(isLinked);
      if (!isLinked) {
        await handleLinkKrogerAccount();
        const rechecked = await krogerApi.getStatus();
        if (!rechecked.isLinked) return;
      }

      // Categorize unchecked items into 3 buckets (quantity-aware)
      const unchecked = activeList.items?.filter((i: any) => !i.isChecked) || [];
      let ready: any[] = [];
      let alreadyAdded: any[] = [];
      const noMatch: any[] = [];

      for (const item of unchecked) {
        const totalQty = item.quantity || 1;
        const cartedQty = item.krogerCartQuantity || 0;

        if (!item.krogerProductId) {
          // No Kroger match — needs product search
          noMatch.push(item);
        } else if (cartedQty <= 0) {
          // Never added — full quantity ready
          ready.push(item);
        } else if (cartedQty < totalQty) {
          // Partially added — split into remainder (ready) + already-added
          const remaining = totalQty - cartedQty;
          ready.push({ ...item, quantity: remaining, _fullQuantity: totalQty, _cartedQuantity: cartedQty });
          alreadyAdded.push({ ...item, quantity: cartedQty, _isPartial: true });
        } else {
          // Fully added (cartedQty >= totalQty)
          alreadyAdded.push(item);
        }
      }

      // Edge: no actionable items
      if (ready.length === 0 && noMatch.length === 0 && alreadyAdded.length === 0) {
        Alert.alert('No Items', 'No items to add to cart.');
        return;
      }

      // If ALL items are fully added, ask user if they want to re-order
      if (ready.length === 0 && noMatch.length === 0 && alreadyAdded.length > 0) {
        Alert.alert(
          'All Items Already in Cart',
          'All items on this list have already been added to your Kroger cart. Would you like to add them again?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Re-Add All',
              onPress: () => {
                setCartReaddFlags({});
                setCartReviewData({ ready: alreadyAdded, alreadyAdded: [], noMatch: [] });
                setCartSubstitutes({});
                setCartSubSelected({});
                setShowCartReview(true);
              },
            },
          ]
        );
        return;
      }

      setCartReaddFlags({});
      setCartReviewData({ ready, alreadyAdded, noMatch });
      setCartSubstitutes({});
      setCartSubSelected({});
      setShowCartReview(true);

      // Auto-search substitutes for unmatched items
      if (noMatch.length > 0) {
        setLoadingCartReview(true);
        try {
          // Simplify verbose product names for better search results
          const searchNames = noMatch.map((i: any) => simplifyItemName(i.name));
          const { results } = await shoppingApi.smartSearch(searchNames);
          const subs: Record<string, any[]> = {};
          const selected: Record<string, any | null> = {};
          for (let idx = 0; idx < results.length; idx++) {
            const r = results[idx];
            const matchItem = noMatch[idx]; // Use index since simplified names may differ from originals
            if (matchItem) {
              subs[matchItem.id] = (r.products || []).slice(0, 3);
              selected[matchItem.id] = r.products?.[0] || null;
            }
          }
          setCartSubstitutes(subs);
          setCartSubSelected(selected);
        } catch {
          // Search failed — user can still proceed with ready items
        } finally {
          setLoadingCartReview(false);
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to prepare cart review.';
      Alert.alert('Error', msg);
    }
  };

  // Confirm and send items from Cart Review modal
  const handleConfirmCartReview = async () => {
    if (!activeList || cartReviewSubmitting) return;
    setCartReviewSubmitting(true);
    try {
      const { ready, alreadyAdded, noMatch } = cartReviewData;

      // 1. Collect all cart items to send
      const cartItems: Array<{ upc: string; quantity: number }> = [];
      const cartItemIds: string[] = [];
      const itemQuantities: Record<string, number> = {}; // itemId → qty being sent

      // Ready items
      for (const item of ready) {
        const qty = item.quantity || 1;
        cartItems.push({ upc: item.krogerProductId, quantity: qty });
        cartItemIds.push(item.id);
        itemQuantities[item.id] = qty;
      }

      // Re-add toggled items
      for (const item of alreadyAdded) {
        if (cartReaddFlags[item.id] && item.krogerProductId) {
          const qty = item.quantity || 1;
          cartItems.push({ upc: item.krogerProductId, quantity: qty });
          cartItemIds.push(item.id);
          itemQuantities[item.id] = qty;
        }
      }

      // Substitute selections
      const subItemsToProcess: Array<{ originalItem: any; product: any }> = [];
      for (const item of noMatch) {
        const sel = cartSubSelected[item.id];
        if (sel?.krogerProductId) {
          const qty = item.quantity || 1;
          cartItems.push({ upc: sel.krogerProductId, quantity: qty });
          subItemsToProcess.push({ originalItem: item, product: sel });
        }
      }

      if (cartItems.length === 0) {
        Alert.alert('No Items Selected', 'Select at least one item to add to cart.');
        setCartReviewSubmitting(false);
        return;
      }

      // 2. Add to Kroger cart (marks ready + re-add items via backend with qty tracking)
      await krogerApi.addToCart(cartItems, { listId: activeList.id, itemIds: cartItemIds, itemQuantities });

      // 3. Update substitute items — save krogerProductId + mark carted with qty
      const subQuantities: Record<string, number> = {};
      for (const { originalItem, product } of subItemsToProcess) {
        await shoppingApi.editItem(activeList.id, originalItem.id, {
          name: product.name,
          krogerProductId: product.krogerProductId,
        });
        subQuantities[originalItem.id] = originalItem.quantity || 1;
      }
      if (subItemsToProcess.length > 0) {
        await shoppingApi.markItemsCarted(
          activeList.id,
          subItemsToProcess.map(s => s.originalItem.id),
          subQuantities,
        );
      }

      setShowCartReview(false);
      fetchLists();
      setShowKrogerSuccess({ count: cartItems.length });
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to add items to cart.';
      if (msg.includes('not linked') || msg.includes('expired')) {
        setShowCartReview(false);
        await handleLinkKrogerAccount();
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setCartReviewSubmitting(false);
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
    const updates: any = {};
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== showEditItem.name) updates.name = trimmedName;
    if (editQty) {
      const newQty = parseFloat(editQty);
      if (newQty !== showEditItem.quantity) updates.quantity = newQty;
    }
    if ((editUnit || '') !== (showEditItem.unit || '')) updates.unit = editUnit || undefined;
    if (Object.keys(updates).length === 0) {
      setShowEditItem(null);
      return;
    }
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

  const handleRenameList = async () => {
    if (!editingListName || !editingListName.name.trim()) return;
    try {
      await shoppingApi.updateList(editingListName.id, { name: editingListName.name.trim() });
      setEditingListName(null);
      fetchLists();
    } catch (err) {
      console.error('Failed to rename list:', err);
      Alert.alert('Error', 'Failed to rename list.');
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

  // Derive Kroger banner name from deals store (e.g. "Mariano's (123 Main St)" → "Mariano's")
  const krogerBannerName = dealsStoreName ? dealsStoreName.replace(/\s*\(.*\)$/, '') : 'Kroger';

  // Map Kroger banner to cart URL for deep linking
  const KROGER_CART_URLS: Record<string, string> = {
    'Kroger': 'https://www.kroger.com/cart',
    "Mariano's": 'https://www.marianos.com/cart',
    'King Soopers': 'https://www.kingsoopers.com/cart',
    'Fred Meyer': 'https://www.fredmeyer.com/cart',
    'Ralphs': 'https://www.ralphs.com/cart',
    "Fry's": 'https://www.frysfood.com/cart',
    'QFC': 'https://www.qfc.com/cart',
    "Smith's": 'https://www.smithsfoodanddrug.com/cart',
    'Dillons': 'https://www.dillons.com/cart',
    "Pick 'n Save": 'https://www.picknsave.com/cart',
    'Metro Market': 'https://www.metromarket.net/cart',
    'Harris Teeter': 'https://www.harristeeter.com/cart',
    'Food 4 Less': 'https://www.food4less.com/cart',
  };
  const krogerCartUrl = KROGER_CART_URLS[krogerBannerName] || 'https://www.kroger.com/cart';

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
      <View className="bg-primary-500 pt-3 pb-5 px-5">
        <View className="flex-row justify-between items-center">
          <Text className="text-white text-3xl font-bold tracking-tight">Shopping Lists</Text>
          <TouchableOpacity
            testID="profile-icon"
            onPress={() => router.push('/(tabs)/profile')}
            className="bg-white/20 w-9 h-9 rounded-xl items-center justify-center"
          >
            <Ionicons name="person-circle-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

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
              onPress={() => { setActiveList(list); setCartAddedMsg(null); }}
              onLongPress={() => {
                if (typeof window !== 'undefined' && window.confirm) {
                  // Web: show confirm dialog for delete (archive via separate button)
                  if (list.isActive !== false) {
                    const action = window.prompt(`${list.name}\n\nType "archive" to archive or "delete" to delete:`);
                    if (action === 'delete') handleDeleteList(list.id, list.name);
                    else if (action === 'archive') handleArchiveList(list.id);
                  } else {
                    if (window.confirm(`Delete "${list.name}"?`)) handleDeleteList(list.id, list.name);
                  }
                } else {
                  Alert.alert(list.name, undefined, [
                    ...(list.isActive !== false ? [{ text: 'Archive', onPress: () => handleArchiveList(list.id) }] : []),
                    { text: 'Delete', style: 'destructive' as const, onPress: () => handleDeleteList(list.id, list.name) },
                    { text: 'Cancel', style: 'cancel' as const },
                  ]);
                }
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
          {/* List name + actions bar */}
          <View className="px-4 py-2 bg-white border-b border-gray-100">
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center flex-1 mr-2">
                <Text className="text-base font-semibold text-gray-800" numberOfLines={1}>
                  {activeList.name}
                </Text>
                <TouchableOpacity
                  onPress={() => setEditingListName({ id: activeList.id, name: activeList.name })}
                  className="ml-2 p-1"
                >
                  <Ionicons name="pencil-outline" size={14} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs text-gray-400 mr-1">
                  {uncheckedItems.length} left
                </Text>
                {activeList.isActive !== false && (
                  <TouchableOpacity
                    onPress={() => handleArchiveList(activeList.id)}
                    className="p-1.5"
                  >
                    <Ionicons name="archive-outline" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleDeleteList(activeList.id, activeList.name)}
                  className="p-1.5"
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
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
              {uncheckedItems.length > 0 && (
                cartAddedMsg ? (
                  <TouchableOpacity
                    onPress={() => setCartAddedMsg(null)}
                    className="flex-row items-center bg-green-50 px-3 py-1.5 rounded-lg"
                  >
                    <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                    <Text className="text-xs text-green-700 ml-1 font-medium" numberOfLines={1}>{cartAddedMsg}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleAddListToKrogerCart}
                    className="flex-row items-center bg-orange-50 px-3 py-1.5 rounded-lg"
                  >
                    <Ionicons name="cart" size={14} color="#f97316" />
                    <Text className="text-xs text-orange-600 ml-1 font-medium">{krogerBannerName} Cart</Text>
                  </TouchableOpacity>
                )
              )}
              <TouchableOpacity
                onPress={() => setShowAddItem(true)}
                className="flex-row items-center bg-primary-500 px-4 py-2 rounded-xl shadow-sm"
              >
                <Ionicons name="add-circle" size={18} color="white" />
                <Text className="text-sm text-white ml-1.5 font-semibold">Add Item</Text>
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
            {/* Kroger Deals Near You */}
            {(deals.length > 0 || loadingDeals) && (
              <View className="bg-white pt-5 pb-4 px-5 border-b-8 border-gray-100">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg font-bold text-gray-900">
                    🏪 Kroger Deals Near You
                  </Text>
                  <View className="bg-yellow-100 px-3 py-1.5 rounded-xl flex-row items-center gap-1.5">
                    <View className="w-1.5 h-1.5 rounded-full bg-yellow-600" style={{ opacity: 1 }} />
                    <Text className="text-yellow-800 text-xs font-bold">LIVE</Text>
                  </View>
                </View>
                {loadingDeals ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-3">
                      {deals.map((deal: any, idx: number) => (
                        <TouchableOpacity
                          key={idx}
                          className="bg-gray-50 rounded-2xl overflow-hidden border-2 border-gray-200 w-36"
                          onPress={() => handleAddDealToList(deal, idx)}
                          activeOpacity={0.7}
                        >
                          {deal.imageUrl ? (
                            <View className="w-full h-[100px] bg-gradient-to-br from-yellow-200 to-orange-300 items-center justify-center">
                              <Image
                                source={{ uri: deal.imageUrl }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                              />
                            </View>
                          ) : (
                            <View className="w-full h-[100px] bg-gradient-to-br from-yellow-200 to-orange-300 items-center justify-center">
                              <Text className="text-5xl">🛒</Text>
                            </View>
                          )}
                          <View className="p-3">
                            <Text className="text-sm font-semibold text-gray-700 mb-1" numberOfLines={2}>
                              {deal.name}
                            </Text>
                            <Text className="text-lg font-bold text-red-500">
                              ${deal.price.toFixed(2)}
                            </Text>
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
              <View key={cat} className="mb-6">
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 pt-3 pb-3">
                  {cat === 'produce' ? '🥬 Produce' : cat === 'dairy' ? '🥛 Dairy' : cat === 'meat' ? '🍗 Protein' : cat === 'grains' ? '🌾 Grains' : cat === 'condiments' ? '🧂 Condiments' : cat === 'beverages' ? '🥤 Beverages' : '📦 Other'}
                </Text>
                {grouped[cat].map((item: any) => (
                  <View
                    key={item.id}
                    className="flex-row items-center px-4 py-4 bg-white rounded-2xl mx-4 mb-2 shadow-sm"
                  >
                    {/* Checkbox — separate touch target */}
                    <TouchableOpacity
                      onPress={() => handleToggleItem(item.id, item.isChecked)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      className="mr-3"
                    >
                      <View className="w-6 h-6 rounded-lg border-2 border-gray-300 items-center justify-center" />
                    </TouchableOpacity>
                    {/* Item content — opens action sheet */}
                    <TouchableOpacity
                      className="flex-1 flex-row items-center"
                      onPress={() => showItemActions(item)}
                    >
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-900">{item.name}</Text>
                        {(item.quantity || item.unit) && (
                          <Text className="text-sm text-gray-500 mt-0.5">
                            {item.quantity} {item.unit}
                          </Text>
                        )}
                        {item.notes && (
                          <Text className="text-xs text-gray-400 italic mt-0.5" numberOfLines={1}>
                            {item.notes}
                          </Text>
                        )}
                      </View>
                      {item.estimatedPrice && (
                        <Text className="text-sm text-gray-500 mr-2">${item.estimatedPrice.toFixed(2)}</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => showItemActions(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      className="px-1"
                    >
                      <Ionicons name="ellipsis-vertical" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}

            {/* Checked items */}
            {checkedItems.length > 0 && (
              <View className="mb-6">
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 pt-3 pb-3">
                  ✓ Checked ({checkedItems.length})
                </Text>
                {checkedItems.map((item: any) => (
                  <View
                    key={item.id}
                    className="flex-row items-center px-4 py-4 bg-white rounded-2xl mx-4 mb-2 shadow-sm opacity-60"
                  >
                    <TouchableOpacity
                      onPress={() => handleToggleItem(item.id, item.isChecked)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      className="mr-3"
                    >
                      <View className="w-6 h-6 rounded-lg bg-primary-500 items-center justify-center">
                        <Ionicons name="checkmark" size={16} color="white" />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1"
                      onPress={() => showItemActions(item)}
                    >
                      <Text className="text-base text-gray-500 line-through">{item.name}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => showItemActions(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      className="px-1"
                    >
                      <Ionicons name="ellipsis-vertical" size={20} color="#d1d5db" />
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
                  onChangeText={(text) => {
                    setEditQty(text);
                    const error = validateQuantity(text);
                    setEditQtyError(error);
                  }}
                  keyboardType="numeric"
                />
                {editQtyError ? (
                  <Text className="text-xs text-red-500 mt-1">{editQtyError}</Text>
                ) : null}
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
      <Modal visible={showPriceCompare} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowPriceCompare(false); setCartAddedMsg(null); }}>
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => { setShowPriceCompare(false); setCartAddedMsg(null); }}>
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
        onRequestClose={() => { setSelectedStore(null); setCartAddedMsg(null); }}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => { setSelectedStore(null); setCartAddedMsg(null); }}
          />
          <View className="bg-white rounded-t-2xl">
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
                    <TouchableOpacity onPress={() => { setSelectedStore(null); setCartAddedMsg(null); }}>
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
                      cartAddedMsg ? (
                        <View className="flex-row items-center justify-center py-3 rounded-xl bg-green-500">
                          <Ionicons name="checkmark-circle" size={16} color="white" />
                          <Text className="text-sm text-white ml-2 font-medium">{cartAddedMsg}</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          className={`flex-row items-center justify-center py-3 rounded-xl ${addingToCart ? 'bg-blue-400' : 'bg-blue-600'}`}
                          onPress={() => handleAddToKrogerCart(selectedStore)}
                          disabled={addingToCart}
                        >
                          {addingToCart ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <Ionicons name="cart-outline" size={16} color="white" />
                          )}
                          <Text className="text-sm text-white ml-2 font-medium">
                            {addingToCart ? 'Adding to Cart...' : `Add to ${selectedStore} Cart`}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </View>
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
      <Modal visible={showAddItem} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowAddItem(false); setSuggestions([]); setBulkMode(false); setAddMode('smart'); setSmartResults([]); stopListening(); }}>
        <View className="flex-1 bg-gray-50">
          {/* Header */}
          <View className="bg-primary-500 pt-3 pb-5 px-5">
            <View className="flex-row justify-between items-center">
              <TouchableOpacity onPress={() => { setShowAddItem(false); setSuggestions([]); setBulkMode(false); setAddMode('smart'); setSmartResults([]); stopListening(); }}>
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
              <Text className="text-white text-xl font-bold">
                {addMode === 'smart' ? 'Smart Add' : addMode === 'bulk' ? 'Add Multiple' : 'Add Item'}
              </Text>
              {addMode === 'smart' ? (
                <TouchableOpacity
                  onPress={handleSmartAdd}
                  disabled={Object.keys(smartSelected).length === 0}
                  className={`px-4 py-2 rounded-xl ${Object.keys(smartSelected).length > 0 ? 'bg-white' : 'bg-white/20'}`}
                >
                  <Text className={`font-bold text-sm ${Object.keys(smartSelected).length > 0 ? 'text-primary-600' : 'text-white/50'}`}>
                    Add {Object.keys(smartSelected).length > 0 ? `(${Object.keys(smartSelected).length})` : ''}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={addMode === 'bulk' ? handleBulkAdd : handleAddItem}
                  disabled={addMode === 'bulk' ? !bulkText.trim() : !newItemName.trim()}
                  className={`px-4 py-2 rounded-xl ${(addMode === 'bulk' ? bulkText.trim() : newItemName.trim()) ? 'bg-white' : 'bg-white/20'}`}
                >
                  <Text className={`font-bold text-sm ${(addMode === 'bulk' ? bulkText.trim() : newItemName.trim()) ? 'text-primary-600' : 'text-white/50'}`}>
                    Add
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Single / Bulk / Smart toggle */}
          <View className="flex-row mx-5 mt-4 bg-gray-100 rounded-xl overflow-hidden p-1">
            <TouchableOpacity
              onPress={() => { setAddMode('smart'); setBulkMode(false); }}
              className={`flex-1 py-2.5 rounded-lg items-center ${addMode === 'single' ? 'bg-primary-500 shadow-sm' : ''}`}
            >
              <Text className={`text-sm font-bold ${addMode === 'single' ? 'text-white' : 'text-gray-600'}`}>Single</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setAddMode('bulk'); setBulkMode(true); }}
              className={`flex-1 py-2.5 rounded-lg items-center ${addMode === 'bulk' ? 'bg-primary-500 shadow-sm' : ''}`}
            >
              <Text className={`text-sm font-bold ${addMode === 'bulk' ? 'text-white' : 'text-gray-600'}`}>Bulk</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setAddMode('smart'); setBulkMode(false); }}
              className={`flex-1 py-2.5 rounded-lg items-center ${addMode === 'smart' ? 'bg-primary-500 shadow-sm' : ''}`}
            >
              <Text className={`text-sm font-bold ${addMode === 'smart' ? 'text-white' : 'text-gray-600'}`}>Smart</Text>
            </TouchableOpacity>
          </View>

          {addMode === 'bulk' ? (
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
          ) : addMode === 'smart' ? (
            <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
              <View className="gap-3">
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">What do you need?</Text>
                  <View className="flex-row items-start gap-2">
                    <TextInput
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                      placeholder={"chicken breast, chocolate milk, greek yogurt"}
                      placeholderTextColor="#9ca3af"
                      value={smartText}
                      onChangeText={setSmartText}
                      multiline
                      numberOfLines={3}
                      style={{ minHeight: 70, textAlignVertical: 'top' }}
                      autoFocus
                    />
                    {isSupported && (
                      <TouchableOpacity
                        onPress={() => {
                          if (isListening) { stopListening(); }
                          else { resetTranscript(); startListening(); }
                        }}
                        className={`w-12 h-12 rounded-full items-center justify-center mt-1 ${isListening ? 'bg-red-500' : 'bg-primary-500'}`}
                      >
                        <Ionicons name={isListening ? 'mic' : 'mic-outline'} size={22} color="white" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text className="text-[10px] text-gray-400 mt-1">
                    {isListening ? 'Listening... speak your items' : 'Separate with commas or new lines — or tap the mic'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleSmartSearch}
                  disabled={!smartText.trim() || smartLoading}
                  className={`py-2.5 rounded-lg items-center ${smartText.trim() && !smartLoading ? 'bg-primary-500' : 'bg-gray-200'}`}
                >
                  {smartLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className={`text-sm font-medium ${smartText.trim() ? 'text-white' : 'text-gray-400'}`}>
                      Search Kroger
                    </Text>
                  )}
                </TouchableOpacity>

                {smartStoreName ? (
                  <Text className="text-[10px] text-gray-400 text-center -mt-1">
                    Results from {smartStoreName}
                  </Text>
                ) : null}

                {/* Results */}
                {smartResults.map((group: any) => (
                  <View key={group.query} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <View className="bg-gray-50 px-3 py-2 border-b border-gray-100">
                      <Text className="text-sm font-semibold text-gray-700 capitalize">{group.query}</Text>
                    </View>
                    {group.products?.map((product: any, idx: number) => {
                      const isSelected = smartSelected[group.query]?.name === product.name;
                      return (
                        <TouchableOpacity
                          key={`${product.name}-${idx}`}
                          className={`flex-row items-center px-3 py-2.5 ${idx > 0 ? 'border-t border-gray-100' : ''} ${isSelected ? 'bg-primary-50' : ''}`}
                          onPress={() => setSmartSelected(prev => {
                            const next = { ...prev };
                            if (isSelected) { delete next[group.query]; } else { next[group.query] = product; }
                            return next;
                          })}
                        >
                          {isSelected ? (
                            <View className="w-5 h-5 rounded-full bg-primary-500 items-center justify-center mr-2">
                              <Ionicons name="checkmark" size={14} color="white" />
                            </View>
                          ) : (
                            <View className="w-5 h-5 rounded-full border border-gray-300 mr-2" />
                          )}
                          <View className="flex-1">
                            <Text className="text-sm text-gray-800" numberOfLines={2}>{product.name}</Text>
                            <View className="flex-row items-center gap-1.5 mt-0.5">
                              {product.size ? (
                                <Text className="text-[10px] text-gray-400">{product.size}</Text>
                              ) : null}
                              {product.onSale && (
                                <View className="bg-red-50 px-1.5 py-0.5 rounded">
                                  <Text className="text-[9px] text-red-600 font-medium">Sale</Text>
                                </View>
                              )}
                              {product.goalAligned && (
                                <View className="flex-row items-center bg-green-50 px-1.5 py-0.5 rounded">
                                  <Ionicons name="leaf" size={8} color="#16a34a" />
                                  <Text className="text-[9px] text-green-600 ml-0.5">{product.goalReason || 'Fits goals'}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <View className="items-end ml-2">
                            {product.promoPrice != null ? (
                              <>
                                <Text className="text-xs font-semibold text-red-600">${product.promoPrice.toFixed(2)}</Text>
                                <Text className="text-[10px] text-gray-400 line-through">${product.price.toFixed(2)}</Text>
                              </>
                            ) : product.price != null ? (
                              <Text className="text-xs font-medium text-gray-600">${product.price.toFixed(2)}</Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {(!group.products || group.products.length === 0) && (
                      <View className="px-3 py-3">
                        <Text className="text-xs text-gray-400">No products found</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
              <View className="h-8" />
            </ScrollView>
          ) : (
            <View className="px-5 pt-4 gap-4">
              <View>
                <Text className="text-base font-semibold text-gray-900 mb-2">Item Name *</Text>
                <TextInput
                  className="bg-white border-2 border-gray-200 rounded-2xl px-4 py-4 text-base text-gray-900"
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
                          <View className="flex-row items-center gap-1">
                            <Text className="text-[10px] text-gray-400">
                              {product.category} · {product.size || product.defaultUnit}
                            </Text>
                            {product.goalAligned && (
                              <View className="flex-row items-center bg-green-50 px-1.5 py-0.5 rounded">
                                <Ionicons name="leaf" size={8} color="#16a34a" />
                                <Text className="text-[9px] text-green-600 ml-0.5">Fits goals</Text>
                              </View>
                            )}
                          </View>
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
                  <Text className="text-base font-semibold text-gray-900 mb-2">Quantity</Text>
                  <TextInput
                    className="bg-white border-2 border-gray-200 rounded-2xl px-4 py-4 text-base text-gray-900"
                    placeholder="e.g. 2"
                    placeholderTextColor="#9ca3af"
                    value={newItemQty}
                    onChangeText={(text) => {
                      setNewItemQty(text);
                      const error = validateQuantity(text);
                      setNewItemQtyError(error);
                    }}
                    keyboardType="numeric"
                  />
                  {newItemQtyError ? (
                    <Text className="text-xs text-red-500 mt-1">{newItemQtyError}</Text>
                  ) : null}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900 mb-2">Unit</Text>
                  <TextInput
                    className="bg-white border-2 border-gray-200 rounded-2xl px-4 py-4 text-base text-gray-900"
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

      {/* Rename List Modal */}
      <Modal
        visible={!!editingListName}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingListName(null)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-center items-center"
          activeOpacity={1}
          onPress={() => setEditingListName(null)}
        >
          <TouchableOpacity activeOpacity={1} className="bg-white rounded-2xl p-5 mx-6 w-80">
            <Text className="text-base font-semibold text-gray-800 mb-3">Rename List</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
              value={editingListName?.name || ''}
              onChangeText={(text) => setEditingListName(prev => prev ? { ...prev, name: text } : null)}
              autoFocus
              selectTextOnFocus
            />
            <View className="flex-row justify-end gap-3 mt-4">
              <TouchableOpacity onPress={() => setEditingListName(null)} className="px-4 py-2">
                <Text className="text-gray-500 text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRenameList}
                disabled={!editingListName?.name.trim()}
                className="bg-primary-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white text-sm font-medium">Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
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

      {/* Cart Review Modal */}
      <Modal visible={showCartReview} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCartReview(false)}>
        <View className="flex-1 bg-gray-50">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowCartReview(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <View className="items-center">
              <Text className="text-lg font-semibold text-gray-800">Review Cart Items</Text>
              <View className="flex-row items-center mt-0.5">
                <View className="w-2 h-2 rounded-full bg-orange-500 mr-1" />
                <Text className="text-xs text-gray-500">{krogerBannerName}</Text>
              </View>
            </View>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Summary banner */}
            <View className="mx-4 mt-3 bg-gray-100 rounded-lg px-3 py-2 flex-row items-center justify-between">
              <Text className="text-xs text-gray-600">
                {cartReviewData.ready.length + cartReviewData.alreadyAdded.length + cartReviewData.noMatch.length} item{(cartReviewData.ready.length + cartReviewData.alreadyAdded.length + cartReviewData.noMatch.length) !== 1 ? 's' : ''} total
              </Text>
              <View className="flex-row gap-3">
                {cartReviewData.ready.length > 0 && (
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                    <Text className="text-xs text-gray-600">{cartReviewData.ready.length} ready</Text>
                  </View>
                )}
                {cartReviewData.alreadyAdded.length > 0 && (
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-yellow-500 mr-1" />
                    <Text className="text-xs text-gray-600">{cartReviewData.alreadyAdded.length} in cart</Text>
                  </View>
                )}
                {cartReviewData.noMatch.length > 0 && (
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                    <Text className="text-xs text-gray-600">{cartReviewData.noMatch.length} need match</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Section 1: Ready to Add (green) */}
            {cartReviewData.ready.length > 0 && (
              <View className="mx-4 mt-4">
                <View className="bg-green-50 rounded-xl p-3">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                    <Text className="text-sm font-semibold text-green-800 ml-2">Ready to Add ({cartReviewData.ready.length})</Text>
                  </View>
                  {cartReviewData.ready.map((item: any) => (
                    <View key={item.id} className="flex-row items-center py-1.5 border-t border-green-100">
                      <Ionicons name="checkmark" size={14} color="#16a34a" />
                      <Text className="text-sm text-gray-800 ml-2 flex-1" numberOfLines={1}>{item.name}</Text>
                      <View className="items-end">
                        <Text className="text-xs text-gray-500">{item.quantity || 1} {item.unit || ''}</Text>
                        {item._cartedQuantity > 0 && (
                          <Text className="text-[10px] text-green-600">{item._cartedQuantity} already in cart</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Section 2: Already in Cart (yellow) */}
            {cartReviewData.alreadyAdded.length > 0 && (
              <View className="mx-4 mt-3">
                <View className="bg-yellow-50 rounded-xl p-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center">
                      <Ionicons name="warning" size={18} color="#ca8a04" />
                      <Text className="text-sm font-semibold text-yellow-800 ml-2">Already in Cart ({cartReviewData.alreadyAdded.length})</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        const allOn = cartReviewData.alreadyAdded.every((i: any) => cartReaddFlags[i.id]);
                        const flags: Record<string, boolean> = { ...cartReaddFlags };
                        cartReviewData.alreadyAdded.forEach((i: any) => { flags[i.id] = !allOn; });
                        setCartReaddFlags(flags);
                      }}
                    >
                      <Text className="text-xs text-orange-600 font-medium">
                        {cartReviewData.alreadyAdded.every((i: any) => cartReaddFlags[i.id]) ? 'Deselect All' : 'Select All'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text className="text-xs text-yellow-700 mb-2">Tap to re-add — great for weekly re-orders</Text>
                  {cartReviewData.alreadyAdded.map((item: any) => (
                    <TouchableOpacity
                      key={item.id}
                      className="flex-row items-center py-2 border-t border-yellow-100"
                      onPress={() => setCartReaddFlags(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                    >
                      <Ionicons
                        name={cartReaddFlags[item.id] ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={cartReaddFlags[item.id] ? '#f97316' : '#9ca3af'}
                      />
                      <View className="flex-1 ml-2">
                        <Text className="text-sm text-gray-800" numberOfLines={1}>{item.name}</Text>
                        {item._isPartial && (
                          <Text className="text-[10px] text-yellow-700">{item.quantity} of {item._fullQuantity || item.quantity} in cart</Text>
                        )}
                      </View>
                      <Text className="text-xs text-yellow-600">
                        {item.quantity} {item.unit || ''} in cart
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Section 3: Find a Match (blue) */}
            {cartReviewData.noMatch.length > 0 && (
              <View className="mx-4 mt-3">
                <View className="bg-blue-50 rounded-xl p-3">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="search" size={18} color="#2563eb" />
                    <Text className="text-sm font-semibold text-blue-800 ml-2">Find a Match ({cartReviewData.noMatch.length})</Text>
                  </View>
                  {loadingCartReview ? (
                    <View className="items-center py-4">
                      <ActivityIndicator size="small" color="#2563eb" />
                      <Text className="text-xs text-blue-600 mt-2">Searching for matches...</Text>
                    </View>
                  ) : (
                    <>
                    {cartSearchError && (
                      <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-2 flex-row items-center">
                        <Ionicons name="location-outline" size={14} color="#d97706" />
                        <Text className="text-xs text-yellow-700 ml-1 flex-1">{cartSearchError}</Text>
                      </View>
                    )}
                    {cartReviewData.noMatch.map((item: any) => {
                      const subs = cartSubstitutes[item.id] || [];
                      const selected = cartSubSelected[item.id];
                      return (
                        <View key={item.id} className="border-t border-blue-100 pt-2 pb-1">
                          <Text className="text-sm font-medium text-gray-800 mb-1">{item.name} ({item.quantity || 1} {item.unit || ''})</Text>
                          {subs.length === 0 ? (
                            <Text className="text-xs text-gray-400 italic ml-2">{cartSearchError ? 'Store location needed' : 'No matches found'}</Text>
                          ) : (
                            subs.map((prod: any, idx: number) => {
                              const isSelected = selected?.krogerProductId === prod.krogerProductId;
                              return (
                                <TouchableOpacity
                                  key={prod.krogerProductId || idx}
                                  className={`flex-row items-center p-2 ml-1 rounded-lg mb-1 ${isSelected ? 'bg-blue-100 border border-blue-300' : 'bg-white border border-gray-100'}`}
                                  onPress={() => {
                                    setCartSubSelected(prev => ({
                                      ...prev,
                                      [item.id]: isSelected ? null : prod,
                                    }));
                                  }}
                                >
                                  <Ionicons
                                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                                    size={16}
                                    color={isSelected ? '#2563eb' : '#9ca3af'}
                                  />
                                  {prod.imageUrl ? (
                                    <Image source={{ uri: prod.imageUrl }} style={{ width: 32, height: 32, borderRadius: 4 }} className="ml-2" cachePolicy="memory-disk" />
                                  ) : (
                                    <View className="w-8 h-8 bg-gray-100 rounded ml-2 items-center justify-center">
                                      <Ionicons name="cube-outline" size={14} color="#9ca3af" />
                                    </View>
                                  )}
                                  <View className="flex-1 ml-2">
                                    <Text className="text-xs text-gray-800 font-medium" numberOfLines={1}>{prod.name}</Text>
                                    <Text className="text-xs text-gray-500">{prod.size || ''}</Text>
                                  </View>
                                  <View className="items-end">
                                    {prod.promoPrice ? (
                                      <View className="flex-row items-center">
                                        <Text className="text-xs text-red-600 font-semibold">${prod.promoPrice.toFixed(2)}</Text>
                                        <Text className="text-xs text-gray-400 line-through ml-1">${prod.price.toFixed(2)}</Text>
                                      </View>
                                    ) : (
                                      <Text className="text-xs text-gray-700 font-medium">${prod.price?.toFixed(2) || '—'}</Text>
                                    )}
                                    <View className="flex-row mt-0.5">
                                      {prod.onSale && (
                                        <View className="bg-red-100 px-1 rounded mr-1">
                                          <Text className="text-[9px] text-red-600 font-bold">SALE</Text>
                                        </View>
                                      )}
                                      {prod.goalAligned && (
                                        <View className="bg-emerald-100 px-1 rounded">
                                          <Text className="text-[9px] text-emerald-700 font-bold">{prod.goalReason || 'GOAL'}</Text>
                                        </View>
                                      )}
                                    </View>
                                  </View>
                                </TouchableOpacity>
                              );
                            })
                          )}
                        </View>
                      );
                    })}
                    </>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom sticky bar */}
          {(() => {
            const readyCount = cartReviewData.ready.length;
            const readdCount = Object.values(cartReaddFlags).filter(Boolean).length;
            const subCount = cartReviewData.noMatch.filter((i: any) => cartSubSelected[i.id]?.krogerProductId).length;
            const totalSelected = readyCount + readdCount + subCount;
            return (
              <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 pb-6">
                <TouchableOpacity
                  className={`py-3 rounded-xl items-center ${totalSelected > 0 && !cartReviewSubmitting ? 'bg-orange-500' : 'bg-gray-300'}`}
                  disabled={totalSelected === 0 || cartReviewSubmitting}
                  onPress={handleConfirmCartReview}
                >
                  {cartReviewSubmitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Text className="text-white font-semibold text-base">Add to {krogerBannerName} Cart</Text>
                      <Text className="text-white/80 text-xs mt-0.5">{totalSelected} item{totalSelected !== 1 ? 's' : ''} selected</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text className="text-xs text-gray-400 text-center mt-2">Walmart, Target, and more coming soon</Text>
              </View>
            );
          })()}
        </View>
      </Modal>

      {/* Kroger Success Deep Link Modal */}
      <Modal visible={!!showKrogerSuccess} transparent animationType="fade" onRequestClose={() => { setShowKrogerSuccess(null); setCartAddedMsg(`${showKrogerSuccess?.count} item(s) added!`); }}>
        <TouchableOpacity
          className="flex-1 bg-black/40 items-center justify-center"
          activeOpacity={1}
          onPress={() => { setShowKrogerSuccess(null); setCartAddedMsg(`${showKrogerSuccess?.count} item(s) added!`); }}
        >
          <View className="bg-white rounded-2xl mx-8 p-5 w-80" onStartShouldSetResponder={() => true}>
            <View className="items-center mb-3">
              <View className="w-12 h-12 rounded-full bg-green-100 items-center justify-center mb-2">
                <Ionicons name="checkmark-circle" size={28} color="#10b981" />
              </View>
              <Text className="text-base font-semibold text-gray-800">Added to Cart!</Text>
              <Text className="text-sm text-gray-500 text-center mt-1">
                {showKrogerSuccess?.count} item(s) added to your {krogerBannerName} cart
              </Text>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-lg bg-gray-100 items-center"
                onPress={() => { setShowKrogerSuccess(null); setCartAddedMsg(`${showKrogerSuccess?.count} item(s) added!`); }}
              >
                <Text className="text-sm font-medium text-gray-600">Stay Here</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-lg bg-orange-500 items-center"
                onPress={() => { setShowKrogerSuccess(null); setCartAddedMsg(`${showKrogerSuccess?.count} item(s) added!`); Linking.openURL(krogerCartUrl); }}
              >
                <Text className="text-sm font-medium text-white">Open {krogerBannerName}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
