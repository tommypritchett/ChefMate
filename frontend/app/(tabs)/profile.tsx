import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  return (
    <View className="flex-1 bg-cream">
      <ScreenHeader title="Profile" />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* User Info Card */}
        <View
          className="bg-white rounded-2xl p-6 mb-4"
          style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
        >
          <View className="items-center mb-4">
            <View className="bg-orange-light rounded-full p-5 mb-4">
              <Ionicons name="person" size={48} color="#D4652E" />
            </View>
            <Text className="text-2xl font-serif-bold text-warm-dark">
              {user?.firstName} {user?.lastName}
            </Text>
            <Text className="text-brown mt-1 font-sans">{user?.email}</Text>
          </View>

          <View className="border-t border-cream-deeper pt-4">
            <View className="flex-row justify-between mb-3">
              <Text className="text-brown font-sans">Subscription</Text>
              <Text className="text-warm-dark font-sans-semibold capitalize">{user?.subscriptionTier || 'Free'}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-brown font-sans">Member since</Text>
              <Text className="text-warm-dark font-sans-semibold">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View
          className="bg-white rounded-2xl mb-4"
          style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
        >
          <TouchableOpacity
            testID="my-nutrition-button"
            className="flex-row items-center p-5 border-b border-cream-deeper"
            onPress={() => router.push('/health-goals')}
          >
            <Ionicons name="trophy-outline" size={24} color="#f59e0b" />
            <Text className="text-warm-dark font-sans-medium ml-4 flex-1 text-base">My Nutrition</Text>
            <Ionicons name="chevron-forward" size={20} color="#B8A68E" />
          </TouchableOpacity>
          <TouchableOpacity
            testID="preferences-button"
            className="flex-row items-center p-5 border-b border-cream-deeper"
            onPress={() => router.push('/preferences')}
          >
            <Ionicons name="settings-outline" size={24} color="#B8A68E" />
            <Text className="text-warm-dark font-sans-medium ml-4 flex-1 text-base">Preferences</Text>
            <Ionicons name="chevron-forward" size={20} color="#B8A68E" />
          </TouchableOpacity>
          <TouchableOpacity
            testID="notifications-button"
            className="flex-row items-center p-5"
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color="#B8A68E" />
            <Text className="text-warm-dark font-sans-medium ml-4 flex-1 text-base">Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#B8A68E" />
          </TouchableOpacity>
        </View>

        {/* Legal & Privacy */}
        <View
          className="bg-white rounded-2xl mb-4"
          style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
        >
          <TouchableOpacity
            className="flex-row items-center p-5 border-b border-cream-deeper"
            onPress={() => router.push('/privacy-policy')}
          >
            <Ionicons name="shield-checkmark-outline" size={24} color="#B8A68E" />
            <Text className="text-warm-dark font-sans-medium ml-4 flex-1 text-base">Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#B8A68E" />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center p-5"
            onPress={() => router.push('/terms-of-service')}
          >
            <Ionicons name="document-text-outline" size={24} color="#B8A68E" />
            <Text className="text-warm-dark font-sans-medium ml-4 flex-1 text-base">Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#B8A68E" />
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <View className="bg-orange-light rounded-2xl px-5 py-4 mb-4">
          <Text className="text-xs text-brown font-sans leading-[18px]">
            Kitcho AI is not responsible for users not validating data accuracy. Nutritional estimates, macro calculations, and expiration dates are approximations — always verify important information yourself.
          </Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          testID="sign-out-button"
          className="bg-white rounded-2xl p-5 flex-row items-center justify-center"
          style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          <Text className="text-red-500 font-sans-bold ml-2 text-base">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
