import { useEffect } from 'react';
import { useSegments, useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // After login, check onboarding
      if (user && !user.onboardingCompleted) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } else if (isAuthenticated && !inOnboarding && user && !user.onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, segments, isInitialized]);
}
