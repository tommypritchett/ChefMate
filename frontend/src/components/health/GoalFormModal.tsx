import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PRIMARY_GOALS, TRACKING_GOALS, ALL_GOAL_DEFS, MAX_PRIMARY_GOALS,
  validateTargetValue, validateWeight,
} from './nutritionHelpers';

interface GoalFormModalProps {
  visible: boolean;
  onClose: () => void;
  modalMode: 'add-primary' | 'add-tracking' | 'edit';
  editGoal: any;
  selectedGoalType: string;
  setSelectedGoalType: (key: string) => void;
  targetValue: string;
  setTargetValue: (text: string) => void;
  targetValueError: string;
  setTargetValueError: (error: string) => void;
  startingWeightInput: string;
  setStartingWeightInput: (text: string) => void;
  startingWeightError: string;
  setStartingWeightError: (error: string) => void;
  targetDateInput: string;
  setTargetDateInput: (text: string) => void;
  saving: boolean;
  onSave: () => void;
  activePrimaryKeys: Set<string>;
  activeTrackingKeys: Set<string>;
  primaryGoalCount: number;
}

export default function GoalFormModal({
  visible, onClose, modalMode, editGoal,
  selectedGoalType, setSelectedGoalType,
  targetValue, setTargetValue, targetValueError, setTargetValueError,
  startingWeightInput, setStartingWeightInput, startingWeightError, setStartingWeightError,
  targetDateInput, setTargetDateInput,
  saving, onSave,
  activePrimaryKeys, activeTrackingKeys, primaryGoalCount,
}: GoalFormModalProps) {
  const saveDisabled = saving
    || (modalMode !== 'edit' && !selectedGoalType)
    || (modalMode === 'add-tracking' && !targetValue.trim())
    || (modalMode === 'edit' && TRACKING_GOALS.some(t => t.key === editGoal?.goalType) && !targetValue.trim());

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-cream">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-cream-deeper">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-brown font-sans">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-lg font-sans-semibold text-warm-dark">
            {modalMode === 'edit' ? 'Edit Goal' : modalMode === 'add-primary' ? 'Add Primary Goal' : 'Add Tracking Goal'}
          </Text>
          <TouchableOpacity onPress={onSave} disabled={saveDisabled}>
            <Text className={`font-sans-semibold ${saving ? 'text-brown-light' : saveDisabled ? 'text-brown-light' : 'text-primary-500'}`}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 30 }}>
          {modalMode === 'edit' && editGoal ? (
            <View>
              {(() => {
                const def = ALL_GOAL_DEFS.find(d => d.key === editGoal.goalType);
                const trackingDef = TRACKING_GOALS.find(t => t.key === editGoal.goalType);
                return (
                  <>
                    <View className="flex-row items-center mb-4">
                      <Ionicons name={def?.icon as any || 'flag'} size={24} color={def?.color || '#D4652E'} />
                      <Text className="text-base font-sans-semibold text-warm-dark ml-2">{def?.label || editGoal.goalType}</Text>
                    </View>
                    {trackingDef ? (
                      <View>
                        <Text className="text-sm font-sans-semibold text-brown mb-1">
                          {editGoal.goalType === 'weight' ? 'Goal Weight' : 'Daily Target'} ({trackingDef.unit})
                        </Text>
                        <TextInput
                          className="bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark"
                          placeholder={trackingDef.placeholder}
                          placeholderTextColor="#B8A68E"
                          value={targetValue}
                          onChangeText={(text) => {
                            setTargetValue(text);
                            const error = editGoal.goalType === 'weight'
                              ? validateWeight(text)
                              : validateTargetValue(text, editGoal.goalType);
                            setTargetValueError(error);
                          }}
                          keyboardType="numeric"
                          autoFocus
                        />
                        {targetValueError ? (
                          <Text className="text-xs text-orange mt-1 font-sans">{targetValueError}</Text>
                        ) : null}
                      </View>
                    ) : (
                      <Text className="text-sm font-sans text-brown">This is a primary goal — no target to edit. You can remove and re-add it.</Text>
                    )}
                  </>
                );
              })()}
            </View>
          ) : modalMode === 'add-primary' ? (
            <View>
              <Text className="text-sm font-sans text-brown mb-3">
                Choose a diet preference ({primaryGoalCount}/{MAX_PRIMARY_GOALS} used)
              </Text>
              <View className="gap-2">
                {PRIMARY_GOALS.map(pg => {
                  const isActive = activePrimaryKeys.has(pg.key);
                  const isSelected = selectedGoalType === pg.key;
                  return (
                    <TouchableOpacity
                      key={pg.key}
                      className={`flex-row items-center p-3 rounded-xl ${
                        isActive ? 'bg-cream-dark opacity-50' :
                        isSelected ? 'bg-primary-50 border-2 border-primary-300' : 'bg-white border border-cream-deeper'
                      }`}
                      onPress={() => !isActive && setSelectedGoalType(pg.key)}
                      disabled={isActive}
                    >
                      <Ionicons name={pg.icon as any} size={20} color={pg.color} />
                      <View className="flex-1 ml-3">
                        <Text className="text-sm font-sans text-warm-dark">{pg.label}</Text>
                        <Text className="text-xs text-brown-light font-sans">{pg.description}</Text>
                      </View>
                      {isActive ? (
                        <Text className="text-xs font-sans text-brown-light">Active</Text>
                      ) : isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color="#D4652E" />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View>
              <Text className="text-sm font-sans text-brown mb-3">Choose a metric to track</Text>
              <View className="gap-2 mb-4">
                {TRACKING_GOALS.map(tg => {
                  const isActive = activeTrackingKeys.has(tg.key);
                  const isSelected = selectedGoalType === tg.key;
                  return (
                    <TouchableOpacity
                      key={tg.key}
                      className={`flex-row items-center p-3 rounded-xl ${
                        isActive ? 'bg-cream-dark opacity-50' :
                        isSelected ? 'bg-primary-50 border-2 border-primary-300' : 'bg-white border border-cream-deeper'
                      }`}
                      onPress={() => !isActive && setSelectedGoalType(tg.key)}
                      disabled={isActive}
                    >
                      <Ionicons name={tg.icon as any} size={20} color={tg.color} />
                      <Text className="text-sm font-sans text-warm-dark ml-3 flex-1">{tg.label}</Text>
                      <Text className="text-xs font-sans text-brown-light">{tg.unit}</Text>
                      {isActive ? (
                        <Text className="text-xs font-sans text-brown-light ml-2">Active</Text>
                      ) : isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color="#D4652E" style={{ marginLeft: 8 }} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedGoalType && selectedGoalType !== 'weight' && (
                <View>
                  <Text className="text-sm font-sans-semibold text-brown mb-1">
                    Daily Target ({TRACKING_GOALS.find(t => t.key === selectedGoalType)?.unit})
                  </Text>
                  <TextInput
                    className="bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark"
                    placeholder={TRACKING_GOALS.find(t => t.key === selectedGoalType)?.placeholder}
                    placeholderTextColor="#B8A68E"
                    value={targetValue}
                    onChangeText={(text) => {
                      setTargetValue(text);
                      setTargetValueError(validateTargetValue(text, selectedGoalType));
                    }}
                    keyboardType="numeric"
                    autoFocus
                  />
                  {targetValueError ? (
                    <Text className="text-xs text-orange mt-1 font-sans">{targetValueError}</Text>
                  ) : null}
                </View>
              )}

              {selectedGoalType === 'weight' && (
                <View>
                  <Text className="text-sm font-sans-semibold text-brown mb-1">Starting Weight (lbs) *</Text>
                  <TextInput
                    className="bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark"
                    placeholder="e.g. 210"
                    placeholderTextColor="#B8A68E"
                    value={startingWeightInput}
                    onChangeText={(text) => {
                      setStartingWeightInput(text);
                      setStartingWeightError(validateWeight(text));
                    }}
                    keyboardType="numeric"
                    autoFocus
                  />
                  {startingWeightError ? (
                    <Text className="text-xs text-orange mt-1 mb-2 font-sans">{startingWeightError}</Text>
                  ) : <View className="mb-3" />}

                  <Text className="text-sm font-sans-semibold text-brown mb-1">Goal Weight (lbs) *</Text>
                  <TextInput
                    className="bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark"
                    placeholder="e.g. 185"
                    placeholderTextColor="#B8A68E"
                    value={targetValue}
                    onChangeText={(text) => {
                      setTargetValue(text);
                      setTargetValueError(validateWeight(text));
                    }}
                    keyboardType="numeric"
                  />
                  {targetValueError ? (
                    <Text className="text-xs text-orange mt-1 mb-2 font-sans">{targetValueError}</Text>
                  ) : <View className="mb-3" />}

                  <Text className="text-sm font-sans-semibold text-brown mb-1">Target Date (optional)</Text>
                  <TextInput
                    className="bg-white border border-cream-deeper rounded-xl px-4 py-3 text-sm text-warm-dark"
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#B8A68E"
                    value={targetDateInput}
                    onChangeText={setTargetDateInput}
                  />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
