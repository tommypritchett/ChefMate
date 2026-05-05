import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ui/ScreenHeader';

export default function PrivacyPolicyScreen() {
  return (
    <View className="flex-1 bg-cream">
      <ScreenHeader title="Privacy Policy" onBack={() => router.push('/(tabs)/profile')} />

      <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-xs text-brown-light font-sans mb-4">Last updated: February 14, 2026</Text>

        <Text className="text-lg font-serif-bold text-warm-dark mb-2">1. Information We Collect</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-1">Kitcho AI collects the following information to provide our meal planning service:</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-1">• Account information: Name, email address, password (encrypted)</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-1">• Health data: Dietary preferences, health goals — only when you choose to set them</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-1">• Inventory data: Food items you add to track</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-4">• Usage data: Recipes viewed, meal plans created, and shopping lists generated</Text>

        <Text className="text-lg font-serif-bold text-warm-dark mb-2">2. How We Use Your Information</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-1">• Provide personalized recipe recommendations and meal plans</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-1">• Track your nutrition against health goals</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-1">• Send expiration reminders and meal notifications</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-4">• Improve our AI recommendations over time</Text>

        <Text className="text-lg font-serif-bold text-warm-dark mb-2">3. Data Storage & Security</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-4">Your data is stored securely using industry-standard encryption. Passwords are hashed and never stored in plain text. We do not sell your personal information to third parties.</Text>

        <Text className="text-lg font-serif-bold text-warm-dark mb-2">4. Your Rights</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-1">• Access your data at any time through the app</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-1">• Request deletion of your account and data</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-4">• Opt out of non-essential notifications</Text>

        <Text className="text-lg font-serif-bold text-warm-dark mb-2">5. Disclaimers</Text>
        <View className="bg-orange-light rounded-xl px-4 py-3 mb-2">
          <Text className="text-xs text-brown font-sans leading-[18px]">Macro estimates are approximations — validate and enter your own for the most accurate numbers.</Text>
        </View>
        <View className="bg-orange-light rounded-xl px-4 py-3 mb-2">
          <Text className="text-xs text-brown font-sans leading-[18px]">Expiration dates are estimate-based — please validate yourself.</Text>
        </View>
        <View className="bg-orange-light rounded-xl px-4 py-3 mb-4">
          <Text className="text-xs text-brown font-sans leading-[18px]">Kitcho AI is not responsible for users not validating data accuracy.</Text>
        </View>

        <Text className="text-lg font-serif-bold text-warm-dark mb-2">6. Contact</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-4">For privacy-related questions, contact us at privacy@kitcho.ai</Text>
      </ScrollView>
    </View>
  );
}
