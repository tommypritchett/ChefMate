import { useEffect } from 'react';
import { Slot, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { useProtectedRoute } from '../src/hooks/useProtectedRoute';
import "../global.css";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { loadUser, isInitialized } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [isInitialized]);

  useProtectedRoute();

  if (!isInitialized) {
    return null;
  }

  return (
    <>
      <Slot />
      <StatusBar style="auto" />
    </>
  );
}
