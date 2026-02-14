import { create } from 'zustand';
import { router } from 'expo-router';
import { User } from '../types';
import { authApi, tokenStorage, setUnauthorizedHandler } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isInitialized: boolean; // true after first loadUser completes
  isLoading: boolean; // true during login/register API calls (does NOT unmount app)
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isInitialized: false,
  isLoading: false,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true });

      const response = await authApi.login({ email, password });

      await tokenStorage.set(response.token);

      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });

      router.replace('/(tabs)');
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    try {
      set({ isLoading: true });

      const response = await authApi.register(data);

      await tokenStorage.set(response.token);

      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });

      router.replace('/(tabs)');
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await authApi.logout();

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });

    router.replace('/(auth)/login');
  },

  loadUser: async () => {
    const token = await tokenStorage.get();

    if (!token) {
      set({ isAuthenticated: false, isInitialized: true });
      return;
    }

    try {
      const response = await authApi.getMe();

      set({
        user: response.user,
        token,
        isAuthenticated: true,
        isInitialized: true,
      });
    } catch (error) {
      await tokenStorage.remove();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isInitialized: true,
      });
    }
  },

  updateUser: async (data) => {
    const response = await authApi.updateProfile(data);
    set({ user: response.user });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setUser: (user: User) => {
    localStorage.setItem('chefmate_user', JSON.stringify(user));
    set({ user });
  },
}));

// Wire up 401 handler to auto-logout
setUnauthorizedHandler(() => {
  const store = useAuthStore.getState();
  if (store.isAuthenticated) {
    store.logout();
  }
});
