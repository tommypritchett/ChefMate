import { create } from 'zustand';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName?: string }) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('chefmate_token'),
  isLoading: false,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      
      const response = await authApi.login({ email, password });
      
      localStorage.setItem('chefmate_token', response.token);
      localStorage.setItem('chefmate_user', JSON.stringify(response.user));
      
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    try {
      set({ isLoading: true });
      
      const response = await authApi.register(data);
      
      localStorage.setItem('chefmate_token', response.token);
      localStorage.setItem('chefmate_user', JSON.stringify(response.user));
      
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('chefmate_token');
    localStorage.removeItem('chefmate_user');
    
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });

    // Call logout endpoint (fire and forget)
    authApi.logout().catch(console.error);
  },

  loadUser: async () => {
    const token = localStorage.getItem('chefmate_token');
    const savedUser = localStorage.getItem('chefmate_user');
    
    if (!token) {
      set({ isAuthenticated: false });
      return;
    }

    try {
      set({ isLoading: true });
      
      // Try to get fresh user data
      const response = await authApi.getMe();
      
      localStorage.setItem('chefmate_user', JSON.stringify(response.user));
      
      set({
        user: response.user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      // If API call fails but we have saved user data, use it
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (parseError) {
          // Saved data is corrupted, clear auth
          localStorage.removeItem('chefmate_token');
          localStorage.removeItem('chefmate_user');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        // No saved data and API failed, clear auth
        localStorage.removeItem('chefmate_token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    }
  },

  updateUser: async (data) => {
    try {
      const response = await authApi.updateProfile(data);
      
      localStorage.setItem('chefmate_user', JSON.stringify(response.user));
      
      set({ user: response.user });
    } catch (error) {
      throw error;
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));

// Initialize auth state on store creation
useAuthStore.getState().loadUser();