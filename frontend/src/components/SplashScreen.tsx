import { View, Text, ActivityIndicator } from 'react-native';

export default function SplashScreen() {
  return (
    <View className="flex-1 bg-white items-center justify-center">
      <Text className="text-5xl font-bold text-primary-600 mb-4">ChefMate</Text>
      <Text className="text-gray-500 text-lg mb-8">Your AI Cooking Assistant</Text>
      <ActivityIndicator size="large" color="#10b981" />
      <Text className="text-gray-400 mt-4">Loading...</Text>
    </View>
  );
}
