import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  InventoryItem, STORAGE_LOCATIONS, CATEGORIES,
  LOCATION_EMOJI, CATEGORY_EMOJI, validateQuantity,
} from './inventoryHelpers';

interface ItemFormModalProps {
  // Add modal
  showAddModal: boolean;
  onCloseAdd: () => void;
  newName: string;
  setNewName: (text: string) => void;
  newLocation: string;
  setNewLocation: (loc: string) => void;
  newCategory: string;
  setNewCategory: (cat: string) => void;
  newQuantity: string;
  setNewQuantity: (text: string) => void;
  newQuantityError: string;
  setNewQuantityError: (error: string) => void;
  newUnit: string;
  setNewUnit: (text: string) => void;
  newExpiry: string;
  setNewExpiry: (text: string) => void;
  adding: boolean;
  onAdd: () => void;
  // Voice for add
  isListening: boolean;
  isSupported: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  // Edit modal
  showEditModal: boolean;
  onCloseEdit: () => void;
  editName: string;
  setEditName: (text: string) => void;
  editLocation: string;
  setEditLocation: (loc: string) => void;
  editCategory: string;
  setEditCategory: (cat: string) => void;
  editQuantity: string;
  setEditQuantity: (text: string) => void;
  editQuantityError: string;
  setEditQuantityError: (error: string) => void;
  editUnit: string;
  setEditUnit: (text: string) => void;
  editExpiry: string;
  setEditExpiry: (text: string) => void;
  onSaveEdit: () => void;
  // Delete confirm (web)
  deleteConfirm: { id: string; name: string } | null;
  onCancelDelete: () => void;
  onConfirmDelete: (id: string) => void;
  // Action sheet
  actionItem: InventoryItem | null;
  onDismissAction: () => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string, name: string) => void;
}

