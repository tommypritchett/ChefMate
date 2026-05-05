import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STORAGE_OPTIONS, STORAGE_ICONS, suggestStorage } from './shoppingHelpers';

interface PurchaseAllModalProps {
  visible: boolean;
  onClose: () => void;
  purchasePreview: Array<{ id: string; name: string; quantity: number; unit: string; category: string; storageLocation: string }>;
  purchaseLoading: boolean;
  onConfirmPurchaseAll: () => void;
  onUpdatePreviewStorage: (itemId: string, storage: string) => void;
  // Storage Picker
  showStoragePicker: { itemId: string; itemName: string } | null;
  onCloseStoragePicker: () => void;
  onPurchaseItem: (itemId: string, storageLocation: string) => void;
  activeListItems?: any[];
}

export default function PurchaseAllModal({
  visible, onClose, purchasePreview, purchaseLoading,
  onConfirmPurchaseAll, onUpdatePreviewStorage,
  showStoragePicker, onCloseStoragePicker, onPurchaseItem, activeListItems,
}: PurchaseAllModalProps) {
  return (
    <>
      {/* Purchase All Modal */}
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View className="flex-1 bg-cream">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-cream-deeper">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-brown font-sans">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-serif-bold text-warm-dark">Add to My Food</Text>
            <TouchableOpacity onPress={onConfirmPurchaseAll} disabled={purchaseLoading || purchasePreview.length === 0}>
              <Text className={`font-sans-medium ${!purchaseLoading && purchasePreview.length > 0 ? 'text-primary-500' : 'text-brown-light'}`}>
                {purchaseLoading ? 'Adding...' : `Add (${purchasePreview.length})`}
              </Text>
            </TouchableOpacity>
          </View>

          {purchaseLoading && purchasePreview.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#D4652E" />
              <Text className="text-brown-light font-sans mt-3">Loading items...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
              <Text className="text-xs text-brown font-sans px-4 pt-3 pb-2">
                Tap a storage location to change where each item is stored.
              </Text>
              {purchasePreview.map(item => (
                <View key={item.id} className="flex-row items-center px-4 py-3 bg-white border-b border-cream-deeper">
                  <View className="flex-1 mr-3">
                    <Text className="text-sm font-sans-medium text-warm-dark">{item.name}</Text>
                    {(item.quantity || item.unit) && (
                      <Text className="text-xs text-brown-light font-sans">
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
                            isActive ? 'bg-primary-100 border border-primary-300' : 'bg-cream border border-cream-deeper'
                          }`}
                          onPress={() => onUpdatePreviewStorage(item.id, storage)}
                        >
                          <Ionicons
                            name={STORAGE_ICONS[storage] as any}
                            size={14}
                            color={isActive ? '#D4652E' : '#B8A68E'}
                          />
                          <Text className={`text-xs ml-1 capitalize font-sans ${isActive ? 'text-primary-700 font-sans-medium' : 'text-brown'}`}>
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

      {/* Storage Location Picker (single item) */}
      <Modal visible={!!showStoragePicker} transparent animationType="fade" onRequestClose={onCloseStoragePicker}>
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={onCloseStoragePicker}
        >
          <View className="bg-white rounded-t-2xl px-4 pt-4 pb-8">
            <Text className="text-base font-serif-bold text-warm-dark text-center mb-1">
              Add to My Food
            </Text>
            <Text className="text-sm text-brown font-sans text-center mb-4">
              Where will you store "{showStoragePicker?.itemName}"?
            </Text>
            {(() => {
              const pickerItem = activeListItems?.find((i: any) => i.id === showStoragePicker?.itemId);
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
                            : 'bg-cream border-cream-deeper'
                        }`}
                        onPress={() => showStoragePicker && onPurchaseItem(showStoragePicker.itemId, storage)}
                      >
                        <Ionicons
                          name={STORAGE_ICONS[storage] as any}
                          size={28}
                          color={isSuggested ? '#D4652E' : storage === 'fridge' ? '#3b82f6' : storage === 'freezer' ? '#8b5cf6' : '#f59e0b'}
                        />
                        <Text className={`text-sm font-sans-medium mt-1 capitalize ${isSuggested ? 'text-primary-700' : 'text-warm-soft'}`}>{storage}</Text>
                        {isSuggested && (
                          <Text className="text-[9px] text-primary-500 font-medium mt-0.5">Suggested</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })()}
            <TouchableOpacity className="mt-3 py-2" onPress={onCloseStoragePicker}>
              <Text className="text-sm text-brown font-sans text-center">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
