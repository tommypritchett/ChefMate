import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { KROGER_CART_URLS } from './shoppingHelpers';

interface CartReviewModalProps {
  visible: boolean;
  onClose: () => void;
  krogerBannerName: string;
  cartReviewData: { ready: any[]; alreadyAdded: any[]; noMatch: any[] };
  cartReaddFlags: Record<string, boolean>;
  setCartReaddFlags: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  cartSubstitutes: Record<string, any[]>;
  cartSubSelected: Record<string, any | null>;
  setCartSubSelected: React.Dispatch<React.SetStateAction<Record<string, any | null>>>;
  loadingCartReview: boolean;
  cartReviewSubmitting: boolean;
  cartSearchError: string | null;
  onConfirmCartReview: () => void;
  // Kroger success
  showKrogerSuccess: { count: number } | null;
  onDismissKrogerSuccess: () => void;
}

export default function CartReviewModal({
  visible, onClose, krogerBannerName,
  cartReviewData, cartReaddFlags, setCartReaddFlags,
  cartSubstitutes, cartSubSelected, setCartSubSelected,
  loadingCartReview, cartReviewSubmitting, cartSearchError,
  onConfirmCartReview,
  showKrogerSuccess, onDismissKrogerSuccess,
}: CartReviewModalProps) {
  const krogerCartUrl = KROGER_CART_URLS[krogerBannerName] || 'https://www.kroger.com/cart';

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View className="flex-1 bg-cream">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-cream-deeper">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-brown font-sans">Cancel</Text>
            </TouchableOpacity>
            <View className="items-center">
              <Text className="text-lg font-serif-bold text-warm-dark">Review Cart Items</Text>
              <View className="flex-row items-center mt-0.5">
                <View className="w-2 h-2 rounded-full bg-orange-500 mr-1" />
                <Text className="text-xs text-brown font-sans">{krogerBannerName}</Text>
              </View>
            </View>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Summary banner */}
            <View className="mx-4 mt-3 bg-cream-dark rounded-lg px-3 py-2 flex-row items-center justify-between">
              <Text className="text-xs text-brown font-sans">
                {cartReviewData.ready.length + cartReviewData.alreadyAdded.length + cartReviewData.noMatch.length} item{(cartReviewData.ready.length + cartReviewData.alreadyAdded.length + cartReviewData.noMatch.length) !== 1 ? 's' : ''} total
              </Text>
              <View className="flex-row gap-3">
                {cartReviewData.ready.length > 0 && (
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-orange-light0 mr-1" />
                    <Text className="text-xs text-brown font-sans">{cartReviewData.ready.length} ready</Text>
                  </View>
                )}
                {cartReviewData.alreadyAdded.length > 0 && (
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-yellow-500 mr-1" />
                    <Text className="text-xs text-brown font-sans">{cartReviewData.alreadyAdded.length} in cart</Text>
                  </View>
                )}
                {cartReviewData.noMatch.length > 0 && (
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                    <Text className="text-xs text-brown font-sans">{cartReviewData.noMatch.length} need match</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Section 1: Ready to Add */}
            {cartReviewData.ready.length > 0 && (
              <View className="mx-4 mt-4">
                <View className="bg-orange-light rounded-xl p-3">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="checkmark-circle" size={18} color="#D4652E" />
                    <Text className="text-sm font-semibold text-warm-dark ml-2">Ready to Add ({cartReviewData.ready.length})</Text>
                  </View>
                  {cartReviewData.ready.map((item: any) => (
                    <View key={item.id} className="flex-row items-center py-1.5 border-t border-cream-deeper">
                      <Ionicons name="checkmark" size={14} color="#D4652E" />
                      <Text className="text-sm text-warm-dark font-sans ml-2 flex-1" numberOfLines={1}>{item.name}</Text>
                      <View className="items-end">
                        <Text className="text-xs text-brown font-sans">{item.quantity || 1} {item.unit || ''}</Text>
                        {item._cartedQuantity > 0 && (
                          <Text className="text-[10px] text-orange">{item._cartedQuantity} already in cart</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Section 2: Already in Cart */}
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
                        color={cartReaddFlags[item.id] ? '#f97316' : '#B8A68E'}
                      />
                      <View className="flex-1 ml-2">
                        <Text className="text-sm text-warm-dark font-sans" numberOfLines={1}>{item.name}</Text>
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

            {/* Section 3: Find a Match */}
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
                          <Text className="text-sm font-sans-medium text-warm-dark mb-1">{item.name} ({item.quantity || 1} {item.unit || ''})</Text>
                          {subs.length === 0 ? (
                            <Text className="text-xs text-brown-light font-sans italic ml-2">{cartSearchError ? 'Store location needed' : 'No matches found'}</Text>
                          ) : (
                            subs.map((prod: any, idx: number) => {
                              const isSelected = selected?.krogerProductId === prod.krogerProductId;
                              return (
                                <TouchableOpacity
                                  key={prod.krogerProductId || idx}
                                  className={`flex-row items-center p-2 ml-1 rounded-lg mb-1 ${isSelected ? 'bg-blue-100 border border-blue-300' : 'bg-white border border-cream-deeper'}`}
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
                                    color={isSelected ? '#2563eb' : '#B8A68E'}
                                  />
                                  {prod.imageUrl ? (
                                    <Image source={{ uri: prod.imageUrl }} style={{ width: 32, height: 32, borderRadius: 4 }} className="ml-2" cachePolicy="memory-disk" />
                                  ) : (
                                    <View className="w-8 h-8 bg-cream rounded ml-2 items-center justify-center">
                                      <Ionicons name="cube-outline" size={14} color="#B8A68E" />
                                    </View>
                                  )}
                                  <View className="flex-1 ml-2">
                                    <Text className="text-xs text-warm-dark font-sans-medium" numberOfLines={1}>{prod.name}</Text>
                                    <Text className="text-xs text-brown font-sans">{prod.size || ''}</Text>
                                  </View>
                                  <View className="items-end">
                                    {prod.promoPrice ? (
                                      <View className="flex-row items-center">
                                        <Text className="text-xs text-red-600 font-sans-bold">${prod.promoPrice.toFixed(2)}</Text>
                                        <Text className="text-xs text-brown-light font-sans line-through ml-1">${prod.price.toFixed(2)}</Text>
                                      </View>
                                    ) : (
                                      <Text className="text-xs text-warm-soft font-sans-medium">${prod.price?.toFixed(2) || '—'}</Text>
                                    )}
                                    <View className="flex-row mt-0.5">
                                      {prod.onSale && (
                                        <View className="bg-red-100 px-1 rounded mr-1">
                                          <Text className="text-[9px] text-red-600 font-bold">SALE</Text>
                                        </View>
                                      )}
                                      {prod.goalAligned && (
                                        <View className="bg-primary-100 px-1 rounded">
                                          <Text className="text-[9px] text-primary-700 font-bold">{prod.goalReason || 'GOAL'}</Text>
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
              <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-cream-deeper px-4 py-3 pb-6">
                <TouchableOpacity
                  className={`py-3 rounded-xl items-center ${totalSelected > 0 && !cartReviewSubmitting ? 'bg-orange-500' : 'bg-cream-dark'}`}
                  disabled={totalSelected === 0 || cartReviewSubmitting}
                  onPress={onConfirmCartReview}
                >
                  {cartReviewSubmitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Text className={`font-sans-bold text-base ${totalSelected > 0 ? 'text-white' : 'text-brown-light'}`}>Add to {krogerBannerName} Cart</Text>
                      <Text className={`text-xs mt-0.5 font-sans ${totalSelected > 0 ? 'text-white/80' : 'text-brown-light'}`}>{totalSelected} item{totalSelected !== 1 ? 's' : ''} selected</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text className="text-xs text-brown-light font-sans text-center mt-2">Walmart, Target, and more coming soon</Text>
              </View>
            );
          })()}
        </View>
      </Modal>

      {/* Kroger Success Deep Link Modal */}
      <Modal visible={!!showKrogerSuccess} transparent animationType="fade" onRequestClose={onDismissKrogerSuccess}>
        <TouchableOpacity
          className="flex-1 bg-black/40 items-center justify-center"
          activeOpacity={1}
          onPress={onDismissKrogerSuccess}
        >
          <View className="bg-white rounded-2xl mx-8 p-5 w-80" onStartShouldSetResponder={() => true}>
            <View className="items-center mb-3">
              <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center mb-2">
                <Ionicons name="checkmark-circle" size={28} color="#D4652E" />
              </View>
              <Text className="text-base font-serif-bold text-warm-dark">Added to Cart!</Text>
              <Text className="text-sm text-brown font-sans text-center mt-1">
                {showKrogerSuccess?.count} item(s) added to your {krogerBannerName} cart
              </Text>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-lg bg-cream-dark items-center"
                onPress={onDismissKrogerSuccess}
              >
                <Text className="text-sm font-sans-medium text-brown">Stay Here</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-lg bg-orange-500 items-center"
                onPress={() => { onDismissKrogerSuccess(); Linking.openURL(krogerCartUrl); }}
              >
                <Text className="text-sm font-medium text-white">Open {krogerBannerName}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
