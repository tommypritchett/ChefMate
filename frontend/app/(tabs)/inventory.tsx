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
import { inventoryApi, conversationsApi } from '../../src/services/api';
import useSpeechRecognition from '../../src/hooks/useSpeechRecognition';

const STORAGE_LOCATIONS = ['fridge', 'freezer', 'pantry'] as const;
const CATEGORIES = ['produce', 'dairy', 'meat', 'grains', 'condiments', 'beverages', 'other'];

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

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await inventoryApi.getInventory();
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
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

  const handleDelete = async (id: string, name: string) => {
    Alert.alert('Delete Item', `Remove "${name}" from inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await inventoryApi.deleteItem(id);
            setItems(prev => prev.filter(i => i.id !== id));
          } catch (err) {
            console.error('Failed to delete:', err);
          }
        },
      },
    ]);
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
          base64: true,
          quality: 0.7,
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
          base64: true,
          quality: 0.7,
        });
      }

      if (result.canceled || !result.assets?.[0]?.base64) return;

      // Show modal with analyzing state
      setPhotoState('analyzing');
      setPhotoError('');
      setPhotoItems([]);
      setShowPhotoModal(true);

      const analysis = await inventoryApi.analyzePhoto(result.assets[0].base64);
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
        setPhotoError('No food items could be identified in the photo. Try a clearer photo or add items manually.');
        setPhotoState('error');
      } else {
        setPhotoItems(detectedItems);
        setPhotoState('results');
      }
    } catch (err: any) {
      console.error('Photo analysis error:', err);
      const message = err?.response?.status === 504 || err?.message?.includes('timeout') || err?.code === 'ECONNABORTED'
        ? 'Photo analysis timed out. Try a smaller or clearer photo, or add items manually.'
        : err?.response?.status === 500
        ? 'Analysis failed on the server. Please try again or add items manually.'
        : 'Failed to analyze photo. Please check your connection and try again.';
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

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() < Date.now();
  };

  // Group items by storage location
  const sections = STORAGE_LOCATIONS.map(loc => ({
    title: loc.charAt(0).toUpperCase() + loc.slice(1),
    icon: loc === 'fridge' ? 'snow-outline' : loc === 'freezer' ? 'cube-outline' : 'file-tray-stacked-outline',
    data: items.filter(i => (i.storageLocation || 'pantry').toLowerCase() === loc),
  })).filter(s => s.data.length > 0);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Summary bar */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-200">
        <Text className="text-sm text-gray-500">{items.length} items total</Text>
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
            const expiring = isExpiringSoon(item.expiresAt);
            const expired = isExpired(item.expiresAt);

            return (
              <View className={`mx-4 mb-2 p-3 bg-white rounded-xl flex-row items-center ${expired ? 'border border-red-200' : expiring ? 'border border-yellow-200' : ''}`}>
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
                  onPress={() => handleDelete(item.id, item.name)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#d1d5db" />
                </TouchableOpacity>
              </View>
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
    </View>
  );
}
