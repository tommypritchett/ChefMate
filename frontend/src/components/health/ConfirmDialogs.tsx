import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { ALL_GOAL_DEFS, CARD_SHADOW, validateWeight } from './nutritionHelpers';

interface ConfirmDialogsProps {
  // Log Weight modal
  showLogWeightModal: boolean;
  onCloseLogWeight: () => void;
  logWeightValue: string;
  setLogWeightValue: (text: string) => void;
  logWeightValueError: string;
  setLogWeightValueError: (error: string) => void;
  logWeightDate: string;
  setLogWeightDate: (text: string) => void;
  logWeightNotes: string;
  setLogWeightNotes: (text: string) => void;
  savingWeight: boolean;
  onLogWeight: () => void;
  // Delete Meal confirm
  deleteMealConfirm: { id: string; name: string } | null;
  onCancelDeleteMeal: () => void;
  onConfirmDeleteMeal: (id: string) => void;
  // Delete Weight confirm
  deleteWeightConfirm: { id: string; date: string } | null;
  onCancelDeleteWeight: () => void;
  onConfirmDeleteWeight: (id: string) => void;
  // Delete Goal confirm
  confirmDeleteGoal: any;
  onCancelDeleteGoal: () => void;
  onConfirmDeleteGoal: () => void;
}

export default function ConfirmDialogs({
  showLogWeightModal, onCloseLogWeight,
  logWeightValue, setLogWeightValue, logWeightValueError, setLogWeightValueError,
  logWeightDate, setLogWeightDate, logWeightNotes, setLogWeightNotes,
  savingWeight, onLogWeight,
  deleteMealConfirm, onCancelDeleteMeal, onConfirmDeleteMeal,
  deleteWeightConfirm, onCancelDeleteWeight, onConfirmDeleteWeight,
  confirmDeleteGoal, onCancelDeleteGoal, onConfirmDeleteGoal,
}: ConfirmDialogsProps) {
  return (
    <>
      {/* Log Weight Modal */}
      <Modal visible={showLogWeightModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCloseLogWeight}>
        <View className="flex-1 bg-cream">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-cream-deeper">
            <TouchableOpacity onPress={onCloseLogWeight}>
              <Text className="text-brown font-sans">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-sans-semibold text-warm-dark">Log Weight</Text>
            <TouchableOpacity onPress={onLogWeight} disabled={savingWeight || !logWeightValue.trim()}>
              <Text className={`font-sans-semibold ${savingWeight || !logWeightValue.trim() ? 'text-brown-light' : 'text-primary-500'}`}>
                {savingWeight ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 30 }}>
            <Text className="text-sm font-sans-semibold text-brown mb-1">Weight (lbs) *</Text>
            <TextInput
              className="bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark"
              placeholder="e.g. 195.5"
              placeholderTextColor="#B8A68E"
              value={logWeightValue}
              onChangeText={(text) => {
                setLogWeightValue(text);
                setLogWeightValueError(validateWeight(text));
              }}
              keyboardType="numeric"
              autoFocus
            />
            {logWeightValueError ? (
              <Text className="text-xs text-orange mt-1 mb-3 font-sans">{logWeightValueError}</Text>
            ) : <View className="mb-4" />}

            <Text className="text-sm font-sans-semibold text-brown mb-1">Date</Text>
            <TextInput
              className="bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark mb-4"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#B8A68E"
              value={logWeightDate}
              onChangeText={setLogWeightDate}
            />

            <Text className="text-sm font-sans-semibold text-brown mb-1">Notes (optional)</Text>
            <TextInput
              className="bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark"
              placeholder="e.g. morning weigh-in"
              placeholderTextColor="#B8A68E"
              value={logWeightNotes}
              onChangeText={setLogWeightNotes}
              multiline
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Delete Meal Confirmation */}
      <Modal visible={!!deleteMealConfirm} transparent animationType="fade" onRequestClose={onCancelDeleteMeal}>
        <TouchableOpacity
          className="flex-1 bg-black/40 items-center justify-center"
          activeOpacity={1}
          onPress={onCancelDeleteMeal}
        >
          <View className="bg-white rounded-2xl mx-8 p-5 w-72" style={CARD_SHADOW} onStartShouldSetResponder={() => true}>
            <Text className="text-base font-sans-semibold text-warm-dark text-center mb-1">Delete Meal</Text>
            <Text className="text-sm font-sans text-brown text-center mb-4">
              Remove "{deleteMealConfirm?.name}"?
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-lg bg-cream-dark items-center"
                onPress={onCancelDeleteMeal}
              >
                <Text className="text-sm font-sans-semibold text-brown">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-lg bg-red-500 items-center"
                onPress={() => deleteMealConfirm && onConfirmDeleteMeal(deleteMealConfirm.id)}
              >
                <Text className="text-sm font-sans-bold text-white">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Weight Confirmation */}
      <Modal visible={!!deleteWeightConfirm} transparent animationType="fade" onRequestClose={onCancelDeleteWeight}>
        <TouchableOpacity
          className="flex-1 bg-black/40 items-center justify-center"
          activeOpacity={1}
          onPress={onCancelDeleteWeight}
        >
          <View className="bg-white rounded-2xl mx-8 p-5 w-72" style={CARD_SHADOW} onStartShouldSetResponder={() => true}>
            <Text className="text-base font-sans-semibold text-warm-dark text-center mb-1">Delete Weight Entry</Text>
            <Text className="text-sm font-sans text-brown text-center mb-4">
              Remove weight entry from {deleteWeightConfirm?.date}?
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-lg bg-cream-dark items-center"
                onPress={onCancelDeleteWeight}
              >
                <Text className="text-sm font-sans-semibold text-brown">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-lg bg-red-500 items-center"
                onPress={() => deleteWeightConfirm && onConfirmDeleteWeight(deleteWeightConfirm.id)}
              >
                <Text className="text-sm font-sans-bold text-white">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Goal Confirmation */}
      <Modal visible={!!confirmDeleteGoal} transparent animationType="fade" onRequestClose={onCancelDeleteGoal}>
        <TouchableOpacity
          className="flex-1 bg-black/40 items-center justify-center"
          activeOpacity={1}
          onPress={onCancelDeleteGoal}
        >
          <View className="bg-white rounded-2xl mx-8 p-5 w-72" style={CARD_SHADOW} onStartShouldSetResponder={() => true}>
            <Text className="text-base font-sans-semibold text-warm-dark text-center mb-1">Remove Goal</Text>
            <Text className="text-sm font-sans text-brown text-center mb-4">
              Remove "{ALL_GOAL_DEFS.find(d => d.key === confirmDeleteGoal?.goalType)?.label || confirmDeleteGoal?.goalType}"?
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-lg bg-cream-dark items-center"
                onPress={onCancelDeleteGoal}
              >
                <Text className="text-sm font-sans-semibold text-brown">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-lg bg-red-500 items-center"
                onPress={onConfirmDeleteGoal}
              >
                <Text className="text-sm font-sans-bold text-white">Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
