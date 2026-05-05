import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ui/ScreenHeader';

export default function TermsOfServiceScreen() {
  return (
    <View className="flex-1 bg-cream">
      <ScreenHeader title="Terms of Service" onBack={() => router.push('/(tabs)/profile')} />

      <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-xs text-brown-light font-sans mb-4">Last updated: February 14, 2026</Text>

        <Text className="text-lg font-serif-bold text-warm-dark mb-2">1. Acceptance of Terms</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-4">By creating an account or using Kitcho AI, you agree to these Terms of Service. If you do not agree, please do not use the service.</Text>

        <Text className="text-lg font-serif-bold text-warm-dark mb-2">2. Service Description</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-4">Kitcho AI is a meal planning, recipe discovery, and pantry management application powered by AI. The service provides recipe suggestions, nutritional estimates, and shopping list features.</Text>

        <Text className="text-lg font-serif-bold text-warm-dark mb-2">3. User Responsibilities</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-1">• You are responsible for maintaining the security of your account</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-1">• You must provide accurate information when creating an account</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-4">• You are responsible for validating nutritional data and food safety information</Text>

        <Text className="text-lg font-serif-bold text-warm-dark mb-2">4. Data Accuracy Disclaimer</Text>
        <View className="bg-orange-light rounded-xl px-4 py-3 mb-2">
          <Text className="text-sm text-brown font-sans-medium leading-5">These are estimates — validate and enter your own for the most accurate numbers.</Text>
        </View>
        <View className="bg-orange-light rounded-xl px-4 py-3 mb-2">
          <Text className="text-sm text-brown font-sans-medium leading-5">Expiration dates are estimate-based — please validate yourself.</Text>
        </View>
        <View className="bg-orange-light rounded-xl px-4 py-3 mb-4">
          <Text className="text-sm text-brown font-sans-medium leading-5">Kitcho AI is not responsible for users not validating data accuracy.</Text>
        </View>

        <Text className="text-lg font-serif-bold text-warm-dark mb-2">5. Limitation of Liability</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-4">Kitcho AI provides nutritional information, expiration estimates, and recipe suggestions as approximations only. We are not liable for any health issues, food safety incidents, or dietary decisions made based on information provided by the app. Always consult a healthcare professional for dietary advice.</Text>

        <Text className="text-lg font-serif-bold text-warm-dark mb-2">6. Intellectual Property</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-4">All content, recipes, and AI-generated suggestions are provided for personal use only and may not be redistributed commercially.</Text>

        <Text className="text-lg font-serif-bold text-warm-dark mb-2">7. Changes to Terms</Text>
        <Text className="text-sm text-brown font-sans leading-5 mb-4">We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.</Text>
      </ScrollView>
    </View>
  );
}