export default function ItemFormModal(props: ItemFormModalProps) {
  const {
    showAddModal, onCloseAdd, newName, setNewName, newLocation, setNewLocation,
    newCategory, setNewCategory, newQuantity, setNewQuantity, newQuantityError, setNewQuantityError,
    newUnit, setNewUnit, newExpiry, setNewExpiry, adding, onAdd,
    isListening, isSupported, onStartListening, onStopListening,
    showEditModal, onCloseEdit, editName, setEditName, editLocation, setEditLocation,
    editCategory, setEditCategory, editQuantity, setEditQuantity, editQuantityError, setEditQuantityError,
    editUnit, setEditUnit, editExpiry, setEditExpiry, onSaveEdit,
    deleteConfirm, onCancelDelete, onConfirmDelete,
    actionItem, onDismissAction, onEditItem, onDeleteItem,
  } = props;

  return (
    <>
      {/* ═══ Add Item Modal ═══ */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={onCloseAdd}>
        <View className="flex-1 bg-cream">
          <View style={{ backgroundColor: '#2D2520', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <TouchableOpacity
                  onPress={onCloseAdd}
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#FFFBF5' }}>Cancel</Text>
                </TouchableOpacity>
                <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#FFFBF5' }}>Add Item</Text>
              </View>
              <TouchableOpacity
                onPress={onAdd}
                disabled={!newName.trim() || adding}
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: newName.trim() ? '#F0916A' : '#B09880' }}>
                  {adding ? 'Adding...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="px-5 pt-4" contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
            {/* Name */}
            <View style={{ gap: 5 }}>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.8, color: '#8B7355' }}>
                Item Name
              </Text>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: newName ? '#FFFFFF' : '#F5EDE0',
                    borderWidth: 1.5,
                    borderColor: newName ? 'rgba(212,101,46,0.30)' : '#ECD9C6',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: '#2D2520',
                  }}
                  placeholder={isListening ? 'Listening...' : 'e.g. Chicken breast'}
                  placeholderTextColor="#B09880"
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus={!isListening}
                  editable={!isListening}
                />
                {isSupported && (
                  <TouchableOpacity
                    onPress={() => isListening ? onStopListening() : onStartListening()}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isListening ? '#ef4444' : '#F5EDE0',
                    }}
                  >
                    <Ionicons
                      name={isListening ? 'mic' : 'mic-outline'}
                      size={20}
                      color={isListening ? 'white' : '#B09880'}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Storage Location */}
            <View style={{ gap: 5 }}>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.8, color: '#8B7355' }}>
                Storage Location
              </Text>
              <View className="flex-row" style={{ gap: 8 }}>
                {STORAGE_LOCATIONS.map(loc => (
                  <TouchableOpacity
                    key={loc}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor: newLocation === loc ? '#2D2520' : '#FFFFFF',
                      borderWidth: newLocation === loc ? 0 : 1.5,
                      borderColor: '#ECD9C6',
                    }}
                    onPress={() => setNewLocation(loc)}
                  >
                    <Text style={{ fontFamily: newLocation === loc ? 'DMSans_600SemiBold' : 'DMSans_400Regular', fontSize: 14, color: newLocation === loc ? '#FFFBF5' : '#8B7355' }}>
                      {LOCATION_EMOJI[loc]} {loc.charAt(0).toUpperCase() + loc.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category */}
            <View style={{ gap: 5 }}>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.8, color: '#8B7355' }}>
                Category
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
                      backgroundColor: newCategory === cat ? '#FFF0E8' : '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: newCategory === cat ? '#D4652E' : '#ECD9C6',
                    }}
                    onPress={() => setNewCategory(cat)}
                  >
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: newCategory === cat ? '#D4652E' : '#8B7355' }}>
                      {CATEGORY_EMOJI[cat] || '📦'} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quantity & Unit */}
            <View className="flex-row" style={{ gap: 10 }}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.8, color: '#8B7355' }}>
                  Quantity
                </Text>
                <TextInput
                  style={{
                    backgroundColor: newQuantity ? '#FFFFFF' : '#F5EDE0',
                    borderWidth: 1.5,
                    borderColor: newQuantityError ? '#ef4444' : newQuantity ? 'rgba(212,101,46,0.30)' : '#ECD9C6',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: '#2D2520',
                  }}
                  placeholder="e.g. 2"
                  placeholderTextColor="#B09880"
                  value={newQuantity}
                  onChangeText={(text) => {
                    setNewQuantity(text);
                    setNewQuantityError(validateQuantity(text));
                  }}
                  keyboardType="numeric"
                />
                {newQuantityError ? (
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#ef4444', marginTop: 2 }}>{newQuantityError}</Text>
                ) : null}
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.8, color: '#8B7355' }}>
                  Unit
                </Text>
                <TextInput
                  style={{
                    backgroundColor: newUnit ? '#FFFFFF' : '#F5EDE0',
                    borderWidth: 1.5,
                    borderColor: newUnit ? 'rgba(212,101,46,0.30)' : '#ECD9C6',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: '#2D2520',
                  }}
                  placeholder="e.g. lbs"
                  placeholderTextColor="#B09880"
                  value={newUnit}
                  onChangeText={setNewUnit}
                />
              </View>
            </View>

            {/* Expiry Date */}
            <View style={{ gap: 5 }}>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.8, color: '#8B7355' }}>
                Expiration Date
              </Text>
              <TextInput
                style={{
                  backgroundColor: newExpiry ? '#FFFFFF' : '#F5EDE0',
                  borderWidth: 1.5,
                  borderColor: newExpiry ? 'rgba(212,101,46,0.30)' : '#ECD9C6',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 14,
                  color: '#2D2520',
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#B09880"
                value={newExpiry}
                onChangeText={setNewExpiry}
              />
            </View>

            {/* Add button */}
            <TouchableOpacity
              onPress={onAdd}
              disabled={!newName.trim() || adding}
              style={{
                backgroundColor: '#2D2520',
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                marginTop: 4,
                opacity: !newName.trim() || adding ? 0.5 : 1,
              }}
            >
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14.5, color: '#FFFBF5' }}>
                {adding ? 'Adding...' : 'Add to My Food'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ═══ Edit Item Modal ═══ */}
      <Modal visible={showEditModal} animationType="slide" onRequestClose={onCloseEdit}>
        <View className="flex-1" style={{ backgroundColor: '#FFFBF5' }}>
          <View style={{ backgroundColor: '#2D2520', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <TouchableOpacity
                  onPress={onCloseEdit}
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="arrow-back" size={18} color="#FFFBF5" />
                </TouchableOpacity>
                <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#FFFBF5' }}>Edit Item</Text>
              </View>
              <TouchableOpacity
                onPress={onSaveEdit}
                disabled={!editName.trim() || adding}
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: editName.trim() && !adding ? '#F0916A' : '#B09880' }}>
                  {adding ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="px-5 pt-4" contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
            <View style={{ gap: 5 }}>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.8, color: '#8B7355' }}>
                Item Name
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: 'rgba(212,101,46,0.30)',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 14,
                  color: '#2D2520',
                }}
                value={editName}
                onChangeText={setEditName}
                autoFocus
              />
            </View>
            <View style={{ gap: 5 }}>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.8, color: '#8B7355' }}>
                Storage Location
              </Text>
              <View className="flex-row" style={{ gap: 8 }}>
                {STORAGE_LOCATIONS.map(loc => (
                  <TouchableOpacity
                    key={loc}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor: editLocation === loc ? '#2D2520' : '#FFFFFF',
                      borderWidth: editLocation === loc ? 0 : 1.5,
                      borderColor: '#ECD9C6',
                    }}
                    onPress={() => setEditLocation(loc)}
                  >
                    <Text style={{ fontFamily: editLocation === loc ? 'DMSans_600SemiBold' : 'DMSans_400Regular', fontSize: 14, color: editLocation === loc ? '#FFFBF5' : '#8B7355' }}>
                      {LOCATION_EMOJI[loc]} {loc.charAt(0).toUpperCase() + loc.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ gap: 5 }}>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.8, color: '#8B7355' }}>
                Category
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
                      backgroundColor: editCategory === cat ? '#FFF0E8' : '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: editCategory === cat ? '#D4652E' : '#ECD9C6',
                    }}
                    onPress={() => setEditCategory(cat)}
                  >
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: editCategory === cat ? '#D4652E' : '#8B7355' }}>
                      {CATEGORY_EMOJI[cat] || '📦'} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View className="flex-row" style={{ gap: 10 }}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.8, color: '#8B7355' }}>
                  Quantity
                </Text>
                <TextInput
                  style={{
                    backgroundColor: editQuantity ? '#FFFFFF' : '#F5EDE0',
                    borderWidth: 1.5,
                    borderColor: editQuantityError ? '#ef4444' : editQuantity ? 'rgba(212,101,46,0.30)' : '#ECD9C6',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: '#2D2520',
                  }}
                  placeholder="e.g. 2"
                  placeholderTextColor="#B09880"
                  value={editQuantity}
                  onChangeText={(text) => {
                    setEditQuantity(text);
                    setEditQuantityError(validateQuantity(text));
                  }}
                  keyboardType="numeric"
                />
                {editQuantityError ? (
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#ef4444', marginTop: 2 }}>{editQuantityError}</Text>
                ) : null}
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.8, color: '#8B7355' }}>
                  Unit
                </Text>
                <TextInput
                  style={{
                    backgroundColor: editUnit ? '#FFFFFF' : '#F5EDE0',
                    borderWidth: 1.5,
                    borderColor: editUnit ? 'rgba(212,101,46,0.30)' : '#ECD9C6',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: '#2D2520',
                  }}
                  placeholder="e.g. lbs"
                  placeholderTextColor="#B09880"
                  value={editUnit}
                  onChangeText={setEditUnit}
                />
              </View>
            </View>
            <View style={{ gap: 5 }}>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.8, color: '#8B7355' }}>
                Expiry Date
              </Text>
              <TextInput
                style={{
                  backgroundColor: editExpiry ? '#FFFFFF' : '#F5EDE0',
                  borderWidth: 1.5,
                  borderColor: editExpiry ? 'rgba(212,101,46,0.30)' : '#ECD9C6',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 14,
                  color: '#2D2520',
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#B09880"
                value={editExpiry}
                onChangeText={setEditExpiry}
              />
            </View>

            <TouchableOpacity
              onPress={onSaveEdit}
              disabled={!editName.trim() || adding}
              style={{
                backgroundColor: '#2D2520',
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                marginTop: 4,
                opacity: !editName.trim() || adding ? 0.5 : 1,
              }}
            >
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14.5, color: '#FFFBF5' }}>
                {adding ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ═══ Delete Confirmation Modal (web) ═══ */}
      <Modal
        visible={!!deleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={onCancelDelete}
      >
        <TouchableOpacity
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPress={onCancelDelete}
        >
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 20, marginHorizontal: 32, width: 288 }}>
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: '#2D2520', textAlign: 'center' }}>Delete Item</Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8B7355', textAlign: 'center', marginTop: 8 }}>
              Remove "{deleteConfirm?.name}" from inventory?
            </Text>
            <View className="flex-row justify-center mt-4" style={{ gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F5EDE0' }}
                onPress={onCancelDelete}
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#2D2520', textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#ef4444' }}
                onPress={() => deleteConfirm && onConfirmDelete(deleteConfirm.id)}
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: 'white', textAlign: 'center' }}>Delete</Text>
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
        onRequestClose={onDismissAction}
      >
        <TouchableOpacity
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPress={onDismissAction}
        >
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36 }}>
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: '#2D2520', textAlign: 'center', marginBottom: 16 }}>
              {actionItem?.name}
            </Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#ECD9C6' }}
              onPress={() => { if (actionItem) onEditItem(actionItem); }}
            >
              <Ionicons name="pencil-outline" size={20} color="#B09880" />
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#2D2520', marginLeft: 12 }}>Edit Item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#ECD9C6' }}
              onPress={() => {
                if (actionItem) {
                  const item = actionItem;
                  onDismissAction();
                  onDeleteItem(item.id, item.name);
                }
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#ef4444', marginLeft: 12 }}>Delete Item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingVertical: 14, marginTop: 4 }}
              onPress={onDismissAction}
            >
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#B09880', textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
