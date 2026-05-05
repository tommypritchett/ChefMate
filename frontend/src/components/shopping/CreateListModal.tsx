import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { KROGER_BANNERS, STORAGE_ICONS, validateQuantity } from './shoppingHelpers';

interface CreateListModalProps {
  // Create List
  showCreateList: boolean;
  onCloseCreateList: () => void;
  newListName: string;
  setNewListName: (text: string) => void;
  onCreateList: () => void;
  // Rename List
  editingListName: { id: string; name: string } | null;
  setEditingListName: React.Dispatch<React.SetStateAction<{ id: string; name: string } | null>>;
  onRenameList: () => void;
  // Edit Item
  showEditItem: any;
  onCloseEditItem: () => void;
  editName: string;
  setEditName: (text: string) => void;
  editQty: string;
  setEditQty: (text: string) => void;
  editQtyError: string;
  setEditQtyError: (error: string) => void;
  editUnit: string;
  setEditUnit: (text: string) => void;
  onSaveEditItem: () => void;
  onDeleteItem: (item: any) => void;
  // Action Sheet
  actionSheetItem: any;
  onCloseActionSheet: () => void;
  onEditFromSheet: (item: any) => void;
  onAddToInventoryFromSheet: (item: any) => void;
  // Send to Store
  selectedStore: string | null;
  onCloseSelectedStore: () => void;
  priceData: any;
  onOpenStore: (url: string) => void;
  addingToCart: boolean;
  cartAddedMsg: string | null;
  onAddToKrogerCart: (storeName: string) => void;
}

