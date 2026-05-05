import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PhotoItem, PhotoState, LOCATION_EMOJI } from './inventoryHelpers';

interface PhotoScanModalProps {
  visible: boolean;
  onClose: () => void;
  photoState: PhotoState;
  photoItems: PhotoItem[];
  photoError: string;
  addedCount: number;
  adding: boolean;
  onToggleItem: (index: number) => void;
  onAddPhotoItems: () => void;
  onRetryCamera: () => void;
  onRetryLibrary: () => void;
  onAddManually: () => void;
}

export default function PhotoScanModal({
  visible, onClose, photoState, photoItems, photoError, addedCount, adding,
  onToggleItem, onAddPhotoItems, onRetryCamera, onRetryLibrary, onAddManually,
}: PhotoScanModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1" style={{ backgroundColor: '#FFFBF5' }}>
        {/* Header */}
        <View style={{ backgroundColor: '#2D2520', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="arrow-back" size={18} color="#FFFBF5" />
              </TouchableOpacity>
              <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#FFFBF5' }}>
                {photoState === 'added' ? 'Done' : 'Scan Items'}
              </Text>
            </View>
            {photoState === 'results' && (
              <TouchableOpacity
                onPress={onAddPhotoItems}
                disabled={adding || photoItems.filter(i => i.selected).length === 0}
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: photoItems.some(i => i.selected) && !adding ? '#F0916A' : '#B09880' }}>
                  {adding ? 'Adding...' : `Add (${photoItems.filter(i => i.selected).length})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Analyzing state */}
        {photoState === 'analyzing' && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#D4652E" />
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#2D2520', marginTop: 16 }}>
              Analyzing photo...
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#B09880', marginTop: 4 }}>
              AI is identifying food items
            </Text>
          </View>
        )}

        {/* Error state */}
        {photoState === 'error' && (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="alert-circle-outline" size={56} color="#D4652E" />
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#2D2520', marginTop: 16, textAlign: 'center' }}>
              Analysis Issue
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8B7355', marginTop: 8, textAlign: 'center' }}>
              {photoError}
            </Text>
            <View className="flex-row mt-6" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  setTimeout(() => {
                    if (Platform.OS === 'web') {
                      onRetryLibrary();
                    } else {
                      onRetryCamera();
                    }
                  }, 300);
                }}
                style={{ backgroundColor: '#2D2520', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Ionicons name="camera-outline" size={18} color="#FFFBF5" />
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: '#FFFBF5' }}>Retry Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onAddManually();
                }}
                style={{ backgroundColor: '#F5EDE0', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 }}
              >
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: '#2D2520' }}>Add Manually</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Results state */}
        {photoState === 'results' && (
          <ScrollView className="flex-1 px-5 pt-4">
            {/* Scan banner */}
            <View
              style={{
                backgroundColor: '#2D2520',
                borderRadius: 18,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  backgroundColor: 'rgba(212,101,46,0.20)',
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 22 }}>📸</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 14, color: '#FFFBF5', marginBottom: 2 }}>
                  Photo Scanned
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11.5, color: '#B09880' }}>
                  Tap to select/deselect items
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: 'rgba(212,101,46,0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(212,101,46,0.25)',
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 10, color: '#F0916A', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  {photoItems.length} found
                </Text>
              </View>
            </View>

            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#B09880', marginBottom: 10 }}>
              Detected Items — tap to deselect
            </Text>

            {photoItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => onToggleItem(index)}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  padding: 12,
                  paddingHorizontal: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 8,
                  shadowColor: '#2D2520',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 2,
                  borderWidth: 1,
                  borderColor: 'rgba(45,37,32,0.05)',
                }}
              >
                {/* Checkbox */}
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    borderWidth: 2,
                    borderColor: item.selected ? '#D4652E' : '#ECD9C6',
                    backgroundColor: item.selected ? '#D4652E' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.selected && (
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>✓</Text>
                  )}
                </View>

                {/* Item info */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#2D2520', letterSpacing: -0.1 }}>
                    {item.name}
                  </Text>
                  <View className="flex-row items-center mt-0.5" style={{ gap: 6 }}>
                    <View style={{ backgroundColor: '#F5EDE0', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#8B7355' }}>
                        {LOCATION_EMOJI[item.storageLocation] || '📦'} {item.storageLocation.charAt(0).toUpperCase() + item.storageLocation.slice(1)}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11.5, color: '#B09880' }}>
                      {item.quantity} {item.unit}
                    </Text>
                  </View>
                </View>

                {/* Confidence */}
                <View
                  style={{
                    backgroundColor: item.confidence >= 0.85 ? '#f0fdf4' : '#F5EDE0',
                    borderWidth: 1,
                    borderColor: item.confidence >= 0.85 ? '#bbf7d0' : '#ECD9C6',
                    borderRadius: 6,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 11,
                      color: item.confidence >= 0.85 ? '#22c55e' : '#8B7355',
                    }}
                  >
                    {Math.round(item.confidence * 100)}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Add Selected button */}
            <TouchableOpacity
              onPress={onAddPhotoItems}
              disabled={adding || photoItems.filter(i => i.selected).length === 0}
              style={{
                backgroundColor: '#2D2520',
                borderRadius: 16,
                padding: 15,
                marginTop: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: photoItems.filter(i => i.selected).length === 0 ? 0.5 : 1,
              }}
            >
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14.5, color: '#FFFBF5', letterSpacing: 0.1 }}>
                Add to My Food
              </Text>
              <View style={{ backgroundColor: '#D4652E', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 2 }}>
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 12, color: 'white' }}>
                  {photoItems.filter(i => i.selected).length} items
                </Text>
              </View>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* Success state */}
        {photoState === 'added' && (
          <View className="flex-1 items-center justify-center px-6">
            <View
              style={{
                backgroundColor: '#FFF0E8',
                width: 80,
                height: 80,
                borderRadius: 40,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="checkmark-circle" size={48} color="#D4652E" />
            </View>
            <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 18, color: '#2D2520', marginTop: 16 }}>
              Added to Inventory!
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8B7355', marginTop: 8, textAlign: 'center' }}>
              {addedCount} item{addedCount !== 1 ? 's' : ''} added successfully.
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{ backgroundColor: '#2D2520', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 24 }}
            >
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14.5, color: '#FFFBF5' }}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}
