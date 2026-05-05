import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { validateMacro } from './mealPlanHelpers';

interface LogMealModalProps {
  logMealModal: any;
  onClose: () => void;
  logCalories: string;
  setLogCalories: (text: string) => void;
  logCaloriesError: string;
  setLogCaloriesError: (error: string) => void;
  logProtein: string;
  setLogProtein: (text: string) => void;
  logProteinError: string;
  setLogProteinError: (error: string) => void;
  logCarbs: string;
  setLogCarbs: (text: string) => void;
  logCarbsError: string;
  setLogCarbsError: (error: string) => void;
  logFat: string;
  setLogFat: (text: string) => void;
  logFatError: string;
  setLogFatError: (error: string) => void;
  savingLog: boolean;
  onSave: () => void;
}

export default function LogMealModal({
  logMealModal, onClose,
  logCalories, setLogCalories, logCaloriesError, setLogCaloriesError,
  logProtein, setLogProtein, logProteinError, setLogProteinError,
  logCarbs, setLogCarbs, logCarbsError, setLogCarbsError,
  logFat, setLogFat, logFatError, setLogFatError,
  savingLog, onSave,
}: LogMealModalProps) {
  return (
    <Modal visible={!!logMealModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-cream">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-cream-deeper">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-brown font-sans">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-lg font-sans-semibold text-warm-dark">Edit & Log</Text>
          <TouchableOpacity onPress={onSave} disabled={savingLog}>
            <Text className={`font-sans-medium ${savingLog ? 'text-brown-light' : 'text-primary-500'}`}>
              {savingLog ? 'Saving...' : 'Log'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 30 }}>
          <Text className="text-base font-sans-semibold text-warm-dark mb-1">
            {logMealModal?.recipe?.title || logMealModal?.customName || 'Meal'}
          </Text>
          <Text className="text-xs text-brown-light mb-4 capitalize font-sans">
            {logMealModal?.mealType}
            {logMealModal?.servings > 1 ? ` · ${logMealModal.servings} servings` : ''}
          </Text>

          <Text className="text-sm font-sans-medium text-warm-soft mb-2">Adjust Nutrition</Text>
          <View className="flex-row gap-2 mb-2">
            <View className="flex-1">
              <Text className="text-xs text-brown mb-1 font-sans">Calories</Text>
              <TextInput
                className="bg-white border border-cream-deeper rounded-lg px-3 py-2.5 text-sm text-warm-dark font-sans"
                placeholder="kcal"
                placeholderTextColor="#B8A68E"
                value={logCalories}
                onChangeText={(text) => {
                  setLogCalories(text);
                  setLogCaloriesError(validateMacro(text, 'Calories'));
                }}
                keyboardType="numeric"
              />
              {logCaloriesError ? (
                <Text className="text-xs text-red-500 mt-0.5 font-sans">{logCaloriesError}</Text>
              ) : null}
            </View>
            <View className="flex-1">
              <Text className="text-xs text-brown mb-1 font-sans">Protein (g)</Text>
              <TextInput
                className="bg-white border border-cream-deeper rounded-lg px-3 py-2.5 text-sm text-warm-dark font-sans"
                placeholder="g"
                placeholderTextColor="#B8A68E"
                value={logProtein}
                onChangeText={(text) => {
                  setLogProtein(text);
                  setLogProteinError(validateMacro(text, 'Protein'));
                }}
                keyboardType="numeric"
              />
              {logProteinError ? (
                <Text className="text-xs text-red-500 mt-0.5 font-sans">{logProteinError}</Text>
              ) : null}
            </View>
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="text-xs text-brown mb-1 font-sans">Carbs (g)</Text>
              <TextInput
                className="bg-white border border-cream-deeper rounded-lg px-3 py-2.5 text-sm text-warm-dark font-sans"
                placeholder="g"
                placeholderTextColor="#B8A68E"
                value={logCarbs}
                onChangeText={(text) => {
                  setLogCarbs(text);
                  setLogCarbsError(validateMacro(text, 'Carbs'));
                }}
                keyboardType="numeric"
              />
              {logCarbsError ? (
                <Text className="text-xs text-red-500 mt-0.5 font-sans">{logCarbsError}</Text>
              ) : null}
            </View>
            <View className="flex-1">
              <Text className="text-xs text-brown mb-1 font-sans">Fat (g)</Text>
              <TextInput
                className="bg-white border border-cream-deeper rounded-lg px-3 py-2.5 text-sm text-warm-dark font-sans"
                placeholder="g"
                placeholderTextColor="#B8A68E"
                value={logFat}
                onChangeText={(text) => {
                  setLogFat(text);
                  setLogFatError(validateMacro(text, 'Fat'));
                }}
                keyboardType="numeric"
              />
              {logFatError ? (
                <Text className="text-xs text-red-500 mt-0.5 font-sans">{logFatError}</Text>
              ) : null}
            </View>
          </View>

          <Text className="text-xs text-brown-light mt-3 font-sans">
            Pre-filled from recipe nutrition. Adjust if your portion differs.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}
