import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { inventoryApi, conversationsApi } from '../../src/services/api';
import useSpeechRecognition from '../../src/hooks/useSpeechRecognition';
import { router } from 'expo-router';

import {
  InventoryItem, PhotoItem, PhotoState, ConvoMessage, SortMode,
  STORAGE_LOCATIONS, CATEGORIES, SORT_OPTIONS, FILTER_PILLS,
  LOCATION_EMOJI, CATEGORY_EMOJI,
  validateQuantity, isExpiringSoon, isExpired,
  formatExpiry, getTimeSinceAdded, getItemEmoji, getIconBgClass,
} from '../../src/components/inventory/inventoryHelpers';
import PhotoScanModal from '../../src/components/inventory/PhotoScanModal';
import ConversationalAddModal from '../../src/components/inventory/ConversationalAddModal';
import ItemFormModal from '../../src/components/inventory/ItemFormModal';

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('location');
  const [actionItem, setActionItem] = useState<InventoryItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expiringItems, setExpiringItems] = useState<InventoryItem[]>([]);
  const [showExpiryBanner, setShowExpiryBanner] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('other');
  const [editLocation, setEditLocation] = useState('fridge');
  const [editQuantity, setEditQuantity] = useState('');
  const [editQuantityError, setEditQuantityError] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editExpiry, setEditExpiry] = useState('');

  // Add form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [newLocation, setNewLocation] = useState<string>('fridge');
  const [newQuantity, setNewQuantity] = useState('');
  const [newQuantityError, setNewQuantityError] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [adding, setAdding] = useState(false);

  // Photo scan state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoState, setPhotoState] = useState<PhotoState>('idle');
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [photoError, setPhotoError] = useState('');
  const [addedCount, setAddedCount] = useState(0);

  // Conversational input state
  const [showConvoModal, setShowConvoModal] = useState(false);
  const [convoMode, setConvoMode] = useState<'text' | 'voice'>('text');
  const [convoInput, setConvoInput] = useState('');
  const [convoMessages, setConvoMessages] = useState<ConvoMessage[]>([]);
  const [convoProcessing, setConvoProcessing] = useState(false);
  const [convoThreadId, setConvoThreadId] = useState<string | null>(null);
  const convoScrollRef = useRef<ScrollView>(null);

  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } =
    useSpeechRecognition();

  // Update name field from voice input (Add Item modal)
  useEffect(() => {
    if (transcript && showAddModal) {
      setNewName(transcript);
    }
  }, [transcript, showAddModal]);

  // Update convo input from voice (Convo modal)
  useEffect(() => {
    if (transcript && showConvoModal && convoMode === 'voice') {
      setConvoInput(transcript);
    }
  }, [transcript, showConvoModal, convoMode]);

  const fetchItems = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await inventoryApi.getInventory();
      const allItems = data.items || [];
      setItems(allItems);
      const expiring = allItems.filter((i: InventoryItem) => {
        if (!i.expiresAt) return false;
        const loc = i.storageLocation;
        const thresholdDays = loc === 'freezer' ? 120 : 3;
        const diff = new Date(i.expiresAt).getTime() - Date.now();
        return diff > 0 && diff < thresholdDays * 24 * 60 * 60 * 1000;
      });
      setExpiringItems(expiring);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(true);
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    if (newQuantityError) {
      Alert.alert('Invalid Input', 'Please fix the quantity error before saving.');
      return;
    }
    setAdding(true);
    try {
      await inventoryApi.addItem({
        name: newName.trim(),
        category: newCategory,
        storageLocation: newLocation,
        quantity: newQuantity ? parseFloat(newQuantity) : undefined,
        unit: newUnit || undefined,
        expiresAt: newExpiry || undefined,
      });
      setShowAddModal(false);
      resetForm();
      fetchItems();
    } catch (err) {
      console.error('Failed to add item:', err);
    } finally {
      setAdding(false);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (Platform.OS === 'web') {
      setDeleteConfirm({ id, name });
    } else {
      Alert.alert('Delete Item', `Remove "${name}" from inventory?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDelete(id),
        },
      ]);
    }
  };

  const confirmDelete = async (id: string) => {
    const itemId = id;
    try {
      await inventoryApi.deleteItem(itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
      await fetchItems();
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleteConfirm(null);
      setActionItem(null);
    }
  };

  const [editingItemId, setEditingItemId] = useState<string>('');

  const openEditItem = (item: InventoryItem) => {
    setEditName(item.name);
    setEditCategory(item.category || 'other');
    setEditLocation(item.storageLocation || 'fridge');
    setEditQuantity(item.quantity ? String(item.quantity) : '');
    setEditQuantityError('');
    setEditUnit(item.unit || '');
    setEditExpiry(item.expiresAt ? item.expiresAt.split('T')[0] : '');
    setEditingItemId(item.id);
    setActionItem(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItemId || !editName.trim()) return;
    if (editQuantityError) {
      Alert.alert('Invalid Input', 'Please fix the quantity error before saving.');
      return;
    }
    setAdding(true);
    try {
      await inventoryApi.updateItem(editingItemId, {
        name: editName.trim(),
        category: editCategory,
        storageLocation: editLocation,
        quantity: editQuantity ? parseFloat(editQuantity) : undefined,
        unit: editUnit || undefined,
        expiresAt: editExpiry || null,
      });
      setShowEditModal(false);
      fetchItems();
    } catch (err) {
      console.error('Failed to edit item:', err);
    } finally {
      setAdding(false);
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewCategory('other');
    setNewLocation('fridge');
    setNewQuantity('');
    setNewQuantityError('');
    setNewUnit('');
    setNewExpiry('');
  };

  // ─── Photo Analysis ────────────────────────────────────────────

  const preprocessImage = async (uri: string): Promise<string> => {
    const MAX_DIMENSION = 1500;
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_DIMENSION } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return manipulated.base64 || '';
  };

  const analyzeWithRetry = async (base64: string, maxRetries = 1): Promise<any> => {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await inventoryApi.analyzePhoto(base64);
      } catch (err: any) {
        lastError = err;
        const retryable = err?.response?.data?.retryable;
        const status = err?.response?.status;
        if (attempt < maxRetries && (retryable || status === 504 || status === 500 || status === 429)) {
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  };

  const startPhotoAnalysis = async (source: 'camera' | 'library') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setPhotoError('Camera permission is required to scan food items.');
          setPhotoState('error');
          setShowPhotoModal(true);
          return;
        }
        result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setPhotoError('Photo library permission is required.');
          setPhotoState('error');
          setShowPhotoModal(true);
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      }

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setPhotoState('analyzing');
      setPhotoError('');
      setPhotoItems([]);
      setShowPhotoModal(true);

      let base64: string;
      try {
        base64 = await preprocessImage(result.assets[0].uri);
      } catch (preprocessErr: any) {
        console.error('Image preprocess error:', preprocessErr);
        setPhotoError('Could not process the image. Please try a different photo.');
        setPhotoState('error');
        return;
      }
      if (!base64) {
        setPhotoError('Could not process the image. Please try a different photo.');
        setPhotoState('error');
        return;
      }

      const analysis = await analyzeWithRetry(base64);
      const detectedItems = (analysis.items || []).map((item: any) => ({
        name: item.name || 'Unknown item',
        quantity: item.quantity || 1,
        unit: item.unit || 'count',
        category: item.category || 'other',
        storageLocation: item.storageLocation || 'fridge',
        confidence: item.confidence || 0.5,
        selected: true,
      }));

      if (detectedItems.length === 0) {
        setPhotoError(analysis.message || 'No food items could be identified in the photo. Try a clearer photo or add items manually.');
        setPhotoState('error');
      } else {
        setPhotoItems(detectedItems);
        setPhotoState('results');
      }
    } catch (err: any) {
      console.error('Photo analysis error:', err);
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      let message: string;
      if (status === 504 || code === 'TIMEOUT' || err?.code === 'ECONNABORTED') {
        message = 'Photo analysis timed out. Try a smaller or clearer photo, or add items manually.';
      } else if (status === 413 || code === 'IMAGE_TOO_LARGE') {
        message = 'Image is too large. Please use a smaller photo.';
      } else if (status === 400 || code === 'INVALID_IMAGE') {
        message = 'This image format is not supported. Try a JPEG or PNG photo.';
      } else if (status === 429 || code === 'RATE_LIMITED') {
        message = 'Too many requests. Please wait a moment and try again.';
      } else {
        const serverMsg = err?.response?.data?.error;
        message = serverMsg || 'Failed to analyze photo. Please check your connection and try again.';
      }
      setPhotoError(message);
      setPhotoState('error');
      setShowPhotoModal(true);
    }
  };

  const handleAddPhotoItems = async () => {
    const selected = photoItems.filter(i => i.selected);
    if (selected.length === 0) return;
    setAdding(true);
    try {
      for (const item of selected) {
        await inventoryApi.addItem({
          name: item.name,
          category: item.category,
          storageLocation: item.storageLocation,
          quantity: item.quantity,
          unit: item.unit,
        });
      }
      setAddedCount(selected.length);
      setPhotoState('added');
      fetchItems();
    } catch (err) {
      console.error('Failed to add photo items:', err);
      setPhotoError('Failed to add items. Please try again.');
      setPhotoState('error');
    } finally {
      setAdding(false);
    }
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setPhotoState('idle');
    setPhotoItems([]);
    setPhotoError('');
    setAddedCount(0);
  };

  const togglePhotoItem = (index: number) => {
    setPhotoItems(prev => prev.map((item, i) =>
      i === index ? { ...item, selected: !item.selected } : item
    ));
  };

  // ─── Conversational Input ─────────────────────────────────────

  const openConvoModal = () => {
    setConvoMessages([{
      role: 'assistant',
      text: 'Tell me what you have! You can say something like "I bought chicken breast, 2 bags of rice, onions, and milk" and I\'ll add them all to your inventory.',
    }]);
    setConvoInput('');
    setConvoThreadId(null);
    setShowConvoModal(true);
  };

  const handleConvoSend = async () => {
    const text = convoInput.trim();
    if (!text || convoProcessing) return;

    setConvoMessages(prev => [...prev, { role: 'user', text }]);
    setConvoInput('');
    setConvoProcessing(true);

    if (isListening) {
      stopListening();
    }

    try {
      let threadId = convoThreadId;
      if (!threadId) {
        const res = await conversationsApi.createThread('Inventory Input');
        threadId = res.thread?.id || (res as any).id;
        setConvoThreadId(threadId);
      }

      const response = await conversationsApi.sendMessage(threadId!, text);
      const aiMessage = response.assistantMessage?.message || response.assistantMessage?.content || 'Items processed.';

      setConvoMessages(prev => [...prev, { role: 'assistant', text: aiMessage }]);
      fetchItems();
    } catch (err) {
      console.error('Convo error:', err);
      setConvoMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Sorry, something went wrong. Please try again or use the manual add form.',
      }]);
    } finally {
      setConvoProcessing(false);
      setTimeout(() => convoScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      setTimeout(() => {
        if (convoInput.trim()) {
          handleConvoSend();
        }
      }, 300);
    } else {
      resetTranscript();
      setConvoInput('');
      startListening();
    }
  };

  // ─── Filtering & Sections ──────────────────────────────────────

  const filteredItems = items.filter(item => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.name.toLowerCase().includes(q)) return false;
    }
    if (activeFilter === 'all') return true;
    if (activeFilter === 'fridge' || activeFilter === 'pantry' || activeFilter === 'freezer') {
      return (item.storageLocation || 'pantry').toLowerCase() === activeFilter;
    }
    if (activeFilter === 'spices') {
      return (item.category || '').toLowerCase() === 'condiments' || (item.category || '').toLowerCase() === 'spices';
    }
    if (activeFilter === 'produce') {
      return (item.category || '').toLowerCase() === 'produce';
    }
    if (activeFilter === 'expiring') {
      return isExpiringSoon(item.expiresAt, item.storageLocation) || isExpired(item.expiresAt, item.storageLocation);
    }
    return true;
  });

  const expiringSoonCount = items.filter(i => isExpiringSoon(i.expiresAt, i.storageLocation)).length;
  const expiredCount = items.filter(i => isExpired(i.expiresAt, i.storageLocation)).length;

  const sections = (() => {
    if (sortMode === 'category') {
      const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
        'meat/protein': { label: 'Meat & Protein', icon: 'flame-outline' },
        produce: { label: 'Produce', icon: 'leaf-outline' },
        dairy: { label: 'Dairy', icon: 'water-outline' },
        grains: { label: 'Grains & Bread', icon: 'nutrition-outline' },
        condiments: { label: 'Condiments & Sauces', icon: 'flask-outline' },
        beverages: { label: 'Beverages', icon: 'cafe-outline' },
        other: { label: 'Other', icon: 'ellipsis-horizontal-outline' },
      };
      const normalizeCategory = (c: string | null | undefined) => {
        const lower = (c || 'other').toLowerCase();
        return lower === 'meat' || lower === 'protein' ? 'meat/protein' : lower;
      };
      return CATEGORIES.map(cat => ({
        title: CATEGORY_LABELS[cat]?.label || cat,
        icon: CATEGORY_LABELS[cat]?.icon || 'ellipsis-horizontal-outline',
        data: filteredItems.filter(i => normalizeCategory(i.category) === cat),
      })).filter(s => s.data.length > 0);
    }
    if (sortMode === 'expiry') {
      const expired: InventoryItem[] = [];
      const expiringSoon: InventoryItem[] = [];
      const hasDate: InventoryItem[] = [];
      const noDate: InventoryItem[] = [];
      for (const item of filteredItems) {
        if (isExpired(item.expiresAt, item.storageLocation)) expired.push(item);
        else if (isExpiringSoon(item.expiresAt, item.storageLocation)) expiringSoon.push(item);
        else if (item.expiresAt) hasDate.push(item);
        else noDate.push(item);
      }
      hasDate.sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime());
      return [
        { title: 'Expired', icon: 'alert-circle-outline', data: expired },
        { title: 'Expiring Soon', icon: 'warning-outline', data: expiringSoon },
        { title: 'Has Expiry Date', icon: 'calendar-outline', data: hasDate },
        { title: 'No Expiry Set', icon: 'help-circle-outline', data: noDate },
      ].filter(s => s.data.length > 0);
    }
    // Default: by storage location
    const CATEGORY_SORT_ORDER = ['meat/protein', 'produce', 'dairy', 'grains', 'condiments', 'beverages', 'other'];
    const locationSections: { title: string; icon: string; data: InventoryItem[] }[] = [];
    for (const loc of STORAGE_LOCATIONS) {
      const locItems = filteredItems.filter(i => (i.storageLocation || 'pantry').toLowerCase() === loc);
      if (locItems.length === 0) continue;
      const normCat = (c: string | null | undefined) => {
        const l = (c || 'other').toLowerCase();
        return l === 'meat' || l === 'protein' ? 'meat/protein' : l;
      };
      locItems.sort((a, b) => {
        const catA = CATEGORY_SORT_ORDER.indexOf(normCat(a.category));
        const catB = CATEGORY_SORT_ORDER.indexOf(normCat(b.category));
        return (catA === -1 ? 99 : catA) - (catB === -1 ? 99 : catB);
      });
      locationSections.push({
        title: `${loc.charAt(0).toUpperCase() + loc.slice(1)} ${LOCATION_EMOJI[loc] || ''}`,
        icon: loc === 'fridge' ? 'snow-outline' : loc === 'freezer' ? 'cube-outline' : 'file-tray-stacked-outline',
        data: locItems,
      });
    }
    return locationSections;
  })();

  return (
    <View className="flex-1 bg-[#FFFBF5]">
      {/* ── Header ── */}
      <View style={{ backgroundColor: '#2D2520' }} className="pt-14 pb-5 px-6">
        <View className="flex-row justify-between items-center">
          <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: '#FFFBF5', letterSpacing: -0.5 }}>
            My Food
          </Text>
          <View className="flex-row" style={{ gap: 8 }}>
            <TouchableOpacity
              testID="profile-icon"
              onPress={() => router.push('/(tabs)/profile')}
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}
              className="w-[38px] h-[38px] rounded-xl items-center justify-center"
            >
              <Text style={{ fontSize: 18 }}>⋯</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-row items-center mt-2" style={{ gap: 6 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12.5, color: '#B09880', letterSpacing: 0.1 }}>
            {items.length} items total
          </Text>
          <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#B09880', opacity: 0.5 }} />
          {expiringSoonCount > 0 && (
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12.5, color: '#F0916A' }}>
              ⚠ {expiringSoonCount} expiring soon
            </Text>
          )}
          {expiredCount > 0 && (
            <>
              <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#B09880', opacity: 0.5 }} />
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12.5, color: '#B09880' }}>
                {expiredCount} expired
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Expiration Disclaimer */}
      <View className="mx-5 mt-2 bg-orange-light rounded-lg px-3 py-2">
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#8B7355', lineHeight: 14 }}>
          ⓘ Expiration dates are estimate-based — please validate yourself.
        </Text>
      </View>

      {/* ── Scrollable Body ── */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#D4652E" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View>
              {/* Search bar */}
              <View className="px-5 pt-4">
                <View
                  style={{
                    backgroundColor: '#F5EDE0',
                    borderWidth: 1.5,
                    borderColor: '#ECD9C6',
                    borderRadius: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    gap: 10,
                  }}
                >
                  <Text style={{ fontSize: 16, opacity: 0.5 }}>🔍</Text>
                  <TextInput
                    style={{
                      flex: 1,
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 14.5,
                      color: '#8B7355',
                    }}
                    placeholder="Search your food..."
                    placeholderTextColor="#8B7355"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color="#B09880" />
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#2D2520',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 12,
                        elevation: 2,
                      }}
                    >
                      <Ionicons name="options-outline" size={14} color="#8B7355" />
                    </View>
                  )}
                </View>
              </View>

              {/* Category filter pills */}
              <View className="pt-3.5 pb-1">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
                >
                  {FILTER_PILLS.map(pill => {
                    const isActive = activeFilter === pill.key;
                    return (
                      <TouchableOpacity
                        key={pill.key}
                        onPress={() => setActiveFilter(pill.key)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 14,
                          paddingVertical: 7,
                          borderRadius: 20,
                          borderWidth: 1.5,
                          backgroundColor: isActive ? '#FFF0E8' : '#FFFFFF',
                          borderColor: isActive ? '#D4652E' : '#ECD9C6',
                        }}
                      >
                        <Text style={{ fontSize: 13 }}>{pill.emoji}</Text>
                        <Text
                          style={{
                            fontFamily: 'DMSans_500Medium',
                            fontSize: 13,
                            color: isActive ? '#D4652E' : '#8B7355',
                          }}
                        >
                          {pill.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Sort toggle pills */}
                  <View style={{ flexDirection: 'row', marginLeft: 4 }}>
                    {SORT_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => setSortMode(opt)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: opt === 'location' ? 20 : opt === 'expiry' ? 20 : 0,
                          borderTopLeftRadius: opt === 'location' ? 20 : 0,
                          borderBottomLeftRadius: opt === 'location' ? 20 : 0,
                          borderTopRightRadius: opt === 'expiry' ? 20 : 0,
                          borderBottomRightRadius: opt === 'expiry' ? 20 : 0,
                          backgroundColor: sortMode === opt ? '#2D2520' : '#F5EDE0',
                          borderWidth: sortMode === opt ? 0 : 1,
                          borderColor: '#ECD9C6',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: sortMode === opt ? 'DMSans_600SemiBold' : 'DMSans_400Regular',
                            fontSize: 11,
                            color: sortMode === opt ? '#FFFBF5' : '#8B7355',
                            textTransform: 'capitalize',
                          }}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Empty state */}
              {filteredItems.length === 0 && items.length > 0 && (
                <View className="items-center justify-center px-6 py-8">
                  <Text style={{ fontSize: 32 }}>🔍</Text>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#8B7355', marginTop: 8 }}>
                    No items match your filter
                  </Text>
                </View>
              )}

              {items.length === 0 && (
                <View className="items-center justify-center px-6 py-12">
                  <Text style={{ fontSize: 48 }}>📦</Text>
                  <Text style={{ fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: '#2D2520', marginTop: 12 }}>
                    Your inventory is empty
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8B7355', marginTop: 4, textAlign: 'center' }}>
                    Add items to track what you have!
                  </Text>
                  <View className="flex-row flex-wrap justify-center mt-5" style={{ gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => {
                        if (Platform.OS === 'web') {
                          startPhotoAnalysis('library');
                        } else {
                          Alert.alert('Scan Items', 'Try taking a photo of your shopping haul, receipt, or fridge.', [
                            { text: 'Take Photo', onPress: () => startPhotoAnalysis('camera') },
                            { text: 'Choose from Library', onPress: () => startPhotoAnalysis('library') },
                            { text: 'Cancel', style: 'cancel' },
                          ]);
                        }
                      }}
                      style={{ backgroundColor: '#FFF0E8', borderWidth: 1.5, borderColor: '#D4652E', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                      <Ionicons name="camera-outline" size={16} color="#D4652E" />
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: '#D4652E' }}>Scan Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={openConvoModal}
                      style={{ backgroundColor: '#2D2520', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                      <Text style={{ fontSize: 16 }}>🎤</Text>
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: '#FFFBF5' }}>Voice Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowAddModal(true)}
                      style={{ backgroundColor: '#2D2520', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                      <Text style={{ fontSize: 16 }}>✏️</Text>
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: '#FFFBF5' }}>Manual</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View className="px-5 pt-3.5 pb-2">
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: '#B09880',
                }}
              >
                {section.title} · {section.data.length} items
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const expiry = formatExpiry(item.expiresAt, item.storageLocation);
            const emoji = getItemEmoji(item);
            const iconBg = getIconBgClass(item);

            return (
              <TouchableOpacity
                onPress={() => setActionItem(item)}
                activeOpacity={0.7}
                style={{
                  marginHorizontal: 20,
                  marginBottom: 8,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 14,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  shadowColor: '#2D2520',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 2,
                  borderWidth: 1,
                  borderColor: 'rgba(45,37,32,0.05)',
                }}
              >
                <View
                  className={iconBg}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 14.5,
                      color: '#2D2520',
                      letterSpacing: -0.1,
                    }}
                  >
                    {item.name}
                  </Text>
                  <View className="flex-row items-center mt-0.5" style={{ gap: 8 }}>
                    {item.quantity && (
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12.5, color: '#8B7355' }}>
                        {item.quantity} {item.unit || ''}
                      </Text>
                    )}
                    {item.quantity && item.createdAt && (
                      <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#B09880' }} />
                    )}
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11.5, color: '#B09880' }}>
                      {getTimeSinceAdded(item.createdAt)}
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  {expiry.text ? (
                    expiry.status === 'warn' ? (
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11.5, color: '#D4652E' }}>
                        ⚠ {expiry.text}
                      </Text>
                    ) : expiry.status === 'expired' ? (
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11.5, color: '#ef4444' }}>
                          {expiry.text}
                        </Text>
                        <View
                          style={{
                            backgroundColor: '#fef2f2',
                            borderWidth: 1,
                            borderColor: '#fecaca',
                            borderRadius: 6,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                            Expired
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11.5, color: '#8B7355' }}>
                        {expiry.text}
                      </Text>
                    )
                  ) : null}
                  <Text style={{ fontSize: 13, color: '#B09880' }}>›</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            filteredItems.length > 0 ? (
              <View className="px-5 pt-3.5 pb-5">
                <Text
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: '#B09880',
                    marginBottom: 10,
                  }}
                >
                  Quick Add
                </Text>
                <View className="flex-row" style={{ gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        startPhotoAnalysis('library');
                      } else {
                        Alert.alert('Scan Items', 'Try taking a photo of your shopping haul, receipt, or fridge.', [
                          { text: 'Take Photo', onPress: () => startPhotoAnalysis('camera') },
                          { text: 'Choose from Library', onPress: () => startPhotoAnalysis('library') },
                          { text: 'Cancel', style: 'cancel' },
                        ]);
                      }
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#FFF0E8',
                      borderWidth: 1.5,
                      borderColor: 'rgba(212,101,46,0.18)',
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 6,
                      gap: 5,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>📸</Text>
                    <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: '#D4652E', textAlign: 'center', letterSpacing: 0.1 }}>
                      Scan{'\n'}Photo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={openConvoModal}
                    style={{
                      flex: 1,
                      backgroundColor: '#FFF0E8',
                      borderWidth: 1.5,
                      borderColor: 'rgba(212,101,46,0.18)',
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 6,
                      gap: 5,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>🎤</Text>
                    <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: '#D4652E', textAlign: 'center', letterSpacing: 0.1 }}>
                      Voice{'\n'}Add
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID="add-item-button"
                    onPress={() => setShowAddModal(true)}
                    style={{
                      flex: 1,
                      backgroundColor: '#FFF0E8',
                      borderWidth: 1.5,
                      borderColor: 'rgba(212,101,46,0.18)',
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 6,
                      gap: 5,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>✏️</Text>
                    <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: '#D4652E', textAlign: 'center', letterSpacing: 0.1 }}>
                      Manual{'\n'}Entry
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* ── Bottom Action Bar ── */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 14,
          paddingHorizontal: 20,
          paddingBottom: 28,
          backgroundColor: '#FFFBF5',
          borderTopWidth: 1,
          borderTopColor: 'rgba(139,115,85,0.1)',
          zIndex: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS === 'web') {
              startPhotoAnalysis('library');
            } else {
              Alert.alert('Scan Items', 'Try taking a photo of your shopping haul, receipt, or fridge.', [
                { text: 'Take Photo', onPress: () => startPhotoAnalysis('camera') },
                { text: 'Choose from Library', onPress: () => startPhotoAnalysis('library') },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }
          }}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFF0E8',
            borderWidth: 1.5,
            borderColor: '#D4652E',
            borderRadius: 16,
            paddingVertical: 14,
            gap: 8,
          }}
        >
          <Ionicons name="camera-outline" size={20} color="#D4652E" />
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: '#D4652E' }}>Scan Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="add-item-button"
          onPress={() => setShowAddModal(true)}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#2D2520',
            borderRadius: 16,
            paddingVertical: 14,
            gap: 8,
          }}
        >
          <Ionicons name="add" size={20} color="#FFFBF5" />
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: '#FFFBF5' }}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* ═══ Extracted Modals ═══ */}
      <PhotoScanModal
        visible={showPhotoModal}
        onClose={closePhotoModal}
        photoState={photoState}
        photoItems={photoItems}
        photoError={photoError}
        addedCount={addedCount}
        adding={adding}
        onToggleItem={togglePhotoItem}
        onAddPhotoItems={handleAddPhotoItems}
        onRetryCamera={() => startPhotoAnalysis('camera')}
        onRetryLibrary={() => startPhotoAnalysis('library')}
        onAddManually={() => setShowAddModal(true)}
      />

      <ConversationalAddModal
        visible={showConvoModal}
        onClose={() => { setShowConvoModal(false); fetchItems(); }}
        convoMode={convoMode}
        setConvoMode={setConvoMode}
        convoInput={convoInput}
        setConvoInput={setConvoInput}
        convoMessages={convoMessages}
        convoProcessing={convoProcessing}
        convoScrollRef={convoScrollRef}
        onSend={handleConvoSend}
        onVoiceToggle={handleVoiceToggle}
        isListening={isListening}
        isSupported={isSupported}
        onStopListening={stopListening}
      />

      <ItemFormModal
        showAddModal={showAddModal}
        onCloseAdd={() => { setShowAddModal(false); resetForm(); }}
        newName={newName}
        setNewName={setNewName}
        newLocation={newLocation}
        setNewLocation={setNewLocation}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        newQuantity={newQuantity}
        setNewQuantity={setNewQuantity}
        newQuantityError={newQuantityError}
        setNewQuantityError={setNewQuantityError}
        newUnit={newUnit}
        setNewUnit={setNewUnit}
        newExpiry={newExpiry}
        setNewExpiry={setNewExpiry}
        adding={adding}
        onAdd={handleAdd}
        isListening={isListening}
        isSupported={isSupported}
        onStartListening={startListening}
        onStopListening={stopListening}
        showEditModal={showEditModal}
        onCloseEdit={() => setShowEditModal(false)}
        editName={editName}
        setEditName={setEditName}
        editLocation={editLocation}
        setEditLocation={setEditLocation}
        editCategory={editCategory}
        setEditCategory={setEditCategory}
        editQuantity={editQuantity}
        setEditQuantity={setEditQuantity}
        editQuantityError={editQuantityError}
        setEditQuantityError={setEditQuantityError}
        editUnit={editUnit}
        setEditUnit={setEditUnit}
        editExpiry={editExpiry}
        setEditExpiry={setEditExpiry}
        onSaveEdit={handleSaveEdit}
        deleteConfirm={deleteConfirm}
        onCancelDelete={() => setDeleteConfirm(null)}
        onConfirmDelete={confirmDelete}
        actionItem={actionItem}
        onDismissAction={() => setActionItem(null)}
        onEditItem={openEditItem}
        onDeleteItem={handleDelete}
      />
    </View>
  );
}
