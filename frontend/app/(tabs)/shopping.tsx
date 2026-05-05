import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import { shoppingApi, mealPlansApi, inventoryApi, groceryApi, krogerApi } from '../../src/services/api';
import useSpeechRecognition from '../../src/hooks/useSpeechRecognition';
import {
  CATEGORY_ORDER, KROGER_BANNERS, suggestStorage, simplifyItemName,
  parseNaturalItems, validateQuantity,
} from '../../src/components/shopping/shoppingHelpers';
import ComparePricesModal from '../../src/components/shopping/ComparePricesModal';
import AddItemsModal from '../../src/components/shopping/AddItemsModal';
import CartReviewModal from '../../src/components/shopping/CartReviewModal';
import PurchaseAllModal from '../../src/components/shopping/PurchaseAllModal';
import CreateListModal from '../../src/components/shopping/CreateListModal';

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
  const [cartAddedMsg, setCartAddedMsg] = useState<string | null>(null);
  const [showKrogerSuccess, setShowKrogerSuccess] = useState<{ count: number } | null>(null);
  const [krogerLinked, setKrogerLinked] = useState(false);

  // Cart Review modal state
  const [showCartReview, setShowCartReview] = useState(false);
  const [cartReviewData, setCartReviewData] = useState<{ ready: any[]; alreadyAdded: any[]; noMatch: any[] }>({ ready: [], alreadyAdded: [], noMatch: [] });
  const [cartSubstitutes, setCartSubstitutes] = useState<Record<string, any[]>>({});
  const [cartSubSelected, setCartSubSelected] = useState<Record<string, any | null>>({});
  const [cartReaddFlags, setCartReaddFlags] = useState<Record<string, boolean>>({});
  const [loadingCartReview, setLoadingCartReview] = useState(false);
  const [cartReviewSubmitting, setCartReviewSubmitting] = useState(false);
  const [cartSearchError, setCartSearchError] = useState<string | null>(null);

  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [showListActions, setShowListActions] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState<{ id: string; name: string } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  // Sync voice transcript to smart text input
  useEffect(() => {
    if (transcript && addMode === 'smart') {
      setSmartText(transcript);
    }
  }, [transcript, addMode]);

  // Clear selection when active list changes
  useEffect(() => { setSelectedItems(new Set()); }, [activeList?.id]);

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const toggleSelectAll = (unchecked: any[]) => {
    const allIds = unchecked.map((i: any) => i.id);
    const allSelected = allIds.every(id => selectedItems.has(id));
    setSelectedItems(allSelected ? new Set() : new Set(allIds));
  };

  const handleMarkSelectedPurchased = () => {
    if (selectedItems.size === 0 || !activeList) return;
    const selectedNames = activeList.items
      .filter((i: any) => selectedItems.has(i.id) && !i.isChecked)
      .map((i: any) => i.name);
    Alert.alert(
      'Mark as Purchased',
      `Add ${selectedNames.length} item(s) to your inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose Storage',
          onPress: async () => {
            setPurchaseLoading(true); setShowPurchaseAll(true);
            try {
              const data = await shoppingApi.purchasePreview(activeList.id);
              const filtered = (data.items || []).filter((i: any) => selectedItems.has(i.id));
              setPurchasePreview(filtered);
            } catch { setPurchasePreview([]); }
            finally { setPurchaseLoading(false); }
          },
        },
      ],
    );
  };

  const fetchLists = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await shoppingApi.getLists();
      const allLists = data.lists || [];
      setLists(allLists);
      if (activeList) {
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

  useEffect(() => { fetchLists(true); }, []);

  useEffect(() => {
    if (!cartAddedMsg) return;
    const timer = setTimeout(() => setCartAddedMsg(null), 5000);
    return () => clearTimeout(timer);
  }, [cartAddedMsg]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setUserLocation(coords);
          shoppingApi.setKrogerLocation(coords.lat, coords.lng).catch(() => {});
          setLoadingDeals(true);
          try {
            const data = await groceryApi.getDeals(coords.lat, coords.lng, 10);
            setDeals(data.deals || []);
            setDealsStoreName(data.storeName || '');
          } catch {} finally { setLoadingDeals(false); }
        }
      } catch {}
    })();
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleGenerateFromMealPlan = async () => {
    setGenerating(true);
    try {
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
      const { items: inventoryItems } = await inventoryApi.getInventory();
      const inventoryNames = new Set(inventoryItems.map((i: any) => i.name.toLowerCase()));
      const ingredientMap: Record<string, { name: string; quantity: number; unit: string; category: string }> = {};
      for (const slot of activePlan.slots) {
        if (!slot.recipe?.ingredients) continue;
        const ingredients = typeof slot.recipe.ingredients === 'string'
          ? JSON.parse(slot.recipe.ingredients) : slot.recipe.ingredients;
        for (const ing of ingredients) {
          const key = ing.name?.toLowerCase() || 'unknown';
          if (inventoryNames.has(key)) continue;
          if (!ingredientMap[key]) {
            ingredientMap[key] = { name: ing.name || key, quantity: parseFloat(ing.amount) || 1, unit: ing.unit || '', category: ing.category || 'other' };
          } else { ingredientMap[key].quantity += parseFloat(ing.amount) || 1; }
        }
      }
      const items = Object.values(ingredientMap);
      if (items.length === 0) { Alert.alert('All Stocked', 'You already have all the ingredients in your inventory!'); return; }
      await shoppingApi.createList({
        name: `Meal Plan - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        sourceType: 'recipe', items,
      });
      fetchLists();
    } catch (err) {
      console.error('Failed to generate shopping list:', err);
      Alert.alert('Error', 'Failed to generate shopping list. Make sure you have a meal plan with recipes.');
    } finally { setGenerating(false); }
  };

  const handleToggleItem = async (itemId: string, isChecked: boolean) => {
    if (!activeList) return;
    setActiveList((prev: any) => ({ ...prev, items: prev.items.map((i: any) => i.id === itemId ? { ...i, isChecked: !isChecked } : i) }));
    try { await shoppingApi.toggleItem(activeList.id, itemId, !isChecked); }
    catch (err) { console.error('Failed to toggle item:', err); setActiveList((prev: any) => ({ ...prev, items: prev.items.map((i: any) => i.id === itemId ? { ...i, isChecked: isChecked } : i) })); }
  };

  const handlePurchaseItem = async (itemId: string, storageLocation: string) => {
    if (!activeList) return;
    try {
      await shoppingApi.purchaseItem(activeList.id, itemId, storageLocation);
      setActiveList((prev: any) => ({ ...prev, items: prev.items.map((i: any) => i.id === itemId ? { ...i, isChecked: true } : i) }));
      setShowStoragePicker(null);
    } catch (err) { console.error('Failed to purchase item:', err); Alert.alert('Error', 'Failed to add item to inventory.'); }
  };

  const searchTimeout = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleItemNameChange = (text: string) => {
    setNewItemName(text);
    setNewItemKrogerId(undefined);
    if (searchTimeout[0]) clearTimeout(searchTimeout[0]);
    if (text.trim().length >= 2) {
      searchTimeout[0] = setTimeout(async () => {
        try {
          const opts = userLocation ? { kroger: true, lat: userLocation.lat, lng: userLocation.lng } : undefined;
          const data = await shoppingApi.searchProducts(text.trim(), opts);
          setSuggestions(data.products || []);
        } catch { setSuggestions([]); }
      }, 250);
    } else { setSuggestions([]); }
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
    setShowAddItem(false); setNewItemName(''); setNewItemQty(''); setNewItemUnit(''); setNewItemKrogerId(undefined); setSuggestions([]);
    const tempItem = { id: `temp-${Date.now()}`, name: itemName, quantity: itemQty, unit: itemUnit, isChecked: false, category: 'other', krogerProductId: itemKrogerId };
    setActiveList((prev: any) => ({ ...prev, items: [...(prev.items || []), tempItem] }));
    try {
      const result = await shoppingApi.addItem(activeList.id, { name: itemName, quantity: itemQty, unit: itemUnit, krogerProductId: itemKrogerId });
      if (result.item?.action === 'aggregated') Alert.alert('Combined', `"${result.item.name}" quantity updated (combined with existing item).`);
      fetchLists();
    } catch (err) {
      console.error('Failed to add item:', err);
      setActiveList((prev: any) => ({ ...prev, items: (prev.items || []).filter((i: any) => i.id !== tempItem.id) }));
      Alert.alert('Error', 'Failed to add item.');
    }
  };

  const handleBulkAdd = async () => {
    if (!activeList || !bulkText.trim()) return;
    const text = bulkText.trim();
    setShowAddItem(false); setBulkText(''); setBulkMode(false);
    try {
      const result = await shoppingApi.bulkAddItems(activeList.id, text);
      Alert.alert('Added', `${result.count} item(s) added to your list.`);
      fetchLists();
    } catch (err) { console.error('Failed to bulk add items:', err); Alert.alert('Error', 'Failed to add items.'); }
  };

  const handleSmartSearch = async () => {
    if (!smartText.trim()) return;
    setSmartLoading(true); setSmartResults([]); setSmartSelected({});
    try {
      const hasStructure = /[,\n]/.test(smartText.trim());
      let items: string[];
      if (hasStructure) { items = parseNaturalItems(smartText); }
      else { const parsed = await shoppingApi.parseItems(smartText.trim()); items = parsed.items; }
      if (items.length === 0) { setSmartLoading(false); return; }
      const data = await shoppingApi.smartSearch(items);
      setSmartResults(data.results || []); setSmartStoreName(data.storeName || '');
      const autoSelect: Record<string, any> = {};
      for (const r of (data.results || [])) { if (r.products?.length > 0) autoSelect[r.query] = r.products[0]; }
      setSmartSelected(autoSelect);
    } catch (err: any) {
      if (err?.response?.data?.error === 'no_store_set') Alert.alert('No Store Set', 'Visit the Shopping tab and grant location access to set your store first.');
      else Alert.alert('Error', 'Smart search failed. Try again.');
    } finally { setSmartLoading(false); }
  };

  const handleSmartAdd = async () => {
    if (!activeList || Object.keys(smartSelected).length === 0) return;
    setShowAddItem(false);
    const selected = Object.values(smartSelected);
    setSmartText(''); setSmartResults([]); setSmartSelected({}); setAddMode('smart');
    try {
      let count = 0;
      for (const product of selected) {
        await shoppingApi.addItem(activeList.id, { name: product.name, quantity: 1, unit: product.size || 'each', krogerProductId: product.krogerProductId });
        count++;
      }
      Alert.alert('Added', `${count} item(s) added to your list.`);
      fetchLists();
    } catch (err) { console.error('Failed to add smart items:', err); Alert.alert('Error', 'Failed to add some items.'); fetchLists(); }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      await shoppingApi.createList({ name: newListName.trim(), sourceType: 'manual', items: [] });
      setShowCreateList(false); setNewListName(''); fetchLists();
    } catch (err) { console.error('Failed to create list:', err); }
  };

  const handleDeleteList = async (listId: string, name: string) => {
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
    } catch (err) { console.error('Failed to delete list:', err); }
  };

  const handleOpenPurchaseAll = async () => {
    if (!activeList) return;
    setPurchaseLoading(true); setShowPurchaseAll(true);
    try {
      const data = await shoppingApi.purchasePreview(activeList.id);
      setPurchasePreview(data.items || []);
    } catch (err) { console.error('Failed to load purchase preview:', err); setPurchasePreview([]); }
    finally { setPurchaseLoading(false); }
  };

  const updatePreviewStorage = (itemId: string, storage: string) => {
    setPurchasePreview(prev => prev.map(item => item.id === itemId ? { ...item, storageLocation: storage } : item));
  };

  const handleConfirmPurchaseAll = async () => {
    if (!activeList) return;
    setPurchaseLoading(true);
    try {
      const itemLocations = purchasePreview.map(item => ({ itemId: item.id, storageLocation: item.storageLocation }));
      const result = await shoppingApi.purchaseAll(activeList.id, itemLocations);
      setShowPurchaseAll(false);
      Alert.alert('Added to Inventory', `${result.count} item(s) added to your inventory!`);
      fetchLists();
    } catch (err) { console.error('Failed to purchase all:', err); Alert.alert('Error', 'Failed to add items to inventory.'); }
    finally { setPurchaseLoading(false); }
  };

  const handleComparePrices = async () => {
    if (!activeList?.items?.length) return;
    setLoadingPrices(true); setShowPriceCompare(true);
    try {
      const unchecked = activeList.items.filter((i: any) => !i.isChecked).map((i: any) => i.name);
      if (unchecked.length === 0) { setPriceData(null); return; }
      let location: { lat: number; lng: number } | undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          location = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setUserLocation(location);
        }
      } catch {}
      const data = await groceryApi.comparePrices(unchecked, location);
      setPriceData(data); setSelectedStore(null);
    } catch (err) { console.error('Failed to compare prices:', err); }
    finally { setLoadingPrices(false); }
  };

  const handleOpenStore = async (url: string) => {
    try { await Linking.openURL(url); } catch { Alert.alert('Error', 'Could not open store link.'); }
  };

  const handleLinkKrogerAccount = async () => {
    try {
      const { url } = await krogerApi.getAuthUrl();
      if (!url) { Alert.alert('Unavailable', 'Kroger integration is not configured.'); return; }
      await WebBrowser.openBrowserAsync(url);
      const { isLinked } = await krogerApi.getStatus();
      setKrogerLinked(isLinked);
      if (isLinked) Alert.alert('Linked!', 'Your store account is now connected. You can add items to your cart.');
    } catch { Alert.alert('Error', 'Failed to open sign-in page.'); }
  };

  const handleAddToKrogerCart = async (storeName: string) => {
    if (addingToCart || cartAddedMsg) return;
    setCartAddedMsg(null);
    try {
      const { isLinked } = await krogerApi.getStatus();
      setKrogerLinked(isLinked);
      if (!isLinked) {
        await handleLinkKrogerAccount();
        const rechecked = await krogerApi.getStatus();
        if (!rechecked.isLinked) return;
      }
      let ready: any[] = []; let alreadyAdded: any[] = []; const noMatch: any[] = [];
      for (const item of priceData?.items || []) {
        const sp = item.stores?.find((s: any) => s.store === storeName);
        const listItem = activeList?.items?.find((li: any) => li.name.toLowerCase() === item.item.toLowerCase());
        const merged = { id: listItem?.id || item.item, name: item.item, quantity: listItem?.quantity || 1, unit: listItem?.unit || '', krogerProductId: sp?.krogerProductId || listItem?.krogerProductId, addedToKrogerCartAt: listItem?.addedToKrogerCartAt, krogerCartQuantity: listItem?.krogerCartQuantity || 0 };
        const totalQty = merged.quantity || 1; const cartedQty = merged.krogerCartQuantity || 0;
        if (!merged.krogerProductId) { noMatch.push(merged); }
        else if (cartedQty <= 0) { ready.push(merged); }
        else if (cartedQty < totalQty) { const remaining = totalQty - cartedQty; ready.push({ ...merged, quantity: remaining, _fullQuantity: totalQty, _cartedQuantity: cartedQty }); alreadyAdded.push({ ...merged, quantity: cartedQty, _isPartial: true }); }
        else { alreadyAdded.push(merged); }
      }
      if (ready.length === 0 && noMatch.length === 0 && alreadyAdded.length === 0) { Alert.alert('No Items', 'No items have Kroger product IDs. Try comparing prices with location enabled.'); return; }
      if (ready.length === 0 && noMatch.length === 0 && alreadyAdded.length > 0) {
        Alert.alert('All Items Already in Cart', 'All items on this list have already been added to your Kroger cart. Would you like to add them again?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Re-Add All', onPress: () => { setCartReaddFlags({}); setCartReviewData({ ready: alreadyAdded, alreadyAdded: [], noMatch: [] }); setCartSubstitutes({}); setCartSubSelected({}); setShowCartReview(true); } },
        ]);
        return;
      }
      setCartReaddFlags({}); setCartReviewData({ ready, alreadyAdded, noMatch }); setCartSubstitutes({}); setCartSubSelected({}); setCartSearchError(null); setShowCartReview(true);
      if (noMatch.length > 0) {
        setLoadingCartReview(true);
        try {
          const searchNames = noMatch.map((i: any) => simplifyItemName(i.name));
          const { results } = await shoppingApi.smartSearch(searchNames);
          const subs: Record<string, any[]> = {}; const selected: Record<string, any | null> = {};
          for (let idx = 0; idx < results.length; idx++) { const r = results[idx]; const matchItem = noMatch[idx]; if (matchItem) { subs[matchItem.id] = (r.products || []).slice(0, 5); selected[matchItem.id] = r.products?.[0] || null; } }
          setCartSubstitutes(subs); setCartSubSelected(selected);
        } catch (searchErr: any) { if (searchErr?.response?.data?.error === 'no_store_set') setCartSearchError('Set your store location on the Shopping tab to find product matches.'); }
        finally { setLoadingCartReview(false); }
      }
    } catch (err: any) { Alert.alert('Error', err?.response?.data?.error || 'Failed to prepare cart review.'); }
  };

  const [addedDealIdx, setAddedDealIdx] = useState<number | null>(null);
  const handleAddDealToList = async (deal: any, idx: number) => {
    if (!activeList) { Alert.alert('No List', 'Create or select a shopping list first.'); return; }
    try {
      await shoppingApi.addItem(activeList.id, { name: deal.name, quantity: 1, unit: deal.size || 'each', krogerProductId: deal.krogerProductId });
      setAddedDealIdx(idx); setTimeout(() => setAddedDealIdx(null), 2000); fetchLists();
    } catch { Alert.alert('Error', 'Failed to add item.'); }
  };

  const handleAddListToKrogerCart = async () => {
    if (!activeList || addingToCart || cartAddedMsg) return;
    setCartAddedMsg(null);
    try {
      const { isLinked } = await krogerApi.getStatus();
      setKrogerLinked(isLinked);
      if (!isLinked) { await handleLinkKrogerAccount(); const rechecked = await krogerApi.getStatus(); if (!rechecked.isLinked) return; }
      const unchecked = activeList.items?.filter((i: any) => !i.isChecked) || [];
      let ready: any[] = []; let alreadyAdded: any[] = []; const noMatch: any[] = [];
      for (const item of unchecked) {
        const totalQty = item.quantity || 1; const cartedQty = item.krogerCartQuantity || 0;
        if (!item.krogerProductId) { noMatch.push(item); }
        else if (cartedQty <= 0) { ready.push(item); }
        else if (cartedQty < totalQty) { const remaining = totalQty - cartedQty; ready.push({ ...item, quantity: remaining, _fullQuantity: totalQty, _cartedQuantity: cartedQty }); alreadyAdded.push({ ...item, quantity: cartedQty, _isPartial: true }); }
        else { alreadyAdded.push(item); }
      }
      if (ready.length === 0 && noMatch.length === 0 && alreadyAdded.length === 0) { Alert.alert('No Items', 'No items to add to cart.'); return; }
      if (ready.length === 0 && noMatch.length === 0 && alreadyAdded.length > 0) {
        Alert.alert('All Items Already in Cart', 'All items on this list have already been added to your Kroger cart. Would you like to add them again?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Re-Add All', onPress: () => { setCartReaddFlags({}); setCartReviewData({ ready: alreadyAdded, alreadyAdded: [], noMatch: [] }); setCartSubstitutes({}); setCartSubSelected({}); setShowCartReview(true); } },
        ]);
        return;
      }
      setCartReaddFlags({}); setCartReviewData({ ready, alreadyAdded, noMatch }); setCartSubstitutes({}); setCartSubSelected({}); setShowCartReview(true);
      if (noMatch.length > 0) {
        setLoadingCartReview(true);
        try {
          const searchNames = noMatch.map((i: any) => simplifyItemName(i.name));
          const { results } = await shoppingApi.smartSearch(searchNames);
          const subs: Record<string, any[]> = {}; const selected: Record<string, any | null> = {};
          for (let idx = 0; idx < results.length; idx++) { const r = results[idx]; const matchItem = noMatch[idx]; if (matchItem) { subs[matchItem.id] = (r.products || []).slice(0, 5); selected[matchItem.id] = r.products?.[0] || null; } }
          setCartSubstitutes(subs); setCartSubSelected(selected);
        } catch {} finally { setLoadingCartReview(false); }
      }
    } catch (err: any) { Alert.alert('Error', err?.response?.data?.error || 'Failed to prepare cart review.'); }
  };

  const handleConfirmCartReview = async () => {
    if (!activeList || cartReviewSubmitting) return;
    setCartReviewSubmitting(true);
    try {
      const { ready, alreadyAdded, noMatch } = cartReviewData;
      const cartItems: Array<{ upc: string; quantity: number }> = [];
      const cartItemIds: string[] = [];
      const itemQuantities: Record<string, number> = {};
      for (const item of ready) { const qty = item.quantity || 1; cartItems.push({ upc: item.krogerProductId, quantity: qty }); cartItemIds.push(item.id); itemQuantities[item.id] = qty; }
      for (const item of alreadyAdded) { if (cartReaddFlags[item.id] && item.krogerProductId) { const qty = item.quantity || 1; cartItems.push({ upc: item.krogerProductId, quantity: qty }); cartItemIds.push(item.id); itemQuantities[item.id] = qty; } }
      const subItemsToProcess: Array<{ originalItem: any; product: any }> = [];
      for (const item of noMatch) { const sel = cartSubSelected[item.id]; if (sel?.krogerProductId) { const qty = item.quantity || 1; cartItems.push({ upc: sel.krogerProductId, quantity: qty }); subItemsToProcess.push({ originalItem: item, product: sel }); } }
      if (cartItems.length === 0) { Alert.alert('No Items Selected', 'Select at least one item to add to cart.'); setCartReviewSubmitting(false); return; }
      await krogerApi.addToCart(cartItems, { listId: activeList.id, itemIds: cartItemIds, itemQuantities });
      const subQuantities: Record<string, number> = {};
      for (const { originalItem, product } of subItemsToProcess) { await shoppingApi.editItem(activeList.id, originalItem.id, { name: product.name, krogerProductId: product.krogerProductId }); subQuantities[originalItem.id] = originalItem.quantity || 1; }
      if (subItemsToProcess.length > 0) await shoppingApi.markItemsCarted(activeList.id, subItemsToProcess.map(s => s.originalItem.id), subQuantities);
      setShowCartReview(false); fetchLists(); setShowKrogerSuccess({ count: cartItems.length });
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to add items to cart.';
      if (msg.includes('not linked') || msg.includes('expired')) { setShowCartReview(false); await handleLinkKrogerAccount(); }
      else Alert.alert('Error', msg);
    } finally { setCartReviewSubmitting(false); }
  };

  const openEditItem = (item: any) => {
    setEditName(item.name || ''); setEditQty(item.quantity ? String(item.quantity) : ''); setEditUnit(item.unit || ''); setShowEditItem(item);
  };

  const handleSaveEditItem = async () => {
    if (!activeList || !showEditItem) return;
    const itemId = showEditItem.id;
    const updates: any = {};
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== showEditItem.name) updates.name = trimmedName;
    if (editQty) { const newQty = parseFloat(editQty); if (newQty !== showEditItem.quantity) updates.quantity = newQty; }
    if ((editUnit || '') !== (showEditItem.unit || '')) updates.unit = editUnit || undefined;
    if (Object.keys(updates).length === 0) { setShowEditItem(null); return; }
    setShowEditItem(null);
    setActiveList((prev: any) => ({ ...prev, items: prev.items.map((i: any) => i.id === itemId ? { ...i, ...updates } : i) }));
    try { await shoppingApi.editItem(activeList.id, itemId, updates); fetchLists(); }
    catch (err) { console.error('Failed to edit item:', err); fetchLists(); }
  };

  const handleDeleteItem = async (item: any) => {
    if (!activeList) return;
    setActiveList((prev: any) => ({ ...prev, items: (prev.items || []).filter((i: any) => i.id !== item.id) }));
    try { await shoppingApi.deleteItem(activeList.id, item.id); fetchLists(); }
    catch (err) { console.error('Failed to delete item:', err); fetchLists(); }
  };

  const showItemActions = (item: any) => { setActionSheetItem(item); };

  const handleArchiveList = async (listId: string) => {
    try { await shoppingApi.updateList(listId, { isActive: false }); fetchLists(); }
    catch (err) { console.error('Failed to archive list:', err); }
  };

  const handleRenameList = async () => {
    if (!editingListName || !editingListName.name.trim()) return;
    try { await shoppingApi.updateList(editingListName.id, { name: editingListName.name.trim() }); setEditingListName(null); fetchLists(); }
    catch (err) { console.error('Failed to rename list:', err); Alert.alert('Error', 'Failed to rename list.'); }
  };

  // ─── Derived Values ────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator size="large" color="#D4652E" />
      </View>
    );
  }

  const isListCompleted = (list: any) => {
    if (list.isActive === false) return true;
    const items = list.items || [];
    return items.length > 0 && items.every((i: any) => i.isChecked);
  };
  const isListNew = (list: any) => { if (list.isActive === false) return false; return (list.items || []).length === 0; };
  const activeLists = lists.filter((l: any) => !isListCompleted(l));
  const newLists = lists.filter((l: any) => isListNew(l));
  const completedLists = lists.filter((l: any) => isListCompleted(l));
  const filteredLists = listFilter === 'active' ? activeLists : listFilter === 'completed' ? completedLists : listFilter === 'new' ? newLists : lists;
  const uncheckedItems = activeList?.items?.filter((i: any) => !i.isChecked) || [];
  const checkedItems = activeList?.items?.filter((i: any) => i.isChecked) || [];
  const krogerBannerName = dealsStoreName ? dealsStoreName.replace(/\s*\(.*\)$/, '') : 'Kroger';

  const grouped: Record<string, any[]> = {};
  for (const item of uncheckedItems) { const cat = item.category || 'other'; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(item); }
  const sortedCategories = CATEGORY_ORDER.filter(c => grouped[c]);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-cream">
      {/* Header */}
      <View className="bg-warm-dark pt-14 pb-5 px-5">
        <View className="flex-row justify-between items-center">
          <Text className="text-cream text-3xl font-serif-bold tracking-tight">Shopping Lists</Text>
          <TouchableOpacity
            testID="profile-icon"
            onPress={() => router.push('/(tabs)/profile')}
            style={{ backgroundColor: 'rgba(255,251,245,0.1)' }}
            className="w-9 h-9 rounded-xl items-center justify-center"
          >
            <Ionicons name="person-circle-outline" size={20} color="#FFFBF5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter tabs + generate */}
      <View className="bg-white border-b border-cream-deeper">
        <View className="flex-row items-center justify-between px-4 py-2">
          <View className="flex-row bg-cream-dark rounded-lg overflow-hidden">
            {(['active', 'new', 'completed', 'all'] as const).map(filter => {
              const count = filter === 'active' ? activeLists.length : filter === 'new' ? newLists.length : filter === 'completed' ? completedLists.length : lists.length;
              return (
                <TouchableOpacity key={filter} onPress={() => setListFilter(filter)} className={`px-3.5 py-2 ${listFilter === filter ? 'bg-warm-dark' : ''}`}>
                  <Text className={`text-sm capitalize font-sans ${listFilter === filter ? 'text-cream font-sans-medium' : 'text-brown'}`}>{filter} ({count})</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity onPress={handleGenerateFromMealPlan} disabled={generating} className="flex-row items-center bg-primary-50 px-3 py-1.5 rounded-lg">
            <Ionicons name="sparkles" size={14} color={generating ? '#B8A68E' : '#D4652E'} />
            <Text className="text-xs text-primary-600 ml-1 font-sans-medium">{generating ? 'Generating...' : 'From Meal Plan'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-white border-b-2 border-cream-deeper" style={{ minHeight: 56 }}>
        <View className="flex-row px-3 items-center gap-2.5" style={{ paddingVertical: 10 }}>
          {filteredLists.map((list: any) => (
            <TouchableOpacity
              key={list.id}
              className={`px-5 rounded-xl ${activeList?.id === list.id ? 'bg-warm-dark' : 'bg-cream-dark'}`}
              style={{ paddingVertical: 10 }}
              onPress={() => { setActiveList(list); setCartAddedMsg(null); }}
              onLongPress={() => {
                if (typeof window !== 'undefined' && window.confirm) {
                  if (list.isActive !== false) {
                    const action = window.prompt(`${list.name}\n\nType "archive" to archive or "delete" to delete:`);
                    if (action === 'delete') handleDeleteList(list.id, list.name);
                    else if (action === 'archive') handleArchiveList(list.id);
                  } else { if (window.confirm(`Delete "${list.name}"?`)) handleDeleteList(list.id, list.name); }
                } else {
                  Alert.alert(list.name, undefined, [
                    ...(list.isActive !== false ? [{ text: 'Archive', onPress: () => handleArchiveList(list.id) }] : []),
                    { text: 'Delete', style: 'destructive' as const, onPress: () => handleDeleteList(list.id, list.name) },
                    { text: 'Cancel', style: 'cancel' as const },
                  ]);
                }
              }}
            >
              <Text className={`text-sm font-sans ${activeList?.id === list.id ? 'text-cream font-sans-semibold' : 'text-brown'}`} style={{ maxWidth: 200 }} numberOfLines={2}>{list.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity className="px-3 rounded-xl bg-cream-dark border border-dashed border-cream-deeper" style={{ paddingVertical: 10 }} onPress={() => setShowCreateList(true)}>
            <Ionicons name="add" size={16} color="#B8A68E" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {!activeList ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cart-outline" size={48} color="#B8A68E" />
          <Text className="text-brown-light font-sans mt-3 text-center">No shopping lists yet. Generate one from your meal plan!</Text>
          <TouchableOpacity onPress={handleGenerateFromMealPlan} disabled={generating} className="mt-4 bg-primary-500 px-6 py-3 rounded-lg">
            <Text className="text-white font-sans-medium">{generating ? 'Generating...' : 'Generate from Meal Plan'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* List name + actions bar */}
          <View className="px-4 py-2 bg-white border-b border-cream-deeper">
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center flex-1 mr-2" style={{ flexShrink: 1 }}>
                <Text className="text-base font-sans-semibold text-warm-dark" style={{ flexShrink: 1 }} numberOfLines={2}>{activeList.name}</Text>
                <TouchableOpacity onPress={() => setEditingListName({ id: activeList.id, name: activeList.name })} className="ml-2 p-1">
                  <Ionicons name="pencil-outline" size={14} color="#B8A68E" />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs text-brown-light font-sans mr-1">{uncheckedItems.length} left</Text>
                <TouchableOpacity onPress={() => handleDeleteList(activeList.id, activeList.name)} className="p-1.5">
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            <View className="flex-row gap-2">
              {uncheckedItems.length > 0 && cartAddedMsg ? (
                <TouchableOpacity onPress={() => setCartAddedMsg(null)} className="flex-row items-center bg-orange-light px-3 py-1.5 rounded-lg">
                  <Ionicons name="checkmark-circle" size={14} color="#D4652E" />
                  <Text className="text-xs text-orange-dark ml-1 font-medium" numberOfLines={1}>{cartAddedMsg}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Kroger Deals Near You */}
            {(deals.length > 0 || loadingDeals) && (
              <View className="bg-white pt-3 pb-2.5 px-4 border-b-4 border-cream-dark">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base font-serif-bold text-warm-dark">🏪 {krogerBannerName} Deals</Text>
                  <View className="bg-yellow-100 px-2 py-1 rounded-lg flex-row items-center gap-1">
                    <View className="w-1.5 h-1.5 rounded-full bg-yellow-600" style={{ opacity: 1 }} />
                    <Text className="text-yellow-800 text-[10px] font-bold">LIVE</Text>
                  </View>
                </View>
                {loadingDeals ? (
                  <ActivityIndicator size="small" color="#D4652E" />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {deals.map((deal: any, idx: number) => (
                        <TouchableOpacity key={idx} className="bg-cream rounded-xl overflow-hidden border border-cream-deeper w-28" onPress={() => handleAddDealToList(deal, idx)} activeOpacity={0.7}>
                          {deal.imageUrl ? (
                            <View className="w-full h-[64px] items-center justify-center">
                              <Image source={{ uri: deal.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" cachePolicy="memory-disk" />
                            </View>
                          ) : (
                            <View className="w-full h-[64px] items-center justify-center">
                              <Text className="text-3xl">🛒</Text>
                            </View>
                          )}
                          <View className="px-2 py-1.5">
                            <Text className="text-xs font-sans-medium text-warm-soft" numberOfLines={1}>{deal.name}</Text>
                            <Text className="text-sm font-sans-bold text-orange">${deal.price.toFixed(2)}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            )}

            {/* Select All + Mark Purchased bar */}
            {uncheckedItems.length > 0 && (
              <View className="flex-row items-center justify-between px-5 pt-3 pb-1">
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => toggleSelectAll(uncheckedItems)}
                >
                  <View className={`w-5 h-5 rounded border-2 items-center justify-center mr-2 ${
                    uncheckedItems.length > 0 && uncheckedItems.every((i: any) => selectedItems.has(i.id))
                      ? 'bg-primary-500 border-primary-500' : 'border-cream-deeper'
                  }`}>
                    {uncheckedItems.length > 0 && uncheckedItems.every((i: any) => selectedItems.has(i.id)) && (
                      <Ionicons name="checkmark" size={13} color="white" />
                    )}
                  </View>
                  <Text className="text-xs font-sans-medium text-brown">Select All</Text>
                </TouchableOpacity>
                {selectedItems.size > 0 && (
                  <TouchableOpacity
                    className="flex-row items-center bg-primary-50 border border-primary-200 rounded-lg px-3 py-1.5"
                    onPress={handleMarkSelectedPurchased}
                  >
                    <Ionicons name="checkmark-done-outline" size={14} color="#D4652E" />
                    <Text className="text-xs font-sans-semibold text-primary-700 ml-1.5">
                      Mark {selectedItems.size} Purchased
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Unchecked items by category */}
            {sortedCategories.map(cat => (
              <View key={cat} className="mb-6">
                <Text className="text-sm font-sans-semibold text-brown uppercase tracking-wider px-5 pt-3 pb-3">
                  {cat === 'produce' ? '🥬 Produce' : cat === 'dairy' ? '🥛 Dairy' : cat === 'meat' ? '🍗 Protein' : cat === 'grains' ? '🌾 Grains' : cat === 'condiments' ? '🧂 Condiments' : cat === 'beverages' ? '🥤 Beverages' : '📦 Other'}
                </Text>
                {grouped[cat].map((item: any) => (
                  <View key={item.id} className="bg-white rounded-2xl mx-4 mb-2.5 px-4 py-4" style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                    <View className="flex-row items-center">
                      <TouchableOpacity onPress={() => toggleSelectItem(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} className="mr-3">
                        <View className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${
                          selectedItems.has(item.id) ? 'bg-primary-500 border-primary-500' : 'border-cream-deeper'
                        }`}>
                          {selectedItems.has(item.id) && <Ionicons name="checkmark" size={16} color="white" />}
                        </View>
                      </TouchableOpacity>
                      <View className="flex-1" style={{ flexShrink: 1 }}>
                        <Text style={{ fontSize: 16, lineHeight: 22 }} className="font-sans-semibold text-warm-dark">{item.name}</Text>
                        {(item.quantity || item.unit) && <Text className="text-sm text-brown font-sans mt-0.5">{item.quantity} {item.unit}</Text>}
                        {item.notes && <Text className="text-xs text-brown-light font-sans italic mt-0.5" numberOfLines={2}>{item.notes}</Text>}
                      </View>
                      {item.estimatedPrice && <Text className="text-sm text-brown font-sans ml-2">${item.estimatedPrice.toFixed(2)}</Text>}
                    </View>
                    <View className="flex-row items-center mt-2.5 ml-9" style={{ gap: 8 }}>
                      <TouchableOpacity
                        className="flex-row items-center bg-primary-50 border border-primary-200 rounded-lg px-3 py-1.5"
                        onPress={() => setShowStoragePicker({ itemId: item.id, itemName: item.name })}
                      >
                        <Ionicons name="checkmark-done-outline" size={14} color="#D4652E" />
                        <Text className="text-xs font-sans-semibold text-primary-700 ml-1.5">Purchased</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-row items-center bg-cream border border-cream-deeper rounded-lg px-3 py-1.5"
                        onPress={() => { const i = item; showItemActions(i); }}
                      >
                        <Ionicons name="pencil-outline" size={13} color="#8B7355" />
                        <Text className="text-xs font-sans text-brown ml-1.5">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-row items-center rounded-lg px-2 py-1.5"
                        onPress={() => handleDeleteItem(item)}
                      >
                        <Ionicons name="trash-outline" size={13} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ))}

            {/* Checked items */}
            {checkedItems.length > 0 && (
              <View className="mb-6">
                <Text className="text-sm font-sans-semibold text-brown uppercase tracking-wider px-5 pt-3 pb-3">✓ Checked ({checkedItems.length})</Text>
                {checkedItems.map((item: any) => (
                  <View key={item.id} className="flex-row items-center px-4 py-5 bg-white rounded-2xl mx-4 mb-2.5 opacity-60" style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                    <TouchableOpacity onPress={() => handleToggleItem(item.id, item.isChecked)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} className="mr-3">
                      <View className="w-6 h-6 rounded-lg bg-primary-500 items-center justify-center"><Ionicons name="checkmark" size={16} color="white" /></View>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1" onPress={() => showItemActions(item)}>
                      <Text style={{ fontSize: 16, lineHeight: 22 }} className="text-brown font-sans line-through">{item.name}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => showItemActions(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} className="px-1">
                      <Ionicons name="ellipsis-vertical" size={20} color="#B8A68E" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <View style={{ height: 90 }} />
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 8, paddingVertical: 12, paddingHorizontal: 16, paddingBottom: 24, backgroundColor: '#FFFBF5', borderTopWidth: 1, borderTopColor: 'rgba(139,115,85,0.1)' }}>
            <TouchableOpacity onPress={() => setShowAddItem(true)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2D2520', borderRadius: 14, paddingVertical: 13, gap: 6 }}>
              <Ionicons name="add" size={18} color="#FFFBF5" />
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: '#FFFBF5' }}>Add Items</Text>
            </TouchableOpacity>
            {uncheckedItems.length > 0 && (
              <TouchableOpacity onPress={handleComparePrices} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0E8', borderWidth: 1.5, borderColor: '#D4652E', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, gap: 6 }}>
                <Ionicons name="pricetags-outline" size={16} color="#D4652E" />
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: '#D4652E' }}>Compare</Text>
              </TouchableOpacity>
            )}
            {uncheckedItems.length > 0 && (
              <TouchableOpacity onPress={handleAddListToKrogerCart} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0E8', borderWidth: 1.5, borderColor: '#D4652E', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, gap: 6 }}>
                <Ionicons name="cart-outline" size={16} color="#D4652E" />
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: '#D4652E' }}>{krogerBannerName}</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* ─── Extracted Modal Components ─── */}

      <ComparePricesModal
        visible={showPriceCompare}
        onClose={() => { setShowPriceCompare(false); setCartAddedMsg(null); }}
        priceData={priceData}
        loadingPrices={loadingPrices}
        uncheckedItemCount={uncheckedItems.length}
        onAddToKrogerCart={handleAddListToKrogerCart}
        onSelectStore={setSelectedStore}
      />

      <AddItemsModal
        visible={showAddItem}
        onClose={() => { setShowAddItem(false); setSuggestions([]); setBulkMode(false); setAddMode('smart'); setSmartResults([]); stopListening(); }}
        addMode={addMode} setAddMode={setAddMode}
        bulkText={bulkText} setBulkText={setBulkText} setBulkMode={setBulkMode} onBulkAdd={handleBulkAdd}
        smartText={smartText} setSmartText={setSmartText} smartResults={smartResults} smartStoreName={smartStoreName}
        smartLoading={smartLoading} smartSelected={smartSelected} setSmartSelected={setSmartSelected}
        onSmartSearch={handleSmartSearch} onSmartAdd={handleSmartAdd}
        newItemName={newItemName} onItemNameChange={handleItemNameChange}
        suggestions={suggestions} onSelectSuggestion={selectSuggestion}
        newItemQty={newItemQty} setNewItemQty={setNewItemQty} newItemQtyError={newItemQtyError} setNewItemQtyError={setNewItemQtyError}
        newItemUnit={newItemUnit} setNewItemUnit={setNewItemUnit} onAddItem={handleAddItem}
        isListening={isListening} isSupported={isSupported} startListening={startListening} stopListening={stopListening} resetTranscript={resetTranscript}
      />

      <CartReviewModal
        visible={showCartReview}
        onClose={() => setShowCartReview(false)}
        krogerBannerName={krogerBannerName}
        cartReviewData={cartReviewData}
        cartReaddFlags={cartReaddFlags} setCartReaddFlags={setCartReaddFlags}
        cartSubstitutes={cartSubstitutes}
        cartSubSelected={cartSubSelected} setCartSubSelected={setCartSubSelected}
        loadingCartReview={loadingCartReview} cartReviewSubmitting={cartReviewSubmitting}
        cartSearchError={cartSearchError} onConfirmCartReview={handleConfirmCartReview}
        showKrogerSuccess={showKrogerSuccess}
        onDismissKrogerSuccess={() => { setShowKrogerSuccess(null); setCartAddedMsg(`${showKrogerSuccess?.count} item(s) added!`); }}
      />

      <PurchaseAllModal
        visible={showPurchaseAll}
        onClose={() => setShowPurchaseAll(false)}
        purchasePreview={purchasePreview} purchaseLoading={purchaseLoading}
        onConfirmPurchaseAll={handleConfirmPurchaseAll} onUpdatePreviewStorage={updatePreviewStorage}
        showStoragePicker={showStoragePicker} onCloseStoragePicker={() => setShowStoragePicker(null)}
        onPurchaseItem={handlePurchaseItem} activeListItems={activeList?.items}
      />

      <CreateListModal
        showCreateList={showCreateList} onCloseCreateList={() => setShowCreateList(false)}
        newListName={newListName} setNewListName={setNewListName} onCreateList={handleCreateList}
        editingListName={editingListName} setEditingListName={setEditingListName} onRenameList={handleRenameList}
        showEditItem={showEditItem} onCloseEditItem={() => setShowEditItem(null)}
        editName={editName} setEditName={setEditName}
        editQty={editQty} setEditQty={setEditQty} editQtyError={editQtyError} setEditQtyError={setEditQtyError}
        editUnit={editUnit} setEditUnit={setEditUnit}
        onSaveEditItem={handleSaveEditItem} onDeleteItem={handleDeleteItem}
        actionSheetItem={actionSheetItem} onCloseActionSheet={() => setActionSheetItem(null)}
        onEditFromSheet={openEditItem}
        onAddToInventoryFromSheet={(item: any) => setShowStoragePicker({ itemId: item.id, itemName: item.name })}
        selectedStore={selectedStore} onCloseSelectedStore={() => { setSelectedStore(null); setCartAddedMsg(null); }}
        priceData={priceData} onOpenStore={handleOpenStore}
        addingToCart={addingToCart} cartAddedMsg={cartAddedMsg} onAddToKrogerCart={handleAddToKrogerCart}
      />
    </View>
  );
}
