import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { validateQuantity } from './shoppingHelpers';

interface AddItemsModalProps {
  visible: boolean;
  onClose: () => void;
  addMode: 'single' | 'bulk' | 'smart';
  setAddMode: (mode: 'single' | 'bulk' | 'smart') => void;
  // Bulk
  bulkText: string;
  setBulkText: (text: string) => void;
  setBulkMode: (mode: boolean) => void;
  onBulkAdd: () => void;
  // Smart
  smartText: string;
  setSmartText: (text: string) => void;
  smartResults: any[];
  smartStoreName: string;
  smartLoading: boolean;
  smartSelected: Record<string, any>;
  setSmartSelected: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onSmartSearch: () => void;
  onSmartAdd: () => void;
  // Single
  newItemName: string;
  onItemNameChange: (text: string) => void;
  suggestions: any[];
  onSelectSuggestion: (product: any) => void;
  newItemQty: string;
  setNewItemQty: (text: string) => void;
  newItemQtyError: string;
  setNewItemQtyError: (error: string) => void;
  newItemUnit: string;
  setNewItemUnit: (text: string) => void;
  onAddItem: () => void;
  // Voice
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export default function AddItemsModal({
  visible, onClose, addMode, setAddMode,
  bulkText, setBulkText, setBulkMode, onBulkAdd,
  smartText, setSmartText, smartResults, smartStoreName, smartLoading,
  smartSelected, setSmartSelected, onSmartSearch, onSmartAdd,
  newItemName, onItemNameChange, suggestions, onSelectSuggestion,
  newItemQty, setNewItemQty, newItemQtyError, setNewItemQtyError,
  newItemUnit, setNewItemUnit, onAddItem,
  isListening, isSupported, startListening, stopListening, resetTranscript,
}: AddItemsModalProps) {
  const handleClose = () => {
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View className="flex-1 bg-cream">
        {/* Header */}
        <View className="bg-warm-dark pt-3 pb-5 px-5">
          <View className="flex-row justify-between items-center">
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-sans-bold">
              {addMode === 'smart' ? 'Smart Add' : addMode === 'bulk' ? 'Add Multiple' : 'Add Item'}
            </Text>
            {addMode === 'smart' ? (
              <TouchableOpacity
                onPress={onSmartAdd}
                disabled={Object.keys(smartSelected).length === 0}
                className={`px-4 py-2 rounded-xl ${Object.keys(smartSelected).length > 0 ? 'bg-white' : 'bg-white/20'}`}
              >
                <Text className={`font-bold text-sm ${Object.keys(smartSelected).length > 0 ? 'text-primary-600' : 'text-white/50'}`}>
                  Add {Object.keys(smartSelected).length > 0 ? `(${Object.keys(smartSelected).length})` : ''}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={addMode === 'bulk' ? onBulkAdd : onAddItem}
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
        <View className="flex-row mx-5 mt-4 bg-cream-dark rounded-xl overflow-hidden p-1">
          <TouchableOpacity
            onPress={() => { setAddMode('single'); setBulkMode(false); }}
            className={`flex-1 py-2.5 rounded-lg items-center ${addMode === 'single' ? 'bg-warm-dark shadow-sm' : ''}`}
          >
            <Text className={`text-sm font-sans-bold ${addMode === 'single' ? 'text-cream' : 'text-brown'}`}>Single</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setAddMode('bulk'); setBulkMode(true); }}
            className={`flex-1 py-2.5 rounded-lg items-center ${addMode === 'bulk' ? 'bg-warm-dark shadow-sm' : ''}`}
          >
            <Text className={`text-sm font-sans-bold ${addMode === 'bulk' ? 'text-cream' : 'text-brown'}`}>Bulk</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setAddMode('smart'); setBulkMode(false); }}
            className={`flex-1 py-2.5 rounded-lg items-center ${addMode === 'smart' ? 'bg-warm-dark shadow-sm' : ''}`}
          >
            <Text className={`text-sm font-sans-bold ${addMode === 'smart' ? 'text-cream' : 'text-brown'}`}>Smart</Text>
          </TouchableOpacity>
        </View>

