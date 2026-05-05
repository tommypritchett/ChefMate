import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AddRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  selectedMealType: string;
  selectedDay: Date | null;
  selectedServings: number;
  setSelectedServings: (s: number) => void;
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  recipes: any[];
  onAddSlot: (recipeId: string) => void;
}

export default function AddRecipeModal({
  visible, onClose,
  selectedMealType, selectedDay,
  selectedServings, setSelectedServings,
  searchQuery, setSearchQuery,
  recipes, onAddSlot,
}: AddRecipeModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-cream">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-cream-deeper">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-brown font-sans">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-lg font-sans-semibold text-warm-dark">
            Add {selectedMealType}
          </Text>
          <View className="w-12" />
        </View>

        {selectedDay && (
          <Text className="text-sm text-brown text-center py-2 font-sans">
            {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        )}

        {/* Servings picker */}
        <View className="px-4 pt-2">
          <Text className="text-xs text-brown mb-1.5 font-sans">Servings</Text>
          <View className="flex-row gap-2">
            {[1, 2, 4].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSelectedServings(s)}
                className={`flex-1 py-2 rounded-lg border items-center ${
                  selectedServings === s
                    ? 'bg-primary-50 border-primary-400'
                    : 'bg-white border-cream-deeper'
                }`}
              >
                <Text className={`text-sm font-sans-medium ${
                  selectedServings === s ? 'text-primary-700' : 'text-warm-soft'
                }`}>{s}</Text>
                <Text className={`text-[10px] font-sans ${
                  selectedServings === s ? 'text-primary-500' : 'text-brown-light'
                }`}>
                  {s === 1 ? 'Single' : s === 2 ? 'Leftovers' : 'Meal prep'}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => {
                if (Alert.prompt) {
                  Alert.prompt('Custom servings', 'How many servings?', (text: string) => {
                    const n = parseInt(text);
                    if (n > 0) setSelectedServings(n);
                  });
                }
              }}
              className={`flex-1 py-2 rounded-lg border items-center ${
                ![1, 2, 4].includes(selectedServings)
                  ? 'bg-primary-50 border-primary-400'
                  : 'bg-white border-cream-deeper'
              }`}
            >
              <Text className={`text-sm font-sans-medium ${
                ![1, 2, 4].includes(selectedServings) ? 'text-primary-700' : 'text-warm-soft'
              }`}>
                {![1, 2, 4].includes(selectedServings) ? selectedServings : '...'}
              </Text>
              <Text className={`text-[10px] font-sans ${
                ![1, 2, 4].includes(selectedServings) ? 'text-primary-500' : 'text-brown-light'
              }`}>Custom</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View className="px-4 py-2">
          <View className="flex-row items-center bg-white border border-cream-deeper rounded-xl px-3">
            <Ionicons name="search" size={16} color="#B8A68E" />
            <TextInput
              className="flex-1 py-2.5 px-2 text-sm text-warm-dark font-sans"
              placeholder="Search recipes..."
              placeholderTextColor="#B8A68E"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <ScrollView className="flex-1 px-4">
          {recipes
            .filter(r => !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((recipe: any) => (
              <TouchableOpacity
                key={recipe.id}
                className="bg-white rounded-xl p-3 mb-2 flex-row items-center"
                style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                onPress={() => onAddSlot(recipe.id)}
              >
                <View className="w-10 h-10 rounded-lg bg-orange-light items-center justify-center mr-3">
                  <Ionicons name="restaurant" size={18} color="#D4652E" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-sans-medium text-warm-dark" numberOfLines={1}>{recipe.title}</Text>
                  <Text className="text-xs text-brown-light font-sans">
                    {(recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)} min
                    {recipe.nutrition?.calories ? ` · ${recipe.nutrition.calories} cal` : ''}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={24} color="#D4652E" />
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
