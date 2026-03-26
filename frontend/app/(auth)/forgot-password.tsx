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
import { Link, router } from 'expo-router';
import api from '../../src/services/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.post('/auth/forgot-password', {
        email: email.trim(),
      });

      setSuccess(response.data.message || 'Password reset link sent! Check your email.');
      setEmail('');
    } catch (err: any) {
      console.error('Forgot password error:', err);
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.details?.[0]?.msg ||
        'Failed to send reset link. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          {/* Logo/Header */}
          <View className="items-center mb-10">
            <Text className="text-4xl font-bold text-primary-600">ChefMate</Text>
            <Text className="text-gray-500 mt-2 text-base">Reset Your Password</Text>
          </View>

          {/* Instructions */}
          <View className="mb-6">
            <Text className="text-gray-600 text-center">
              Enter your email address and we'll send you a link to reset your password.
            </Text>
          </View>

          {/* Success Message */}
          {success ? (
            <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <Text className="text-green-700 text-center font-medium">{success}</Text>
              <Text className="text-green-600 text-center text-sm mt-2">
                Check your email for the reset link. It will expire in 1 hour.
              </Text>
            </View>
          ) : null}

          {/* Error Banner */}
          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <Text className="text-red-600 text-center">{error}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View className="mb-6">
            <Text className="text-gray-700 font-medium mb-1.5">Email</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-gray-50"
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

          {/* Submit Button */}
          <TouchableOpacity
            className={`rounded-lg py-3.5 items-center mb-4 ${
              isLoading ? 'bg-primary-300' : 'bg-primary-500'
            }`}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Send Reset Link</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login Link */}
          <View className="flex-row justify-center mt-4">
            <Text className="text-gray-500">Remember your password? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-primary-600 font-semibold">Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
