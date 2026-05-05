import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KROGER_BANNERS } from './shoppingHelpers';

interface ComparePricesModalProps {
  visible: boolean;
  onClose: () => void;
  priceData: any;
  loadingPrices: boolean;
  uncheckedItemCount: number;
  onAddToKrogerCart: () => void;
  onSelectStore: (store: string) => void;
}

export default function ComparePricesModal({
  visible, onClose, priceData, loadingPrices,
  uncheckedItemCount, onAddToKrogerCart, onSelectStore,
}: ComparePricesModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-cream">
        {/* Header — warm dark */}
        <View style={{ backgroundColor: '#2D2520', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 24 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-cream font-serif-bold" style={{ fontSize: 28, letterSpacing: -0.3 }}>Compare Prices</Text>
              {priceData && (
                <Text className="font-sans text-brown-light mt-1" style={{ fontSize: 12 }}>
                  Checking {(() => {
                    const storeEntries = priceData.rankedStores?.length
                      ? priceData.rankedStores
                      : Object.entries(priceData.storeTotals || {}).map(([store, total]: any) => ({ store, total }));
                    return storeEntries.length;
                  })()} stores near you
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={18} color="#FFFBF5" />
            </TouchableOpacity>
          </View>
          {priceData && (
            <View className="flex-row items-center mt-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 12, alignSelf: 'flex-start', gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#D4652E' }} />
              <Text className="font-sans-medium" style={{ fontSize: 11, color: '#B8A68E' }}>
                {uncheckedItemCount} items
              </Text>
            </View>
          )}
        </View>

        {loadingPrices ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#D4652E" />
            <Text className="text-brown-light font-sans mt-3">Comparing prices across stores...</Text>
          </View>
        ) : priceData ? (
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30, gap: 14 }}>
            {(() => {
              const storeEntries: any[] = priceData.rankedStores?.length
                ? priceData.rankedStores
                : Object.entries(priceData.storeTotals || {})
                    .sort(([, a], [, b]) => (a as number) - (b as number))
                    .map(([store, total]: any, i: number) => ({ store, total, cheapest: i === 0, closest: false }));

              const cheapestEntry = storeEntries.find((e: any) => e.cheapest) || storeEntries[0];
              const cheapestTotal = cheapestEntry?.total || 0;
              const avgTotal = storeEntries.length > 1
                ? storeEntries.reduce((sum: number, e: any) => sum + (e.total || 0), 0) / storeEntries.length
                : 0;
              const savingsVsAvg = Math.max(0, avgTotal - cheapestTotal);

              const STORE_EMOJIS: Record<string, string> = {
                'Kroger': '🏪', 'Whole Foods': '🏬', "Trader Joe's": '🏢', 'Walmart': '🏪',
                'Target': '🎯', 'Costco': '📦', 'Amazon Fresh': '📦', 'Aldi': '🏪',
              };

              const getDistLabel = (storeName: string) => {
                const di = priceData.storeDistances?.find((s: any) => s.chain === storeName);
                if (di?.chain === 'Amazon Fresh') return 'Delivery available';
                if (di && di.distance > 0) return `${di.distance} mi away`;
                return '';
              };

              return (
                <>
                  {storeEntries.map((entry: any, idx: number) => {
                    const isBest = entry.cheapest || idx === 0;
                    const diffFromCheapest = (entry.total || 0) - cheapestTotal;
                    const storeEmoji = STORE_EMOJIS[entry.store] || '🏪';
                    const distLabel = getDistLabel(entry.store);
                    const isKroger = KROGER_BANNERS.includes(entry.store);
                    const itemCount = priceData.items?.length || uncheckedItemCount;

                    return (
                      <View
                        key={entry.store}
                        style={{
                          borderRadius: 16,
                          backgroundColor: isBest ? '#FFF0E8' : '#FFFFFF',
                          padding: 16,
                          borderWidth: isBest ? 2 : 1.5,
                          borderColor: isBest ? '#D4652E' : 'rgba(45,37,32,0.06)',
                          position: 'relative',
                          shadowColor: '#2D2520',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.05,
                          shadowRadius: 8,
                          elevation: 2,
                        }}
                      >
                        {isBest && (
                          <View style={{
                            position: 'absolute', top: -1, right: 14,
                            backgroundColor: '#D4652E', paddingVertical: 4, paddingHorizontal: 9,
                            borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
                          }}>
                            <Text style={{ color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase' }}>Cheapest</Text>
                          </View>
                        )}

                        <View className="flex-row items-center mb-3" style={{ gap: 12 }}>
                          <View style={{
                            width: 40, height: 40, borderRadius: 10,
                            backgroundColor: isBest ? '#FFFFFF' : '#F5EDE4',
                            alignItems: 'center', justifyContent: 'center',
                            borderWidth: 1, borderColor: 'rgba(45,37,32,0.07)',
                          }}>
                            <Text style={{ fontSize: 18 }}>{storeEmoji}</Text>
                          </View>
                          <View className="flex-1">
                            <Text className="font-sans-bold text-warm-dark" style={{ fontSize: 14 }}>{entry.store}</Text>
                            {distLabel ? <Text className="font-sans text-brown" style={{ fontSize: 11, marginTop: 1 }}>{distLabel}</Text> : null}
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text className="font-serif-bold" style={{
                              fontSize: isBest ? 26 : 22,
                              color: isBest ? '#2D2520' : '#8B7355',
                              letterSpacing: -0.5,
                              lineHeight: isBest ? 30 : 26,
                            }}>
                              ${entry.total?.toFixed(2)}
                            </Text>
                            <Text className="font-sans text-brown" style={{ fontSize: 10, marginTop: 2 }}>
                              {isBest ? `for all ${itemCount} items` : `+$${diffFromCheapest.toFixed(2)} vs ${cheapestEntry?.store}`}
                            </Text>
                          </View>
                        </View>

                        {isBest && savingsVsAvg > 0 && (
                          <View className="flex-row items-center justify-between mb-3" style={{
                            backgroundColor: 'rgba(212,101,46,0.08)',
                            borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10,
                          }}>
                            <View className="flex-row items-center" style={{ gap: 5 }}>
                              <Text style={{ fontSize: 14 }}>🏷</Text>
                              <Text className="font-sans-semibold" style={{ fontSize: 12, color: '#D4652E' }}>You save vs. avg</Text>
                            </View>
                            <Text className="font-serif-bold" style={{ fontSize: 15, color: '#D4652E' }}>${savingsVsAvg.toFixed(2)}</Text>
                          </View>
                        )}

                        <TouchableOpacity
                          onPress={() => {
                            if (isKroger) {
                              onAddToKrogerCart();
                            } else {
                              onSelectStore(entry.store);
                            }
                          }}
                          style={{
                            width: '100%', height: 38, borderRadius: 10,
                            backgroundColor: isBest ? '#2D2520' : 'transparent',
                            borderWidth: isBest ? 0 : 1.5,
                            borderColor: '#D9CFC7',
                            alignItems: 'center', justifyContent: 'center',
                            flexDirection: 'row', gap: 6,
                          }}
                        >
                          <Text style={{
                            fontFamily: 'DMSans_600SemiBold', fontSize: 13,
                            color: isBest ? '#FFFBF5' : '#2D2520',
                          }}>
                            {isBest && isKroger ? `🛒 Add All to ${entry.store} Cart` : `View at ${entry.store}`}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  <Text className="text-brown-light font-sans text-center" style={{ fontSize: 10, fontStyle: 'italic' }}>
                    LIVE = real-time API prices · EST = estimated prices
                  </Text>

                  {priceData.items && priceData.items.length > 0 && (() => {
                    const storeNames = storeEntries.map((e: any) => e.store);
                    const shortenName = (name: string) => {
                      if (name === 'Whole Foods') return 'W. Foods';
                      if (name === "Trader Joe's") return "TJ's";
                      if (name.length > 8) return name.substring(0, 7) + '.';
                      return name;
                    };

                    return (
                      <View style={{ marginTop: 6 }}>
                        <Text className="font-serif-bold text-warm-dark" style={{ fontSize: 15, marginBottom: 10, paddingHorizontal: 2 }}>
                          Item-by-Item Breakdown
                        </Text>
                        <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E8DDD3' }}>
                          <View style={{ flexDirection: 'row', backgroundColor: '#2D2520' }}>
                            <View style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 10 }}>
                              <Text style={{ color: '#FFFBF5', fontFamily: 'DMSans_600SemiBold', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>Item</Text>
                            </View>
                            {storeNames.map((name: string) => (
                              <View key={name} style={{ width: 60, paddingVertical: 9, paddingHorizontal: 4, alignItems: 'center' }}>
                                <Text style={{ color: '#FFFBF5', fontFamily: 'DMSans_600SemiBold', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' }} numberOfLines={1}>
                                  {shortenName(name)}
                                </Text>
                              </View>
                            ))}
                          </View>

                          {priceData.items.map((item: any, rowIdx: number) => {
                            const isAlt = rowIdx % 2 === 1;
                            const prices = storeNames.map((sName: string) => {
                              const storeMatch = item.stores?.find((s: any) => s.store === sName);
                              return storeMatch ? storeMatch.price : null;
                            });
                            const validPrices = prices.filter((p: any) => p !== null && p !== undefined);
                            const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

                            return (
                              <View key={rowIdx} style={{ flexDirection: 'row', backgroundColor: isAlt ? '#FFFFFF' : '#FFFBF5' }}>
                                <View style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 10, justifyContent: 'center' }}>
                                  <Text style={{ color: '#2D2520', fontFamily: 'DMSans_500Medium', fontSize: 12 }} numberOfLines={1}>{item.item}</Text>
                                </View>
                                {storeNames.map((sName: string, cIdx: number) => {
                                  const storeMatch = item.stores?.find((s: any) => s.store === sName);
                                  const price = storeMatch?.price;
                                  const isCheapest = price !== null && price !== undefined && price === minPrice;
                                  return (
                                    <View
                                      key={cIdx}
                                      style={{
                                        width: 60, paddingVertical: 9, paddingHorizontal: 4,
                                        alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: isCheapest ? '#FFF0E8' : 'transparent',
                                        borderRadius: isCheapest ? 4 : 0,
                                      }}
                                    >
                                      <Text style={{
                                        fontFamily: isCheapest ? 'DMSans_700Bold' : 'DMSans_500Medium',
                                        fontSize: 11,
                                        color: isCheapest ? '#D4652E' : '#8B7355',
                                      }}>
                                        {price != null ? `$${price.toFixed(2)}` : '—'}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            );
                          })}

                          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E8DDD3' }}>
                            <View style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 10, justifyContent: 'center' }}>
                              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 11, color: '#2D2520' }}>Total</Text>
                            </View>
                            {storeEntries.map((entry: any, cIdx: number) => {
                              const isCheapestTotal = entry.cheapest || cIdx === 0;
                              return (
                                <View key={cIdx} style={{ width: 60, paddingVertical: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' }}>
                                  <Text style={{
                                    fontFamily: isCheapestTotal ? 'DMSans_700Bold' : 'DMSans_600SemiBold',
                                    fontSize: 11,
                                    color: isCheapestTotal ? '#D4652E' : '#8B7355',
                                  }}>
                                    ${entry.total?.toFixed(2)}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      </View>
                    );
                  })()}
                </>
              );
            })()}
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-brown-light font-sans text-center">No price data available.</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
