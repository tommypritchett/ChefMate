import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-500 pt-3 pb-5 px-5">
        <Text className="text-white text-3xl font-bold tracking-tight">Profile</Text>
      </View>

      <View className="p-5">
        {/* User Info Card */}
        <View className="bg-white rounded-2xl p-6 shadow-md mb-4">
          <View className="items-center mb-4">
            <View className="bg-primary-100 rounded-full p-5 mb-4">
              <Ionicons name="person" size={48} color="#10b981" />
            </View>
            <Text className="text-2xl font-bold text-gray-900">
              {user?.firstName} {user?.lastName}
            </Text>
            <Text className="text-gray-600 mt-1">{user?.email}</Text>
          </View>

          <View className="border-t border-gray-100 pt-4">
            <View className="flex-row justify-between mb-3">
              <Text className="text-gray-600">Subscription</Text>
              <Text className="text-gray-900 font-semibold capitalize">{user?.subscriptionTier || 'Free'}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Member since</Text>
              <Text className="text-gray-900 font-semibold">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View className="bg-white rounded-2xl shadow-md mb-4">
          <TouchableOpacity
            testID="my-nutrition-button"
            className="flex-row items-center p-5 border-b border-gray-100"
            onPress={() => router.push('/health-goals')}
          >
            <Ionicons name="trophy-outline" size={24} color="#f59e0b" />
            <Text className="text-gray-900 font-medium ml-4 flex-1 text-base">My Nutrition</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
          <TouchableOpacity
            testID="preferences-button"
            className="flex-row items-center p-5 border-b border-gray-100"
            onPress={() => router.push('/preferences')}
          >
            <Ionicons name="settings-outline" size={24} color="#6b7280" />
            <Text className="text-gray-900 font-medium ml-4 flex-1 text-base">Preferences</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
          <TouchableOpacity
            testID="notifications-button"
            className="flex-row items-center p-5"
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color="#6b7280" />
            <Text className="text-gray-900 font-medium ml-4 flex-1 text-base">Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          testID="sign-out-button"
          className="bg-white rounded-2xl p-5 shadow-md flex-row items-center justify-center"
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          <Text className="text-red-500 font-bold ml-2 text-base">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
