import { useState, useEffect } from 'react';
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
import { Link, router, useLocalSearchParams } from 'expo-router';
import api from '../../src/services/api';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async () => {
    setError('');

    if (!password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      await api.post('/auth/reset-password', {
        token,
        password,
      });

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.details?.[0]?.msg ||
        'Failed to reset password. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <View className="flex-1 bg-cream justify-center px-6">
        <View className="items-center">
          <View className="bg-orange-light rounded-full w-20 h-20 items-center justify-center mb-6">
            <Text className="text-orange text-4xl">✓</Text>
          </View>
          <Text className="text-2xl font-serif-bold text-warm-dark mb-2">Password Reset!</Text>
          <Text className="text-brown font-sans text-center mb-4">
            Your password has been successfully reset.
          </Text>
          <Text className="text-brown-light font-sans text-center">
            Redirecting to login...
          </Text>
        </View>
      </View>
    );
  }

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
            <Text className="text-brown-light font-sans mt-2 text-base">Create New Password</Text>
          </View>

          {/* Error Banner */}
          {error ? (
            <View className="bg-orange-light border border-orange-soft rounded-lg p-3 mb-4">
              <Text className="text-orange font-sans text-center">{error}</Text>
            </View>
          ) : null}

          {/* New Password Input */}
          <View className="mb-4">
            <Text className="text-warm-dark font-sans-semibold mb-1.5">New Password</Text>
            <View className="relative">
              <TextInput
                className="border border-cream-deeper rounded-lg px-4 py-3 text-base bg-cream-dark text-warm-dark pr-16"
                placeholder="Enter new password (min 6 characters)"
                placeholderTextColor="#b5a99a"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password-new"
                editable={!isLoading && !!token}
              />
              <TouchableOpacity
                className="absolute right-3 top-3"
                onPress={() => setShowPassword(!showPassword)}
                disabled={!token}
              >
                <Text className="text-orange font-sans-semibold">
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View className="mb-6">
            <Text className="text-warm-dark font-sans-semibold mb-1.5">Confirm Password</Text>
            <View className="relative">
              <TextInput
                className="border border-cream-deeper rounded-lg px-4 py-3 text-base bg-cream-dark text-warm-dark pr-16"
                placeholder="Re-enter new password"
                placeholderTextColor="#b5a99a"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoComplete="password-new"
                editable={!isLoading && !!token}
              />
              <TouchableOpacity
                className="absolute right-3 top-3"
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={!token}
              >
                <Text className="text-orange font-sans-semibold">
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className={`rounded-lg py-3.5 items-center mb-4 ${
              isLoading || !token ? 'bg-brown-light' : 'bg-warm-dark'
            }`}
            onPress={handleSubmit}
            disabled={isLoading || !token}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-cream font-sans-semibold text-base">Reset Password</Text>
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