        {addMode === 'bulk' ? (
          <View className="px-4 pt-4 gap-2">
            <Text className="text-sm font-sans-medium text-warm-soft">Type or paste items, one per line</Text>
            <TextInput
              className="bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark"
              placeholder={"chicken breast 3 lbs\nflour\nbread crumbs 2 cups"}
              placeholderTextColor="#B8A68E"
              value={bulkText}
              onChangeText={setBulkText}
              multiline
              numberOfLines={8}
              style={{ minHeight: 180, textAlignVertical: 'top' }}
              autoFocus
            />
            <Text className="text-[10px] text-brown-light font-sans">
              Supports: "item name", "item qty unit", or "qty unit item"
            </Text>
          </View>
        ) : addMode === 'smart' ? (
          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
            <View className="gap-3">
              <View>
                <Text className="text-sm font-sans-medium text-warm-soft mb-1">What do you need?</Text>
                <View className="flex-row items-start gap-2">
                  <TextInput
                    className="flex-1 bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark"
                    placeholder={"chicken breast, chocolate milk, greek yogurt"}
                    placeholderTextColor="#B8A68E"
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
                <Text className="text-[10px] text-brown-light font-sans mt-1">
                  {isListening ? 'Listening... speak your items' : 'Separate with commas or new lines — or tap the mic'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onSmartSearch}
                disabled={!smartText.trim() || smartLoading}
                className={`py-2.5 rounded-lg items-center ${smartText.trim() && !smartLoading ? 'bg-primary-500' : 'bg-cream-dark'}`}
              >
                {smartLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className={`text-sm font-sans-medium ${smartText.trim() ? 'text-white' : 'text-brown-light'}`}>
                    Search Kroger
                  </Text>
                )}
              </TouchableOpacity>

              {smartStoreName ? (
                <Text className="text-[10px] text-brown-light font-sans text-center -mt-1">
                  Results from {smartStoreName}
                </Text>
              ) : null}

              {/* Results */}
              {smartResults.map((group: any) => (
                <View key={group.query} className="bg-white rounded-xl border border-cream-deeper overflow-hidden">
                  <View className="bg-cream px-3 py-2 border-b border-cream-deeper">
                    <Text className="text-sm font-sans-semibold text-warm-soft capitalize">{group.query}</Text>
                  </View>
                  {group.products?.map((product: any, idx: number) => {
                    const isSelected = smartSelected[group.query]?.name === product.name;
                    return (
                      <TouchableOpacity
                        key={`${product.name}-${idx}`}
                        className={`flex-row items-center px-3 py-2.5 ${idx > 0 ? 'border-t border-cream-deeper' : ''} ${isSelected ? 'bg-primary-50' : ''}`}
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
                          <View className="w-5 h-5 rounded-full border border-cream-deeper mr-2" />
                        )}
                        <View className="flex-1">
                          <Text className="text-sm text-warm-dark font-sans" numberOfLines={2}>{product.name}</Text>
                          <View className="flex-row items-center gap-1.5 mt-0.5">
                            {product.size ? (
                              <Text className="text-[10px] text-brown-light font-sans">{product.size}</Text>
                            ) : null}
                            {product.onSale && (
                              <View className="bg-red-50 px-1.5 py-0.5 rounded">
                                <Text className="text-[9px] text-red-600 font-medium">Sale</Text>
                              </View>
                            )}
                            {product.goalAligned && (
                              <View className="flex-row items-center bg-orange-light px-1.5 py-0.5 rounded">
                                <Ionicons name="leaf" size={8} color="#D4652E" />
                                <Text className="text-[9px] text-orange ml-0.5">{product.goalReason || 'Fits goals'}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View className="items-end ml-2">
                          {product.promoPrice != null ? (
                            <>
                              <Text className="text-xs font-semibold text-red-600">${product.promoPrice.toFixed(2)}</Text>
                              <Text className="text-[10px] text-brown-light line-through">${product.price.toFixed(2)}</Text>
                            </>
                          ) : product.price != null ? (
                            <Text className="text-xs font-sans-medium text-brown">${product.price.toFixed(2)}</Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {(!group.products || group.products.length === 0) && (
                    <View className="px-3 py-3">
                      <Text className="text-xs text-brown-light font-sans">No products found</Text>
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
              <Text className="text-base font-sans-semibold text-warm-dark mb-2">Item Name *</Text>
              <TextInput
                className="bg-white border-2 border-cream-deeper rounded-2xl px-4 py-4 text-base text-warm-dark"
                placeholder="Start typing to search..."
                placeholderTextColor="#B8A68E"
                value={newItemName}
                onChangeText={onItemNameChange}
                autoFocus
              />
              {suggestions.length > 0 && (
                <View className="bg-white border border-cream-deeper rounded-xl mt-1 overflow-hidden">
                  {suggestions.map((product: any, idx: number) => (
                    <TouchableOpacity
                      key={`${product.name}-${idx}`}
                      className={`flex-row items-center px-4 py-2.5 ${idx > 0 ? 'border-t border-cream-deeper' : ''}`}
                      onPress={() => onSelectSuggestion(product)}
                    >
                      {product.imageUrl ? (
                        <Image
                          source={{ uri: product.imageUrl }}
                          style={{ width: 32, height: 32, borderRadius: 4, marginRight: 8 }}
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View className="w-8 h-8 rounded bg-cream items-center justify-center mr-2">
                          <Ionicons name="nutrition-outline" size={16} color="#B8A68E" />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-sm text-warm-dark font-sans">{product.name}</Text>
                        <View className="flex-row items-center gap-1">
                          <Text className="text-[10px] text-brown-light font-sans">
                            {product.category} · {product.size || product.defaultUnit}
                          </Text>
                          {product.goalAligned && (
                            <View className="flex-row items-center bg-orange-light px-1.5 py-0.5 rounded">
                              <Ionicons name="leaf" size={8} color="#D4652E" />
                              <Text className="text-[9px] text-orange ml-0.5">Fits goals</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View className="items-end">
                        {product.price != null && (
                          <Text className="text-xs font-sans-medium text-brown">
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
                <Text className="text-base font-sans-semibold text-warm-dark mb-2">Quantity</Text>
                <TextInput
                  className="bg-white border-2 border-cream-deeper rounded-2xl px-4 py-4 text-base text-warm-dark"
                  placeholder="e.g. 2"
                  placeholderTextColor="#B8A68E"
                  value={newItemQty}
                  onChangeText={(text) => {
                    setNewItemQty(text);
                    const error = validateQuantity(text);
                    setNewItemQtyError(error);
                  }}
                  keyboardType="numeric"
                />
                {newItemQtyError ? (
                  <Text className="text-xs text-orange font-sans mt-1">{newItemQtyError}</Text>
                ) : null}
              </View>
              <View className="flex-1">
                <Text className="text-base font-sans-semibold text-warm-dark mb-2">Unit</Text>
                <TextInput
                  className="bg-white border-2 border-cream-deeper rounded-2xl px-4 py-4 text-base text-warm-dark"
                  placeholder="e.g. gallons"
                  placeholderTextColor="#B8A68E"
                  value={newItemUnit}
                  onChangeText={setNewItemUnit}
                />
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
