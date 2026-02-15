import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  return (
    <View className="flex-1 bg-gray-50 p-6">
      {/* User Info Card */}
      <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <View className="items-center mb-4">
          <View className="bg-primary-100 rounded-full p-4 mb-3">
            <Ionicons name="person" size={40} color="#10b981" />
          </View>
          <Text className="text-xl font-bold text-gray-800">
            {user?.firstName} {user?.lastName}
          </Text>
          <Text className="text-gray-500">{user?.email}</Text>
        </View>

        <View className="border-t border-gray-100 pt-4">
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-500">Subscription</Text>
            <Text className="text-gray-800 font-medium capitalize">{user?.subscriptionTier || 'Free'}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-500">Member since</Text>
            <Text className="text-gray-800 font-medium">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View className="bg-white rounded-2xl shadow-sm mb-4">
        <TouchableOpacity
          className="flex-row items-center p-4 border-b border-gray-100"
          onPress={() => router.push('/health-goals')}
        >
          <Ionicons name="trophy-outline" size={22} color="#f59e0b" />
          <Text className="text-gray-800 ml-3 flex-1">Health Goals</Text>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
          <Ionicons name="settings-outline" size={22} color="#6b7280" />
          <Text className="text-gray-800 ml-3 flex-1">Preferences</Text>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center p-4">
          <Ionicons name="notifications-outline" size={22} color="#6b7280" />
          <Text className="text-gray-800 ml-3 flex-1">Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        className="bg-white rounded-2xl p-4 shadow-sm flex-row items-center justify-center"
        onPress={logout}
      >
        <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        <Text className="text-red-500 font-semibold ml-2">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
