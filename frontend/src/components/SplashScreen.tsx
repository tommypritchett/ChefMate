import { View, Text, ActivityIndicator } from 'react-native';

export default function SplashScreen() {
  return (
    <View className="flex-1 bg-warm-dark items-center justify-center">
      <Text className="text-5xl mb-4">🍳</Text>
      <Text className="text-2xl font-serif-bold text-cream mb-2">Kitcho AI</Text>
      <Text className="text-cream-deeper text-base font-sans mb-8">Your AI Cooking Assistant</Text>
      <ActivityIndicator size="large" color="#D4652E" />
      <Text className="text-brown-light font-sans mt-4">Loading...</Text>
    </View>
  );
}
