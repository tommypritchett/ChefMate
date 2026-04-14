import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      console.error('Login error details:', JSON.stringify({
        message: err?.message,
        code: err?.code,
        status: err?.response?.status,
        data: err?.response?.data,
      }));
      if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        setError('Cannot connect to server. Make sure the backend is running on port 3001.');
      } else if (err?.code === 'ECONNABORTED') {
        setError('Request timed out. The server may be starting up — try again.');
      } else {
        const message = err?.response?.data?.error
          || err?.response?.data?.details?.[0]?.msg
          || 'Login failed. Please try again.';
        setError(message);
      }
    }
  };

  return (
    <View className="flex-1 bg-gradient-to-br from-primary-500 to-primary-600">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-8 py-12">
            {/* Logo Section */}
            <View className="items-center mb-12 mt-10">
              <View className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl items-center justify-center mb-5 shadow-lg">
                <Text className="text-5xl">🍳</Text>
              </View>
              <Text className="text-4xl font-bold text-gray-900 tracking-tight">Kitcho AI</Text>
              <Text className="text-gray-600 mt-2 text-lg font-medium">Your Smart Cooking Companion</Text>
            </View>

            {/* Feature Badges */}
            <View className="flex-row flex-wrap justify-center mb-6 gap-2">
              <View className="bg-primary-50 px-4 py-2 rounded-2xl flex-row items-center gap-1.5">
                <Text className="text-sm">✨</Text>
                <Text className="text-primary-700 font-medium text-sm">AI Chef Assistant</Text>
              </View>
              <View className="bg-primary-50 px-4 py-2 rounded-2xl flex-row items-center gap-1.5">
                <Text className="text-sm">🥗</Text>
                <Text className="text-primary-700 font-medium text-sm">Meal Planning</Text>
              </View>
              <View className="bg-primary-50 px-4 py-2 rounded-2xl flex-row items-center gap-1.5">
                <Text className="text-sm">🛒</Text>
                <Text className="text-primary-700 font-medium text-sm">Smart Shopping</Text>
              </View>
            </View>

            {/* Error Banner */}
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4">
                <Text className="text-red-600 text-center">{error}</Text>
              </View>
            ) : null}

            {/* Email Input */}
            <View className="mb-5">
              <Text className="text-gray-700 font-semibold mb-2 text-base">Email</Text>
              <TextInput
                className="border-2 border-gray-200 rounded-2xl px-4 py-4 text-lg bg-gray-50"
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            {/* Password Input */}
            <View className="mb-3">
              <Text className="text-gray-700 font-semibold mb-2 text-base">Password</Text>
              <View className="relative">
                <TextInput
                  className="border-2 border-gray-200 rounded-2xl px-4 py-4 text-lg bg-gray-50 pr-16"
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  className="absolute right-4 top-4"
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text className="text-primary-600 font-semibold text-base">
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <View className="items-end mb-6">
              <Link href="/(auth)/reset-password" asChild>
                <TouchableOpacity>
                  <Text className="text-primary-600 text-base font-semibold">
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              className={`rounded-2xl py-4 items-center shadow-lg ${
                isLoading ? 'bg-primary-300' : 'bg-gradient-to-br from-primary-500 to-primary-600'
              }`}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-lg">Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-8">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="mx-4 text-gray-400 text-sm">OR</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Register Link */}
            <View className="items-center">
              <View className="flex-row">
                <Text className="text-gray-600 text-base">Don't have an account? </Text>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <Text className="text-primary-600 font-semibold text-base">Sign Up</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
