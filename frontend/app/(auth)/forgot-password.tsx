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
import { Image } from 'expo-image';
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
      className="flex-1 bg-cream"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          {/* Logo/Header */}
          <View className="items-center mb-10">
            <View className="w-16 h-16 bg-warm-dark rounded-3xl items-center justify-center mb-4">
              <Image
                source={require('../../assets/icon.png')}
                style={{ width: 48, height: 48, borderRadius: 12 }}
                cachePolicy="memory-disk"
              />
            </View>
            <Text className="text-4xl font-serif-bold text-warm-dark">Kitcho AI</Text>
            <Text className="text-brown-light font-sans mt-2 text-base">Reset Your Password</Text>
          </View>

          {/* Instructions */}
          <View className="mb-6">
            <Text className="text-brown font-sans text-center">
              Enter your email address and we'll send you a link to reset your password.
            </Text>
          </View>

          {/* Success Message */}
          {success ? (
            <View className="bg-orange-light border border-orange-soft rounded-lg p-4 mb-4">
              <Text className="text-orange font-sans text-center font-medium">{success}</Text>
              <Text className="text-orange font-sans text-center text-sm mt-2">
                Check your email for the reset link. It will expire in 1 hour.
              </Text>
            </View>
          ) : null}

          {/* Error Banner */}
          {error ? (
            <View className="bg-orange-light border border-orange-soft rounded-lg p-3 mb-4">
              <Text className="text-orange font-sans text-center">{error}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View className="mb-6">
            <Text className="text-warm-dark font-sans-semibold mb-1.5">Email</Text>
            <TextInput
              className="border border-cream-deeper rounded-lg px-4 py-3 text-base bg-cream-dark text-warm-dark"
              placeholder="you@example.com"
              placeholderTextColor="#b5a99a"
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
              isLoading ? 'bg-brown-light' : 'bg-warm-dark'
            }`}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-cream font-sans-semibold text-base">Send Reset Link</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login Link */}
          <View className="flex-row justify-center mt-4">
            <Text className="text-brown-light font-sans">Remember your password? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-orange font-sans-semibold">Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
