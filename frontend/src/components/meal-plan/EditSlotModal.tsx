import { View, Text, TouchableOpacity, Pressable, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MEAL_TYPES } from './mealPlanHelpers';

interface EditSlotModalProps {
  editSlotModal: any;
  onClose: () => void;
  editServings: number;
  setEditServings: (s: number) => void;
  editMealType: string;
  setEditMealType: (t: string) => void;
  savingSlot: boolean;
  onSaveSlotEdits: () => void;
  onQuickLog: () => void;
  onEditLog: () => void;
  onUndoCompleted: () => void;
  onDelete: () => void;
}

export default function EditSlotModal({
  editSlotModal, onClose,
  editServings, setEditServings,
  editMealType, setEditMealType,
  savingSlot, onSaveSlotEdits,
  onQuickLog, onEditLog, onUndoCompleted, onDelete,
}: EditSlotModalProps) {
  return (
    <Modal visible={!!editSlotModal} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <View className="bg-white rounded-t-2xl px-5 pt-5 pb-8">
          {/* Recipe name */}
          <Text className="text-base font-sans-semibold text-warm-dark mb-0.5">
            {editSlotModal?.recipe?.title || editSlotModal?.customName || 'Meal'}
          </Text>
          <Text className="text-xs text-brown-light mb-4 capitalize font-sans">
            {editSlotModal?.mealType} · {new Date(editSlotModal?.date || '').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {editSlotModal?.isCompleted ? ' · Eaten' : ''}
          </Text>

          {editSlotModal?.isCompleted ? (
            /* Completed slot: show View in Nutrition, Undo, and Delete */
            <>
              <View className="bg-orange-light border border-orange-soft rounded-lg px-4 py-3 mb-3">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="checkmark-circle" size={16} color="#D4652E" style={{ marginRight: 6 }} />
                  <Text className="text-sm font-sans-medium text-orange-dark">Logged to Nutrition Tracker</Text>
                </View>
                <Text className="text-xs text-brown font-sans">This meal was logged on {new Date(editSlotModal.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.</Text>
              </View>

              <TouchableOpacity
                className="py-2.5 rounded-lg bg-primary-500 items-center mb-2"
                onPress={() => {
                  onClose();
                  router.push('/health-goals');
                }}
              >
                <Text className="text-sm font-sans-medium text-white">View in Nutrition Tracker</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="py-2.5 rounded-lg bg-cream-dark border border-cream-deeper items-center mb-2"
                onPress={onUndoCompleted}
              >
                <Text className="text-sm font-sans-medium text-warm-soft">Undo (Mark as Not Eaten)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="py-2.5 rounded-lg items-center"
                onPress={onDelete}
              >
                <Text className="text-sm font-sans-medium text-red-500">Delete Slot</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Active slot: full edit UI */
            <>
              {/* Servings picker */}
              <Text className="text-xs text-brown mb-1.5 font-sans-medium">Servings</Text>
              <View className="flex-row gap-2 mb-3">
                {[1, 2, 4].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setEditServings(s)}
                    className={`flex-1 py-2 rounded-lg border items-center ${
                      editServings === s ? 'bg-primary-50 border-primary-400' : 'bg-white border-cream-deeper'
                    }`}
                  >
                    <Text className={`text-sm font-sans-medium ${editServings === s ? 'text-primary-700' : 'text-warm-soft'}`}>{s}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => {
                    if (Alert.prompt) {
                      Alert.prompt('Custom servings', 'How many servings?', (text: string) => {
                        const n = parseInt(text);
                        if (n > 0) setEditServings(n);
                      });
                    }
                  }}
                  className={`flex-1 py-2 rounded-lg border items-center ${
                    ![1, 2, 4].includes(editServings) ? 'bg-primary-50 border-primary-400' : 'bg-white border-cream-deeper'
                  }`}
                >
                  <Text className={`text-sm font-sans-medium ${![1, 2, 4].includes(editServings) ? 'text-primary-700' : 'text-warm-soft'}`}>
                    {![1, 2, 4].includes(editServings) ? editServings : '...'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Meal type selector */}
              <Text className="text-xs text-brown mb-1.5 font-sans-medium">Meal Type</Text>
              <View className="flex-row gap-2 mb-4">
                {MEAL_TYPES.map((mt) => (
                  <TouchableOpacity
                    key={mt}
                    onPress={() => setEditMealType(mt)}
                    className={`flex-1 py-2 rounded-lg border items-center ${
                      editMealType === mt ? 'bg-primary-50 border-primary-400' : 'bg-white border-cream-deeper'
                    }`}
                  >
                    <Text className={`text-xs font-sans-medium capitalize ${editMealType === mt ? 'text-primary-700' : 'text-warm-soft'}`}>{mt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Action buttons */}
              <Text className="text-xs text-brown mb-1.5 font-sans-medium">Log Meal</Text>
              <View className="flex-row gap-2 mb-1">
                <TouchableOpacity
                  className="flex-1 py-2.5 rounded-lg bg-orange items-center"
                  onPress={onQuickLog}
                >
                  <Text className="text-sm font-sans-medium text-white">Log as Eaten</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-2.5 rounded-lg bg-primary-50 border border-primary-300 items-center"
                  onPress={onEditLog}
                >
                  <Text className="text-sm font-sans-medium text-primary-700">Adjust & Log</Text>
                </TouchableOpacity>
              </View>
              <Text className="text-xs text-brown-light mb-3 font-sans">
                Logs this meal to your nutrition tracker. Use "Adjust & Log" to modify macros.
              </Text>

              <Text className="text-xs text-brown mb-1.5 font-sans-medium">Edit Slot</Text>
              <TouchableOpacity
                className="py-2.5 rounded-lg bg-cream-dark items-center mb-2"
                onPress={onSaveSlotEdits}
                disabled={savingSlot}
              >
                <Text className="text-sm font-sans-medium text-warm-soft">
                  {savingSlot ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="py-2.5 rounded-lg items-center"
                onPress={onDelete}
              >
                <Text className="text-sm font-sans-medium text-red-500">Delete Slot</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}
