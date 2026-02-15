import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { inventoryApi } from '../../src/services/api';
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
  const { isListening, transcript, isSupported, startListening, stopListening } =
    useSpeechRecognition();

  // Update name field from voice input
  useEffect(() => {
    if (transcript && showAddModal) {
      setNewName(transcript);
    }
  }, [transcript, showAddModal]);

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
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          className="flex-row items-center bg-primary-500 px-4 py-2 rounded-lg"
        >
          <Ionicons name="add" size={18} color="white" />
          <Text className="text-white text-sm font-medium ml-1">Add Item</Text>
        </TouchableOpacity>
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
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            className="mt-4 bg-primary-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-medium">Add Your First Item</Text>
          </TouchableOpacity>
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

      {/* Add Item Modal */}
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
