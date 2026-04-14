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

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { register, isLoading } = useAuthStore();

  const handleRegister = async () => {
    setError('');

    if (!firstName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim(),
        password,
      });
    } catch (err: any) {
      console.error('Register error details:', JSON.stringify({
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
          || 'Registration failed. Please try again.';
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
            <View className="items-center mb-8 mt-10">
              <View className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl items-center justify-center mb-5 shadow-lg">
                <Text className="text-5xl">🍳</Text>
              </View>
              <Text className="text-4xl font-bold text-gray-900 tracking-tight">Kitcho AI</Text>
              <Text className="text-gray-600 mt-2 text-lg font-medium">Create your account</Text>
            </View>

            {/* Error Banner */}
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4">
                <Text className="text-red-600 text-center">{error}</Text>
              </View>
            ) : null}

            {/* Name Fields */}
            <View className="flex-row gap-3 mb-5">
              <View className="flex-1">
                <Text className="text-gray-700 font-semibold mb-2 text-base">First Name *</Text>
                <TextInput
                  className="border-2 border-gray-200 rounded-2xl px-4 py-4 text-lg bg-gray-50"
                  placeholder="John"
                  placeholderTextColor="#9ca3af"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
              <View className="flex-1">
                <Text className="text-gray-700 font-semibold mb-2 text-base">Last Name</Text>
                <TextInput
                  className="border-2 border-gray-200 rounded-2xl px-4 py-4 text-lg bg-gray-50"
                  placeholder="Doe"
                  placeholderTextColor="#9ca3af"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Email Input */}
            <View className="mb-5">
              <Text className="text-gray-700 font-semibold mb-2 text-base">Email *</Text>
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
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2 text-base">Password *</Text>
              <View className="relative">
                <TextInput
                  className="border-2 border-gray-200 rounded-2xl px-4 py-4 text-lg bg-gray-50 pr-16"
                  placeholder="At least 6 characters"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
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

            {/* Register Button */}
            <TouchableOpacity
              className={`rounded-2xl py-4 items-center shadow-lg ${
                isLoading ? 'bg-primary-300' : 'bg-gradient-to-br from-primary-500 to-primary-600'
              }`}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-lg">Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-8">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="mx-4 text-gray-400 text-sm">OR</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Login Link */}
            <View className="items-center">
              <View className="flex-row">
                <Text className="text-gray-600 text-base">Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text className="text-primary-600 font-semibold text-base">Sign In</Text>
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
