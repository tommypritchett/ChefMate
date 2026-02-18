import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { inventoryApi, conversationsApi } from '../../src/services/api';
import useSpeechRecognition from '../../src/hooks/useSpeechRecognition';

const STORAGE_LOCATIONS = ['fridge', 'freezer', 'pantry'] as const;
const CATEGORIES = ['produce', 'dairy', 'meat', 'grains', 'condiments', 'beverages', 'other'];
const SORT_OPTIONS = ['location', 'category', 'expiry'] as const;
type SortMode = typeof SORT_OPTIONS[number];

interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  storageLocation: string;
  quantity: number | null;
  unit: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface PhotoItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  storageLocation: string;
  confidence: number;
  selected: boolean;
}

type PhotoState = 'idle' | 'analyzing' | 'results' | 'error' | 'added';

interface ConvoMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('location');
  const [actionItem, setActionItem] = useState<InventoryItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expiringItems, setExpiringItems] = useState<InventoryItem[]>([]);
  const [showExpiryBanner, setShowExpiryBanner] = useState(true);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('other');
  const [editLocation, setEditLocation] = useState('fridge');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editExpiry, setEditExpiry] = useState('');

  // Add form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [newLocation, setNewLocation] = useState<string>('fridge');
  const [newQuantity, setNewQuantity] = useState('');
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
      // Compute expiring items for notification banner (fridge/pantry within 3 days, freezer within 4 months)
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
      // Web: use custom modal (Alert.alert doesn't work on web)
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
    setDeleteConfirm(null);
    setActionItem(null);
    try {
      await inventoryApi.deleteItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  // Track which item is being edited
  const [editingItemId, setEditingItemId] = useState<string>('');

  const openEditItem = (item: InventoryItem) => {
    setEditName(item.name);
    setEditCategory(item.category || 'other');
    setEditLocation(item.storageLocation || 'fridge');
    setEditQuantity(item.quantity ? String(item.quantity) : '');
    setEditUnit(item.unit || '');
    setEditExpiry(item.expiresAt ? item.expiresAt.split('T')[0] : '');
    setEditingItemId(item.id);
    setActionItem(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItemId || !editName.trim()) return;
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
    setNewUnit('');
    setNewExpiry('');
  };

  // ─── Photo Analysis ────────────────────────────────────────────

  // Preprocess image: resize if too large, compress to JPEG
  const preprocessImage = async (uri: string): Promise<string> => {
    const MAX_DIMENSION = 1500;
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_DIMENSION } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return manipulated.base64 || '';
  };

  // Analyze photo with retry logic
  const analyzeWithRetry = async (base64: string, maxRetries = 1): Promise<any> => {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await inventoryApi.analyzePhoto(base64);
      } catch (err: any) {
        lastError = err;
        const retryable = err?.response?.data?.retryable;
        const status = err?.response?.status;
        // Only retry on retryable errors (timeout, rate limit, server error)
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
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setPhotoError('Photo library permission is required.');
          setPhotoState('error');
          setShowPhotoModal(true);
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets?.[0]?.uri) return;

      // Show modal with analyzing state
      setPhotoState('analyzing');
      setPhotoError('');
      setPhotoItems([]);
      setShowPhotoModal(true);

      // Preprocess: resize + compress + convert to base64
      const base64 = await preprocessImage(result.assets[0].uri);
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
        message = 'Failed to analyze photo. Please check your connection and try again.';
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
      // Create thread if needed
      let threadId = convoThreadId;
      if (!threadId) {
        const res = await conversationsApi.createThread('Inventory Input');
        threadId = res.thread?.id || (res as any).id;
        setConvoThreadId(threadId);
      }

      // Send message to AI
      const response = await conversationsApi.sendMessage(threadId!, text);
      const aiMessage = response.assistantMessage?.message || response.assistantMessage?.content || 'Items processed.';

      setConvoMessages(prev => [...prev, { role: 'assistant', text: aiMessage }]);

      // Refresh inventory after AI processes items
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
      // Auto-send after stopping voice
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

  // ─── Helpers ──────────────────────────────────────────────────

  const isExpiringSoon = (expiresAt: string | null, storageLocation?: string) => {
    if (!expiresAt) return false;
    // Frozen items last much longer — use 4-month (120-day) window; fridge/pantry use 3 days
    const thresholdDays = storageLocation === 'freezer' ? 120 : 3;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 && diff < thresholdDays * 24 * 60 * 60 * 1000;
  };

  const isExpired = (expiresAt: string | null, storageLocation?: string) => {
    if (!expiresAt) return false;
    // Frozen items: don't show expired until 4 months past date
    if (storageLocation === 'freezer') {
      const gracePeriod = 120 * 24 * 60 * 60 * 1000;
      return new Date(expiresAt).getTime() + gracePeriod < Date.now();
    }
    return new Date(expiresAt).getTime() < Date.now();
  };

  // Group items based on sort mode
  const sections = (() => {
    if (sortMode === 'category') {
      const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
        meat: { label: 'Meat & Protein', icon: 'flame-outline' },
        produce: { label: 'Produce', icon: 'leaf-outline' },
        dairy: { label: 'Dairy', icon: 'water-outline' },
        grains: { label: 'Grains & Bread', icon: 'nutrition-outline' },
        condiments: { label: 'Condiments & Sauces', icon: 'flask-outline' },
        beverages: { label: 'Beverages', icon: 'cafe-outline' },
        other: { label: 'Other', icon: 'ellipsis-horizontal-outline' },
      };
      return CATEGORIES.map(cat => ({
        title: CATEGORY_LABELS[cat]?.label || cat,
        icon: CATEGORY_LABELS[cat]?.icon || 'ellipsis-horizontal-outline',
        data: items.filter(i => (i.category || 'other').toLowerCase() === cat),
      })).filter(s => s.data.length > 0);
    }
    if (sortMode === 'expiry') {
      const expired: InventoryItem[] = [];
      const expiringSoon: InventoryItem[] = [];
      const hasDate: InventoryItem[] = [];
      const noDate: InventoryItem[] = [];
      for (const item of items) {
        if (isExpired(item.expiresAt, item.storageLocation)) expired.push(item);
        else if (isExpiringSoon(item.expiresAt, item.storageLocation)) expiringSoon.push(item);
        else if (item.expiresAt) hasDate.push(item);
        else noDate.push(item);
      }
      // Sort by expiry date ascending
      hasDate.sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime());
      return [
        { title: 'Expired', icon: 'alert-circle-outline', data: expired },
        { title: 'Expiring Soon', icon: 'warning-outline', data: expiringSoon },
        { title: 'Has Expiry Date', icon: 'calendar-outline', data: hasDate },
        { title: 'No Expiry Set', icon: 'help-circle-outline', data: noDate },
      ].filter(s => s.data.length > 0);
    }
    // Default: by storage location, sub-sorted by category within each location
    const CATEGORY_SORT_ORDER = ['meat', 'produce', 'dairy', 'grains', 'condiments', 'beverages', 'other'];
    const locationSections: { title: string; icon: string; data: InventoryItem[] }[] = [];
    for (const loc of STORAGE_LOCATIONS) {
      const locItems = items.filter(i => (i.storageLocation || 'pantry').toLowerCase() === loc);
      if (locItems.length === 0) continue;
      // Sub-sort by category
      locItems.sort((a, b) => {
        const catA = CATEGORY_SORT_ORDER.indexOf((a.category || 'other').toLowerCase());
        const catB = CATEGORY_SORT_ORDER.indexOf((b.category || 'other').toLowerCase());
        return (catA === -1 ? 99 : catA) - (catB === -1 ? 99 : catB);
      });
      locationSections.push({
        title: loc.charAt(0).toUpperCase() + loc.slice(1),
        icon: loc === 'fridge' ? 'snow-outline' : loc === 'freezer' ? 'cube-outline' : 'file-tray-stacked-outline',
        data: locItems,
      });
    }
    return locationSections;
  })();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Expiry notification banner */}
      {showExpiryBanner && expiringItems.length > 0 && (
        <View className="mx-4 mt-2 mb-1 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex-row items-center">
          <Ionicons name="warning-outline" size={20} color="#f59e0b" />
          <View className="flex-1 ml-2">
            <Text className="text-sm font-medium text-yellow-800">
              {expiringItems.length} item{expiringItems.length !== 1 ? 's' : ''} expiring soon
            </Text>
            <Text className="text-xs text-yellow-600 mt-0.5" numberOfLines={1}>
              {expiringItems.slice(0, 3).map(i => i.name).join(', ')}{expiringItems.length > 3 ? '...' : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { setSortMode('expiry'); setShowExpiryBanner(false); }}
            className="bg-yellow-100 px-2 py-1 rounded-lg mr-1"
          >
            <Text className="text-xs text-yellow-700 font-medium">View</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowExpiryBanner(false)}>
            <Ionicons name="close" size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      )}

      {/* Summary bar */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm text-gray-500">{items.length} items</Text>
          {/* Sort toggle */}
          <View className="flex-row bg-gray-100 rounded-lg overflow-hidden">
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                onPress={() => setSortMode(opt)}
                className={`px-2.5 py-1 ${sortMode === opt ? 'bg-primary-500' : ''}`}
              >
                <Text className={`text-[10px] capitalize ${sortMode === opt ? 'text-white font-medium' : 'text-gray-500'}`}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS === 'web') {
                startPhotoAnalysis('library');
              } else {
                Alert.alert('Add by Photo', 'How would you like to add items?', [
                  { text: 'Take Photo', onPress: () => startPhotoAnalysis('camera') },
                  { text: 'Choose from Library', onPress: () => startPhotoAnalysis('library') },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }
            }}
            className="flex-row items-center bg-blue-500 px-3 py-2 rounded-lg"
          >
            <Ionicons name="camera" size={18} color="white" />
            <Text className="text-white text-sm font-medium ml-1">Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openConvoModal}
            className="flex-row items-center bg-purple-500 px-3 py-2 rounded-lg"
          >
            <Ionicons name="chatbubble-ellipses" size={16} color="white" />
            <Text className="text-white text-sm font-medium ml-1">Quick Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            className="flex-row items-center bg-primary-500 px-3 py-2 rounded-lg"
          >
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-white text-sm font-medium ml-1">Add Item</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cube-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-400 mt-3 text-center">
            Your inventory is empty. Add items to track what you have!
          </Text>
          <View className="flex-row gap-3 mt-4">
            <TouchableOpacity
              onPress={openConvoModal}
              className="bg-purple-500 px-5 py-3 rounded-lg flex-row items-center"
            >
              <Ionicons name="chatbubble-ellipses" size={16} color="white" />
              <Text className="text-white font-medium ml-2">Quick Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              className="bg-primary-500 px-5 py-3 rounded-lg"
            >
              <Text className="text-white font-medium">Manual Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderSectionHeader={({ section }) => (
            <View className="flex-row items-center px-4 pt-4 pb-2">
              <Ionicons name={section.icon as any} size={18} color="#6b7280" />
              <Text className="text-sm font-semibold text-gray-600 ml-2">
                {section.title} ({section.data.length})
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const expiring = isExpiringSoon(item.expiresAt, item.storageLocation);
            const expired = isExpired(item.expiresAt, item.storageLocation);

            return (
              <TouchableOpacity
                className={`mx-4 mb-2 p-3 bg-white rounded-xl flex-row items-center ${expired ? 'border border-red-200' : expiring ? 'border border-yellow-200' : ''}`}
                onPress={() => setActionItem(item)}
                activeOpacity={0.7}
              >
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-sm font-medium text-gray-800">{item.name}</Text>
                    {expired && (
                      <View className="ml-2 bg-red-100 px-2 py-0.5 rounded">
                        <Text className="text-[10px] text-red-600 font-medium">EXPIRED</Text>
                      </View>
                    )}
                    {expiring && !expired && (
                      <View className="ml-2 bg-yellow-100 px-2 py-0.5 rounded">
                        <Text className="text-[10px] text-yellow-600 font-medium">EXPIRING SOON</Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center mt-1 gap-3">
                    {item.quantity && (
                      <Text className="text-xs text-gray-400">
                        {item.quantity} {item.unit || ''}
                      </Text>
                    )}
                    {item.category && (
                      <Text className="text-xs text-gray-400 capitalize">{item.category}</Text>
                    )}
                    {item.expiresAt && (
                      <Text className={`text-xs ${expired ? 'text-red-500' : expiring ? 'text-yellow-500' : 'text-gray-400'}`}>
                        Exp: {new Date(item.expiresAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => openEditItem(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="mr-2"
                >
                  <Ionicons name="pencil-outline" size={16} color="#9ca3af" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.name)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#d1d5db" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ═══ Photo Scan Modal ═══ */}
      <Modal visible={showPhotoModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={closePhotoModal}>
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={closePhotoModal}>
              <Text className="text-gray-500">{photoState === 'added' ? 'Done' : 'Cancel'}</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">Photo Scan</Text>
            {photoState === 'results' ? (
              <TouchableOpacity
                onPress={handleAddPhotoItems}
                disabled={adding || photoItems.filter(i => i.selected).length === 0}
              >
                <Text className={`font-medium ${photoItems.some(i => i.selected) && !adding ? 'text-primary-500' : 'text-gray-300'}`}>
                  {adding ? 'Adding...' : `Add (${photoItems.filter(i => i.selected).length})`}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 60 }} />
            )}
          </View>

          {/* Analyzing state */}
          {photoState === 'analyzing' && (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="text-gray-600 mt-4 text-base font-medium">Analyzing photo...</Text>
              <Text className="text-gray-400 text-sm mt-1">AI is identifying food items</Text>
            </View>
          )}

          {/* Error state */}
          {photoState === 'error' && (
            <View className="flex-1 items-center justify-center px-6">
              <Ionicons name="alert-circle-outline" size={56} color="#ef4444" />
              <Text className="text-gray-700 mt-4 text-center text-base font-medium">Analysis Issue</Text>
              <Text className="text-gray-500 mt-2 text-center text-sm">{photoError}</Text>
              <View className="flex-row gap-3 mt-6">
                <TouchableOpacity
                  onPress={() => {
                    closePhotoModal();
                    setTimeout(() => {
                      if (Platform.OS === 'web') {
                        startPhotoAnalysis('library');
                      } else {
                        startPhotoAnalysis('camera');
                      }
                    }, 300);
                  }}
                  className="bg-blue-500 px-5 py-3 rounded-lg flex-row items-center"
                >
                  <Ionicons name="camera-outline" size={18} color="white" />
                  <Text className="text-white font-medium ml-2">Retry Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    closePhotoModal();
                    setShowAddModal(true);
                  }}
                  className="bg-gray-200 px-5 py-3 rounded-lg"
                >
                  <Text className="text-gray-700 font-medium">Add Manually</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Results state */}
          {photoState === 'results' && (
            <ScrollView className="flex-1 px-4 pt-4">
              {/* Summary banner */}
              <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                <Text className="text-blue-800 font-medium text-sm">
                  Found {photoItems.length} item{photoItems.length !== 1 ? 's' : ''} in your photo
                </Text>
                <Text className="text-blue-600 text-xs mt-1">
                  Tap to select/deselect, then press "Add" to save to inventory.
                </Text>
              </View>

              {photoItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => togglePhotoItem(index)}
                  className={`mb-2 p-3 rounded-xl flex-row items-center border ${
                    item.selected ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <Ionicons
                    name={item.selected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={item.selected ? '#10b981' : '#d1d5db'}
                  />
                  <View className="flex-1 ml-3">
                    <Text className="text-sm font-medium text-gray-800">{item.name}</Text>
                    <View className="flex-row items-center mt-0.5 gap-2">
                      <Text className="text-xs text-gray-500">
                        {item.quantity} {item.unit}
                      </Text>
                      <View className="bg-gray-100 px-1.5 py-0.5 rounded">
                        <Text className="text-[10px] text-gray-500 capitalize">{item.storageLocation}</Text>
                      </View>
                      <View className="bg-gray-100 px-1.5 py-0.5 rounded">
                        <Text className="text-[10px] text-gray-500 capitalize">{item.category}</Text>
                      </View>
                      <Text className="text-[10px] text-blue-500">
                        {Math.round(item.confidence * 100)}% match
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Success state */}
          {photoState === 'added' && (
            <View className="flex-1 items-center justify-center px-6">
              <View className="bg-primary-100 w-20 h-20 rounded-full items-center justify-center">
                <Ionicons name="checkmark-circle" size={48} color="#10b981" />
              </View>
              <Text className="text-gray-800 mt-4 text-lg font-semibold">Added to Inventory!</Text>
              <Text className="text-gray-500 mt-2 text-center">
                {addedCount} item{addedCount !== 1 ? 's' : ''} added successfully.
              </Text>
              <TouchableOpacity
                onPress={closePhotoModal}
                className="mt-6 bg-primary-500 px-8 py-3 rounded-lg"
              >
                <Text className="text-white font-medium">Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* ═══ Conversational Input Modal ═══ */}
      <Modal visible={showConvoModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowConvoModal(false)}>
        <KeyboardAvoidingView
          className="flex-1 bg-gray-50"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => { setShowConvoModal(false); fetchItems(); }}>
              <Text className="text-gray-500">Close</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">Quick Add</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Mode toggle */}
          <View className="flex-row mx-4 mt-3 bg-gray-200 rounded-lg p-0.5">
            <TouchableOpacity
              onPress={() => { setConvoMode('text'); if (isListening) stopListening(); }}
              className={`flex-1 py-2 rounded-md items-center ${convoMode === 'text' ? 'bg-white' : ''}`}
            >
              <Text className={`text-sm font-medium ${convoMode === 'text' ? 'text-gray-800' : 'text-gray-500'}`}>
                Text
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setConvoMode('voice')}
              className={`flex-1 py-2 rounded-md items-center ${convoMode === 'voice' ? 'bg-white' : ''}`}
            >
              <Text className={`text-sm font-medium ${convoMode === 'voice' ? 'text-gray-800' : 'text-gray-500'}`}>
                Voice {isSupported ? '' : '(web only)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={convoScrollRef}
            className="flex-1 px-4 pt-3"
            contentContainerStyle={{ paddingBottom: 10 }}
            onContentSizeChange={() => convoScrollRef.current?.scrollToEnd({ animated: true })}
          >
            {convoMessages.map((msg, i) => (
              <View
                key={i}
                className={`mb-2 max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}
              >
                <View className={`px-3 py-2 rounded-xl ${
                  msg.role === 'user' ? 'bg-primary-500' : 'bg-white border border-gray-200'
                }`}>
                  <Text className={`text-sm ${msg.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))}
            {convoProcessing && (
              <View className="self-start mb-2">
                <View className="bg-white border border-gray-200 px-3 py-2 rounded-xl">
                  <ActivityIndicator size="small" color="#10b981" />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input area */}
          <View className="px-4 py-3 bg-white border-t border-gray-200">
            {convoMode === 'text' ? (
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800"
                  placeholder="e.g. I bought chicken, rice, and onions"
                  placeholderTextColor="#9ca3af"
                  value={convoInput}
                  onChangeText={setConvoInput}
                  onSubmitEditing={handleConvoSend}
                  returnKeyType="send"
                  editable={!convoProcessing}
                />
                <TouchableOpacity
                  onPress={handleConvoSend}
                  disabled={!convoInput.trim() || convoProcessing}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    convoInput.trim() && !convoProcessing ? 'bg-primary-500' : 'bg-gray-200'
                  }`}
                >
                  <Ionicons name="send" size={18} color={convoInput.trim() && !convoProcessing ? 'white' : '#9ca3af'} />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="items-center gap-2">
                {convoInput ? (
                  <View className="w-full flex-row items-center gap-2">
                    <Text className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800">
                      {convoInput}
                    </Text>
                    <TouchableOpacity
                      onPress={handleConvoSend}
                      disabled={convoProcessing}
                      className="w-10 h-10 rounded-full items-center justify-center bg-primary-500"
                    >
                      <Ionicons name="send" size={18} color="white" />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <TouchableOpacity
                  onPress={handleVoiceToggle}
                  disabled={!isSupported || convoProcessing}
                  className={`w-16 h-16 rounded-full items-center justify-center ${
                    isListening ? 'bg-red-500' : isSupported ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <Ionicons
                    name={isListening ? 'mic' : 'mic-outline'}
                    size={28}
                    color="white"
                  />
                </TouchableOpacity>
                <Text className="text-xs text-gray-400">
                  {isListening ? 'Listening... tap to stop' : isSupported ? 'Tap to speak' : 'Voice not supported on this device'}
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══ Add Item Modal ═══ */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">Add Item</Text>
            <TouchableOpacity onPress={handleAdd} disabled={!newName.trim() || adding}>
              <Text className={`font-medium ${newName.trim() ? 'text-primary-500' : 'text-gray-300'}`}>
                {adding ? 'Adding...' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="px-4 pt-4 gap-4">
            {/* Name */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Item Name *</Text>
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                  placeholder={isListening ? 'Listening...' : 'e.g. Chicken breast'}
                  placeholderTextColor={isListening ? '#ef4444' : '#9ca3af'}
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus={!isListening}
                  editable={!isListening}
                />
                {isSupported && (
                  <TouchableOpacity
                    onPress={() => isListening ? stopListening() : startListening()}
                    className={`w-10 h-10 rounded-full items-center justify-center ${
                      isListening ? 'bg-red-500' : 'bg-gray-100'
                    }`}
                  >
                    <Ionicons
                      name={isListening ? 'mic' : 'mic-outline'}
                      size={20}
                      color={isListening ? 'white' : '#6b7280'}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Storage Location */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Storage Location</Text>
              <View className="flex-row gap-2">
                {STORAGE_LOCATIONS.map(loc => (
                  <TouchableOpacity
                    key={loc}
                    className={`flex-1 py-2.5 rounded-xl items-center ${
                      newLocation === loc ? 'bg-primary-500' : 'bg-white border border-gray-200'
                    }`}
                    onPress={() => setNewLocation(loc)}
                  >
                    <Text className={`text-sm ${newLocation === loc ? 'text-white font-medium' : 'text-gray-600'}`}>
                      {loc.charAt(0).toUpperCase() + loc.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Category</Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    className={`px-3 py-1.5 rounded-full ${
                      newCategory === cat ? 'bg-primary-500' : 'bg-white border border-gray-200'
                    }`}
                    onPress={() => setNewCategory(cat)}
                  >
                    <Text className={`text-xs ${newCategory === cat ? 'text-white' : 'text-gray-600'}`}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quantity & Unit */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Quantity</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                  placeholder="e.g. 2"
                  placeholderTextColor="#9ca3af"
                  value={newQuantity}
                  onChangeText={setNewQuantity}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Unit</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                  placeholder="e.g. lbs"
                  placeholderTextColor="#9ca3af"
                  value={newUnit}
                  onChangeText={setNewUnit}
                />
              </View>
            </View>

            {/* Expiry Date */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Expiry Date (optional)</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                value={newExpiry}
                onChangeText={setNewExpiry}
              />
            </View>
          </View>
        </View>
      </Modal>
      {/* ═══ Edit Item Modal ═══ */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditModal(false)}>
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">Edit Item</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={!editName.trim() || adding}>
              <Text className={`font-medium ${editName.trim() && !adding ? 'text-primary-500' : 'text-gray-300'}`}>
                {adding ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="px-4 pt-4" contentContainerStyle={{ gap: 16 }}>
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Item Name *</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                value={editName}
                onChangeText={setEditName}
                autoFocus
              />
            </View>
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Storage Location</Text>
              <View className="flex-row gap-2">
                {STORAGE_LOCATIONS.map(loc => (
                  <TouchableOpacity
                    key={loc}
                    className={`flex-1 py-2.5 rounded-xl items-center ${
                      editLocation === loc ? 'bg-primary-500' : 'bg-white border border-gray-200'
                    }`}
                    onPress={() => setEditLocation(loc)}
                  >
                    <Text className={`text-sm ${editLocation === loc ? 'text-white font-medium' : 'text-gray-600'}`}>
                      {loc.charAt(0).toUpperCase() + loc.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Category</Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    className={`px-3 py-1.5 rounded-full ${
                      editCategory === cat ? 'bg-primary-500' : 'bg-white border border-gray-200'
                    }`}
                    onPress={() => setEditCategory(cat)}
                  >
                    <Text className={`text-xs ${editCategory === cat ? 'text-white' : 'text-gray-600'}`}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Quantity</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                  placeholder="e.g. 2"
                  placeholderTextColor="#9ca3af"
                  value={editQuantity}
                  onChangeText={setEditQuantity}
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
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Expiry Date</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                value={editExpiry}
                onChangeText={setEditExpiry}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ═══ Delete Confirmation Modal (web) ═══ */}
      <Modal
        visible={!!deleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirm(null)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-center items-center"
          activeOpacity={1}
          onPress={() => setDeleteConfirm(null)}
        >
          <View className="bg-white rounded-2xl px-6 py-5 mx-8 w-72">
            <Text className="text-base font-semibold text-gray-800 text-center">Delete Item</Text>
            <Text className="text-sm text-gray-500 text-center mt-2">
              Remove "{deleteConfirm?.name}" from inventory?
            </Text>
            <View className="flex-row justify-center gap-3 mt-4">
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-lg bg-gray-100"
                onPress={() => setDeleteConfirm(null)}
              >
                <Text className="text-sm text-gray-600 text-center font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-lg bg-red-500"
                onPress={() => deleteConfirm && confirmDelete(deleteConfirm.id)}
              >
                <Text className="text-sm text-white text-center font-medium">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══ Item Action Sheet ═══ */}
      <Modal
        visible={!!actionItem}
        transparent
        animationType="fade"
        onRequestClose={() => setActionItem(null)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={() => setActionItem(null)}
        >
          <View className="bg-white rounded-t-2xl px-4 pt-4 pb-8">
            <Text className="text-base font-semibold text-gray-800 text-center mb-4">
              {actionItem?.name}
            </Text>
            <TouchableOpacity
              className="flex-row items-center py-3 border-b border-gray-100"
              onPress={() => { if (actionItem) openEditItem(actionItem); }}
            >
              <Ionicons name="pencil-outline" size={20} color="#6b7280" />
              <Text className="text-sm text-gray-700 ml-3">Edit Item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center py-3 border-b border-gray-100"
              onPress={() => {
                if (actionItem) {
                  const item = actionItem;
                  setActionItem(null);
                  handleDelete(item.id, item.name);
                }
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text className="text-sm text-red-500 ml-3">Delete Item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="py-3 mt-1"
              onPress={() => setActionItem(null)}
            >
              <Text className="text-sm text-gray-400 text-center">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
