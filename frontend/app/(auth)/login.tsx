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
    <View className="flex-1 bg-cream">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-7 py-12">
            {/* Logo Block */}
            <View className="items-center mb-9 mt-6">
              <View
                className="w-[72px] h-[72px] bg-warm-dark rounded-[22px] items-center justify-center mb-[18px]"
                style={{
                  shadowColor: '#2D2520',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.10,
                  shadowRadius: 20,
                  elevation: 8,
                }}
              >
                <Image
                  source={require('../../assets/icon.png')}
                  style={{ width: 48, height: 48, borderRadius: 12 }}
                  cachePolicy="memory-disk"
                />
              </View>
              <Text className="text-[26px] font-serif-bold text-warm-dark" style={{ letterSpacing: -0.5 }}>
                Kitcho AI
              </Text>
              <Text className="text-brown mt-1.5 text-[13px] font-sans" style={{ letterSpacing: 0.1 }}>
                Your personal kitchen companion
              </Text>
            </View>

            {/* Error Banner */}
            {error ? (
              <View className="bg-orange-light border border-orange-soft rounded-[14px] p-3.5 mb-[18px] flex-row items-start gap-2.5">
                <Text className="text-[16px] mt-px">⚠</Text>
                <Text className="text-orange-dark text-[13.5px] font-sans-medium flex-1" style={{ lineHeight: 20 }}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Email Input */}
            <View className="mb-3.5">
              <Text
                className="text-brown font-sans-semibold mb-[7px] text-xs"
                style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}
              >
                Email
              </Text>
              <TextInput
                className="border-[1.5px] border-cream-deeper rounded-[14px] px-4 h-[50px] text-[15px] bg-white font-sans text-warm-dark"
                style={{
                  shadowColor: '#2D2520',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 2,
                }}
                placeholder="you@example.com"
                placeholderTextColor="#C4AD95"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            {/* Password Input */}
            <View className="mb-3.5">
              <Text
                className="text-brown font-sans-semibold mb-[7px] text-xs"
                style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}
              >
                Password
              </Text>
              <View className="relative">
                <TextInput
                  className="border-[1.5px] border-cream-deeper rounded-[14px] px-4 pr-[60px] h-[50px] text-[15px] bg-white font-sans text-warm-dark"
                  style={{
                    shadowColor: '#2D2520',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                  placeholder="••••••••"
                  placeholderTextColor="#C4AD95"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  className="absolute right-3.5 top-0 bottom-0 justify-center"
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text className="text-orange font-sans-semibold text-[13px]" style={{ letterSpacing: 0.2 }}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <View className="items-end -mt-1.5 mb-5">
              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity>
                  <Text className="text-orange text-[13px] font-sans-medium">
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              className={`rounded-[20px] h-[54px] items-center justify-center mt-2 ${
                isLoading ? 'bg-brown-light' : 'bg-warm-dark'
              }`}
              style={{
                shadowColor: '#2D2520',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.10,
                shadowRadius: 20,
                elevation: 6,
              }}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFBF5" />
              ) : (
                <Text className="text-cream font-sans-semibold text-[16px]" style={{ letterSpacing: 0.1 }}>
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            {/* Bottom Link */}
            <View className="items-center mt-6">
              <View className="flex-row">
                <Text className="text-brown text-sm font-sans">Don't have an account? </Text>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <Text className="text-orange font-sans-semibold text-sm">Sign Up</Text>
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
