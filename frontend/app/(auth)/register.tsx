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
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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

    if (!acceptedTerms) {
      setError('Please accept the Terms of Service and Privacy Policy');
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
    <View className="flex-1 bg-cream">
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
              <View
                className="w-20 h-20 bg-warm-dark rounded-3xl items-center justify-center mb-5"
                style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 6 }}
              >
                <Image
                  source={require('../../assets/icon.png')}
                  style={{ width: 48, height: 48, borderRadius: 12 }}
                  cachePolicy="memory-disk"
                />
              </View>
              <Text className="text-4xl font-serif-bold text-warm-dark tracking-tight">Kitcho AI</Text>
              <Text className="text-warm-soft mt-2 text-lg font-sans">Create your account</Text>
            </View>

            {/* Error Banner */}
            {error ? (
              <View className="bg-orange-light border border-orange-soft rounded-2xl p-3 mb-4">
                <Text className="text-orange text-center font-sans">{error}</Text>
              </View>
            ) : null}

            {/* Name Fields */}
            <View className="flex-row gap-3 mb-5">
              <View className="flex-1">
                <Text className="text-warm-dark font-sans-semibold mb-2 text-base">First Name *</Text>
                <TextInput
                  className="border-2 border-cream-deeper rounded-2xl px-4 py-4 text-lg bg-cream-dark font-sans"
                  placeholder="John"
                  placeholderTextColor="#A89080"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
              <View className="flex-1">
                <Text className="text-warm-dark font-sans-semibold mb-2 text-base">Last Name</Text>
                <TextInput
                  className="border-2 border-cream-deeper rounded-2xl px-4 py-4 text-lg bg-cream-dark font-sans"
                  placeholder="Doe"
                  placeholderTextColor="#A89080"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Email Input */}
            <View className="mb-5">
              <Text className="text-warm-dark font-sans-semibold mb-2 text-base">Email *</Text>
              <TextInput
                className="border-2 border-cream-deeper rounded-2xl px-4 py-4 text-lg bg-cream-dark font-sans"
                placeholder="you@example.com"
                placeholderTextColor="#A89080"
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
              <Text className="text-warm-dark font-sans-semibold mb-2 text-base">Password *</Text>
              <View className="relative">
                <TextInput
                  className="border-2 border-cream-deeper rounded-2xl px-4 py-4 text-lg bg-cream-dark pr-16 font-sans"
                  placeholder="At least 6 characters"
                  placeholderTextColor="#A89080"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  className="absolute right-4 top-4"
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text className="text-orange font-sans-semibold text-base">
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms & Privacy Acceptance */}
            <TouchableOpacity
              className="flex-row items-start mb-5"
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              activeOpacity={0.7}
            >
              <View
                className={`w-5 h-5 rounded-md border-2 items-center justify-center mt-0.5 mr-3 ${
                  acceptedTerms ? 'bg-warm-dark border-warm-dark' : 'border-cream-deeper bg-white'
                }`}
              >
                {acceptedTerms && <Ionicons name="checkmark" size={14} color="#FFFBF5" />}
              </View>
              <Text className="flex-1 text-sm text-brown font-sans leading-5">
                I agree to the{' '}
                <Text className="text-orange font-sans-semibold">Terms of Service</Text>
                {' '}and{' '}
                <Text className="text-orange font-sans-semibold">Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* Disclaimer */}
            <View className="bg-orange-light rounded-xl px-4 py-3 mb-5">
              <Text className="text-xs text-brown font-sans leading-[18px]">
                Kitcho AI is not responsible for users not validating data accuracy. Macro estimates and expiration dates are approximations — always verify important nutritional or food safety information.
              </Text>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              className={`rounded-2xl py-4 items-center ${isLoading ? 'bg-brown-light' : 'bg-warm-dark'}`}
              style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 }}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#F5EFE6" />
              ) : (
                <Text className="text-cream font-sans-bold text-lg">Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-8">
              <View className="flex-1 h-px bg-cream-deeper" />
              <Text className="mx-4 text-warm-soft text-sm font-sans">OR</Text>
              <View className="flex-1 h-px bg-cream-deeper" />
            </View>

            {/* Login Link */}
            <View className="items-center">
              <View className="flex-row">
                <Text className="text-warm-soft text-base font-sans">Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text className="text-orange font-sans-semibold text-base">Sign In</Text>
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