export default function CreateListModal({
  showCreateList, onCloseCreateList, newListName, setNewListName, onCreateList,
  editingListName, setEditingListName, onRenameList,
  showEditItem, onCloseEditItem, editName, setEditName,
  editQty, setEditQty, editQtyError, setEditQtyError,
  editUnit, setEditUnit, onSaveEditItem, onDeleteItem,
  actionSheetItem, onCloseActionSheet, onEditFromSheet, onAddToInventoryFromSheet,
  selectedStore, onCloseSelectedStore, priceData, onOpenStore,
  addingToCart, cartAddedMsg, onAddToKrogerCart,
}: CreateListModalProps) {
  return (
    <>
      {/* Create List Modal */}
      <Modal visible={showCreateList} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCloseCreateList}>
        <View className="flex-1 bg-cream">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-cream-deeper">
            <TouchableOpacity onPress={onCloseCreateList}>
              <Text className="text-brown font-sans">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-serif-bold text-warm-dark">New List</Text>
            <TouchableOpacity onPress={onCreateList} disabled={!newListName.trim()}>
              <Text className={`font-sans-medium ${newListName.trim() ? 'text-primary-500' : 'text-brown-light'}`}>Create</Text>
            </TouchableOpacity>
          </View>
          <View className="px-4 pt-4">
            <Text className="text-sm font-sans-medium text-warm-soft mb-1">List Name *</Text>
            <TextInput
              className="bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark"
              placeholder="e.g. Weekly Groceries"
              placeholderTextColor="#B8A68E"
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
            />
          </View>
        </View>
      </Modal>

      {/* Rename List Modal */}
      <Modal visible={!!editingListName} transparent animationType="fade" onRequestClose={() => setEditingListName(null)}>
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-center items-center"
          activeOpacity={1}
          onPress={() => setEditingListName(null)}
        >
          <TouchableOpacity activeOpacity={1} className="bg-white rounded-2xl p-5 mx-6 w-80">
            <Text className="text-base font-serif-bold text-warm-dark mb-3">Rename List</Text>
            <TextInput
              className="bg-cream border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark"
              value={editingListName?.name || ''}
              onChangeText={(text) => setEditingListName(prev => prev ? { ...prev, name: text } : null)}
              autoFocus
              selectTextOnFocus
            />
            <View className="flex-row justify-end gap-3 mt-4">
              <TouchableOpacity onPress={() => setEditingListName(null)} className="px-4 py-2">
                <Text className="text-brown font-sans text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onRenameList}
                disabled={!editingListName?.name.trim()}
                className="bg-primary-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white text-sm font-sans-medium">Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={!!showEditItem} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCloseEditItem}>
        <View className="flex-1 bg-cream">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-cream-deeper">
            <TouchableOpacity onPress={onCloseEditItem}>
              <Text className="text-brown font-sans">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-serif-bold text-warm-dark">Edit Item</Text>
            <TouchableOpacity onPress={onSaveEditItem} disabled={!editName.trim()}>
              <Text className={`font-sans-medium ${editName.trim() ? 'text-primary-500' : 'text-brown-light'}`}>Save</Text>
            </TouchableOpacity>
          </View>
          <View className="px-4 pt-4 gap-4">
            <View>
              <Text className="text-sm font-sans-medium text-warm-soft mb-1">Item Name *</Text>
              <TextInput
                className="bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark"
                value={editName}
                onChangeText={setEditName}
                autoFocus
              />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm font-sans-medium text-warm-soft mb-1">Quantity</Text>
                <TextInput
                  className="bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark"
                  placeholder="e.g. 2"
                  placeholderTextColor="#B8A68E"
                  value={editQty}
                  onChangeText={(text) => {
                    setEditQty(text);
                    const error = validateQuantity(text);
                    setEditQtyError(error);
                  }}
                  keyboardType="numeric"
                />
                {editQtyError ? (
                  <Text className="text-xs text-orange mt-1">{editQtyError}</Text>
                ) : null}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-sans-medium text-warm-soft mb-1">Unit</Text>
                <TextInput
                  className="bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark"
                  placeholder="e.g. lbs"
                  placeholderTextColor="#B8A68E"
                  value={editUnit}
                  onChangeText={setEditUnit}
                />
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (showEditItem) onDeleteItem(showEditItem);
                onCloseEditItem();
              }}
              className="flex-row items-center justify-center py-3 mt-2"
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
              <Text className="text-sm text-red-500 font-sans ml-2">Delete Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Item Action Sheet */}
      <Modal visible={!!actionSheetItem} transparent animationType="fade" onRequestClose={onCloseActionSheet}>
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={onCloseActionSheet}
        >
          <View className="bg-white rounded-t-2xl px-4 pt-4 pb-8">
            <Text className="text-base font-serif-bold text-warm-dark text-center mb-4">
              {actionSheetItem?.name}
            </Text>
            <TouchableOpacity
              className="flex-row items-center py-3 border-b border-cream-deeper"
              onPress={() => {
                const item = actionSheetItem;
                onCloseActionSheet();
                onEditFromSheet(item);
              }}
            >
              <Ionicons name="pencil-outline" size={20} color="#B8A68E" />
              <Text className="text-sm text-warm-soft font-sans ml-3">Edit Item</Text>
            </TouchableOpacity>
            {!actionSheetItem?.isChecked && (
              <TouchableOpacity
                className="flex-row items-center py-3 border-b border-cream-deeper"
                onPress={() => {
                  const item = actionSheetItem;
                  onCloseActionSheet();
                  onAddToInventoryFromSheet(item);
                }}
              >
                <Ionicons name="checkmark-done-outline" size={20} color="#D4652E" />
                <Text className="text-sm text-warm-soft font-sans ml-3">Mark Purchased — Add to My Food</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="flex-row items-center py-3 border-b border-cream-deeper"
              onPress={() => {
                const item = actionSheetItem;
                onCloseActionSheet();
                onDeleteItem(item);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text className="text-sm text-red-500 font-sans ml-3">Delete Item</Text>
            </TouchableOpacity>
            <TouchableOpacity className="py-3 mt-1" onPress={onCloseActionSheet}>
              <Text className="text-sm text-brown font-sans text-center">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Send to Store Modal */}
      <Modal visible={!!selectedStore} transparent animationType="slide" onRequestClose={onCloseSelectedStore}>
        <View className="flex-1 bg-black/40 justify-end">
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onCloseSelectedStore} />
          <View className="bg-white rounded-t-2xl">
            {(() => {
              if (!selectedStore || !priceData) return null;
              const logoColor = priceData.items?.[0]?.stores?.find(
                (s: any) => s.store === selectedStore
              )?.logoColor || '#8B7355';
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
                  <View className="flex-row items-center px-4 pt-4 pb-3 border-b border-cream-deeper">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: logoColor }}
                    >
                      <Text className="text-white text-sm font-sans-bold">{selectedStore[0]}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-sans-semibold text-warm-dark">{selectedStore}</Text>
                      {storeTotal != null && (
                        <Text className="text-sm text-brown font-sans">Est. total: ${storeTotal.toFixed(2)}</Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={onCloseSelectedStore}>
                      <Ionicons name="close" size={24} color="#B8A68E" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ paddingBottom: 8 }}>
                    {storeItems.map((item: any, idx: number) => (
                      <TouchableOpacity
                        key={idx}
                        className={`flex-row items-center px-4 py-3 ${idx > 0 ? 'border-t border-cream-deeper' : ''}`}
                        onPress={() => item.searchUrl && onOpenStore(item.searchUrl)}
                      >
                        {item.imageUrl ? (
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={{ width: 32, height: 32, borderRadius: 4, marginRight: 8 }}
                            cachePolicy="memory-disk"
                          />
                        ) : null}
                        <View className="flex-1">
                          <Text className="text-sm text-warm-dark font-sans">{item.name}</Text>
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
                                <Text className="text-[10px] text-brown-light line-through">${item.regularPrice.toFixed(2)}</Text>
                                <Text className="text-sm font-bold text-red-600">${item.price.toFixed(2)}</Text>
                              </>
                            ) : (
                              <Text className="text-sm font-sans-medium text-brown">${item.price.toFixed(2)}</Text>
                            )}
                            {item.unit && (
                              <Text className="text-[10px] text-brown-light">/{item.unit}</Text>
                            )}
                          </View>
                        )}
                        {item.inStock === false && (
                          <View className="bg-red-100 px-1.5 py-0.5 rounded mr-2">
                            <Text className="text-[8px] text-red-600 font-bold">OUT</Text>
                          </View>
                        )}
                        <Ionicons name="open-outline" size={14} color="#B8A68E" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View className="px-4 pt-2 pb-8 border-t border-cream-deeper gap-2">
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className="flex-1 flex-row items-center justify-center py-3 rounded-xl border border-cream-deeper"
                        onPress={handleCopyList}
                      >
                        <Ionicons name="copy-outline" size={16} color="#8C7E6E" />
                        <Text className="text-sm text-brown ml-2 font-sans-medium">Copy List</Text>
                      </TouchableOpacity>
                      {homeUrl && (
                        <TouchableOpacity
                          className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
                          style={{ backgroundColor: logoColor }}
                          onPress={() => onOpenStore(homeUrl)}
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
                        <View className="flex-row items-center justify-center py-3 rounded-xl bg-warm-dark">
                          <Ionicons name="checkmark-circle" size={16} color="white" />
                          <Text className="text-sm text-white ml-2 font-medium">{cartAddedMsg}</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          className={`flex-row items-center justify-center py-3 rounded-xl ${addingToCart ? 'bg-blue-400' : 'bg-blue-600'}`}
                          onPress={() => onAddToKrogerCart(selectedStore)}
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
    </>
  );
}
