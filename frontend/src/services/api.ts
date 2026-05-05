import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthResponse, User, Recipe, RecipeCard } from '../types';

const TOKEN_KEY = 'chefmate_token';
const REFRESH_TOKEN_KEY = 'chefmate_refresh_token';

// Platform-aware base URL
const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3001/api';
  }
  // For iOS simulator, localhost works. For Android emulator, use 10.0.2.2
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001/api';
  }
  // For physical iPhone - use your Mac's local IP
  // Change this if you're on a different network
  return 'http://10.0.0.42:3001/api';
};

// Token storage - SecureStore on native, localStorage on web
const tokenStorage = {
  get: async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },
  set: async (token: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  remove: async (): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

// Refresh token storage
const refreshTokenStorage = {
  get: async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  set: async (token: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },
  remove: async (): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};

export { tokenStorage, refreshTokenStorage };

// Create axios instance
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // CSRF protection header
  },
  timeout: 15000,
});

// Request interceptor - add auth token
api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401 with automatic token refresh
let onUnauthorized: (() => void) | null = null;
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue failed requests while token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = await refreshTokenStorage.get();

      if (!refreshToken) {
        // No refresh token, logout
        isRefreshing = false;
        await tokenStorage.remove();
        await refreshTokenStorage.remove();
        onUnauthorized?.();
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        const response = await axios.post(`${getBaseUrl()}/auth/refresh`, {
          refreshToken,
        });

        const { token } = response.data;

        // Store new access token
        await tokenStorage.set(token);

        // Update Authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        originalRequest.headers['Authorization'] = `Bearer ${token}`;

        // Process queued requests
        processQueue(null);
        isRefreshing = false;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout
        processQueue(refreshError);
        isRefreshing = false;
        await tokenStorage.remove();
        await refreshTokenStorage.remove();
        onUnauthorized?.();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (data: { email: string; password: string; firstName: string; lastName?: string }): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      const refreshToken = await refreshTokenStorage.get();
      await api.post('/auth/logout', { refreshToken });
    } catch {}
    await tokenStorage.remove();
    await refreshTokenStorage.remove();
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<{ user: User }> => {
    const response = await api.patch('/auth/me', data);
    return response.data;
  },
};

// Recipes API
export const recipesApi = {
  getRecipes: async (params?: {
    category?: string;
    brand?: string;
    difficulty?: string;
    search?: string;
    tags?: string;
    proteinType?: string;
    cuisineStyle?: string;
    cookingMethod?: string;
    minIngredientMatch?: number;
    page?: number;
    limit?: number;
    featured?: boolean;
  }): Promise<{ recipes: RecipeCard[]; pagination: any }> => {
    const response = await api.get('/recipes', { params });
    return response.data;
  },

  getRecipe: async (id: string): Promise<{ recipe: Recipe }> => {
    const response = await api.get(`/recipes/${id}`);
    return response.data;
  },

  logView: async (id: string): Promise<void> => {
    await api.post(`/recipes/${id}/view`);
  },

  getMyGenerated: async (): Promise<{ recipes: RecipeCard[] }> => {
    const response = await api.get('/recipes/my-generated');
    return response.data;
  },
};

// AI API
export const aiApi = {
  generateRecipe: async (data: {
    prompt: string;
    servings?: number;
    dietaryRestrictions?: string[];
  }): Promise<{ recipe: Recipe }> => {
    const response = await api.post('/ai/generate-recipe', data);
    return response.data;
  },

  chat: async (data: {
    message: string;
    context?: any;
  }): Promise<{ message: string }> => {
    const response = await api.post('/ai/chat', data);
    return response.data;
  },

  getChatHistory: async (limit?: number): Promise<{ messages: any[] }> => {
    const response = await api.get('/ai/chat/history', {
      params: { limit }
    });
    return response.data;
  },
};

// Conversations API
export const conversationsApi = {
  getThreads: async (contextType?: string): Promise<{ threads: any[] }> => {
    const response = await api.get('/conversations', { params: { contextType } });
    return response.data;
  },

  createThread: async (title?: string, contextType?: string): Promise<{ thread: any }> => {
    const response = await api.post('/conversations', { title, contextType });
    return response.data;
  },

  getThread: async (id: string): Promise<{ thread: any }> => {
    const response = await api.get(`/conversations/${id}`);
    return response.data;
  },

  updateThread: async (id: string, data: { title?: string; isActive?: boolean }): Promise<{ thread: any }> => {
    const response = await api.patch(`/conversations/${id}`, data);
    return response.data;
  },

  deleteThread: async (id: string): Promise<void> => {
    await api.delete(`/conversations/${id}`);
  },

  sendMessage: async (threadId: string, message: string, context?: any): Promise<{ userMessage: any; assistantMessage: any }> => {
    const response = await api.post(`/conversations/${threadId}/messages`, { message, context }, {
      timeout: 120000, // 120s — AI tool execution can take multiple rounds
    });
    return response.data;
  },

  /** Stream a message via SSE — returns an AbortController to cancel */
  sendMessageStream: async (
    threadId: string,
    message: string,
    context: any,
    onToken: (token: string) => void,
    onDone: (data: { messageId: string; content: string; toolCalls: any[]; metadata: any }) => void,
    onError: (error: string) => void,
  ): Promise<AbortController> => {
    const token = await tokenStorage.get();
    const controller = new AbortController();

    try {
      const response = await fetch(`${getBaseUrl()}/conversations/${threadId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ message, context }),
        signal: controller.signal,
      });

      if (!response.ok) {
        onError(`Server error: ${response.status}`);
        return controller;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError('No response body');
        return controller;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'token') {
                  onToken(data.content);
                } else if (data.type === 'done') {
                  onDone({
                    messageId: data.messageId,
                    content: data.content,
                    toolCalls: data.toolCalls || [],
                    metadata: data.metadata || {},
                  });
                } else if (data.type === 'error') {
                  onError(data.message || 'Stream error');
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            onError(err.message || 'Stream failed');
          }
        }
      };

      processStream();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Failed to connect');
      }
    }

    return controller;
  },
};

// Meal Plans API
export const mealPlansApi = {
  getPlans: async (): Promise<{ plans: any[] }> => {
    const response = await api.get('/meal-plans');
    return response.data;
  },

  createPlan: async (data: { name: string; startDate: string; endDate: string; notes?: string }): Promise<{ plan: any }> => {
    const response = await api.post('/meal-plans', data);
    return response.data;
  },

  getPlan: async (id: string): Promise<{ plan: any }> => {
    const response = await api.get(`/meal-plans/${id}`);
    return response.data;
  },

  updatePlan: async (id: string, data: any): Promise<{ plan: any }> => {
    const response = await api.patch(`/meal-plans/${id}`, data);
    return response.data;
  },

  deletePlan: async (id: string): Promise<void> => {
    await api.delete(`/meal-plans/${id}`);
  },

  addSlot: async (planId: string, data: { recipeId?: string; date: string; mealType: string; customName?: string; notes?: string; servings?: number }): Promise<{ slot: any }> => {
    const response = await api.post(`/meal-plans/${planId}/slots`, data);
    return response.data;
  },

  updateSlot: async (planId: string, slotId: string, data: any): Promise<{ slot: any }> => {
    const response = await api.patch(`/meal-plans/${planId}/slots/${slotId}`, data);
    return response.data;
  },

  deleteSlot: async (planId: string, slotId: string): Promise<void> => {
    await api.delete(`/meal-plans/${planId}/slots/${slotId}`);
  },

  markSlotCompleted: async (planId: string, slotId: string, isCompleted: boolean): Promise<{ slot: any; mealLogCreated: boolean }> => {
    const response = await api.patch(`/meal-plans/${planId}/slots/${slotId}`, { isCompleted });
    return response.data;
  },
};

// Favorites API
export const favoritesApi = {
  getFavorites: async (): Promise<{ savedRecipes: any[] }> => {
    const response = await api.get('/favorites');
    return response.data;
  },

  saveRecipe: async (data: {
    recipeId: string;
    folderId?: string;
    notes?: string;
    rating?: number;
  }): Promise<{ savedRecipe: any }> => {
    const response = await api.post('/favorites', data);
    return response.data;
  },

  unsaveRecipe: async (id: string): Promise<void> => {
    await api.delete(`/favorites/${id}`);
  },
};

// Inventory API
export const inventoryApi = {
  getInventory: async (): Promise<{ items: any[] }> => {
    const response = await api.get('/inventory');
    return response.data;
  },

  addItem: async (data: {
    name: string;
    category?: string;
    storageLocation: string;
    quantity?: number;
    unit?: string;
    purchasedAt?: string;
    expiresAt?: string;
  }): Promise<{ item: any }> => {
    const response = await api.post('/inventory', data);
    return response.data;
  },

  updateItem: async (id: string, data: {
    name?: string;
    category?: string;
    storageLocation?: string;
    quantity?: number;
    unit?: string;
    expiresAt?: string | null;
  }): Promise<{ item: any }> => {
    const response = await api.patch(`/inventory/${id}`, data);
    return response.data;
  },

  deleteItem: async (id: string): Promise<void> => {
    await api.delete(`/inventory/${id}`);
  },

  analyzePhoto: async (imageBase64: string): Promise<{ items: any[]; source: string; message: string }> => {
    const response = await api.post('/inventory/analyze-photo', { imageBase64 }, {
      timeout: 45000, // 45s — Vision API + large base64 payload needs more time
    });
    return response.data;
  },
};

// Shopping Lists API
export const shoppingApi = {
  getLists: async (): Promise<{ lists: any[] }> => {
    const response = await api.get('/shopping-lists');
    return response.data;
  },

  createList: async (data: {
    name: string;
    description?: string;
    sourceType?: string;
    sourceRecipeId?: string;
    items?: { name: string; quantity?: number; unit?: string; category?: string }[];
  }): Promise<{ list: any }> => {
    const response = await api.post('/shopping-lists', data);
    return response.data;
  },

  deleteList: async (id: string): Promise<void> => {
    await api.delete(`/shopping-lists/${id}`);
  },

  addItem: async (listId: string, data: { name: string; quantity?: number; unit?: string; category?: string; krogerProductId?: string }): Promise<{ item: any }> => {
    const response = await api.post(`/shopping-lists/${listId}/items`, data);
    return response.data;
  },

  toggleItem: async (listId: string, itemId: string, isChecked: boolean): Promise<{ item: any }> => {
    const response = await api.patch(`/shopping-lists/${listId}/items/${itemId}`, { isChecked });
    return response.data;
  },

  editItem: async (listId: string, itemId: string, data: { name?: string; quantity?: number; unit?: string; notes?: string; krogerProductId?: string }): Promise<{ item: any; listCompleted?: boolean }> => {
    const response = await api.patch(`/shopping-lists/${listId}/items/${itemId}`, data);
    return response.data;
  },

  deleteItem: async (listId: string, itemId: string): Promise<void> => {
    await api.delete(`/shopping-lists/${listId}/items/${itemId}`);
  },

  updateList: async (listId: string, data: { name?: string; isActive?: boolean }): Promise<{ list: any }> => {
    const response = await api.patch(`/shopping-lists/${listId}`, data);
    return response.data;
  },

  purchaseItem: async (listId: string, itemId: string, storageLocation?: string): Promise<any> => {
    const response = await api.post(`/shopping-lists/${listId}/items/${itemId}/purchase`, { storageLocation });
    return response.data;
  },

  purchasePreview: async (listId: string): Promise<{ items: Array<{ id: string; name: string; quantity: number; unit: string; category: string; storageLocation: string }> }> => {
    const response = await api.get(`/shopping-lists/${listId}/purchase-preview`);
    return response.data;
  },

  purchaseAll: async (listId: string, itemLocations?: Array<{ itemId: string; storageLocation: string }>): Promise<any> => {
    const response = await api.post(`/shopping-lists/${listId}/purchase-all`, { itemLocations });
    return response.data;
  },

  searchProducts: async (query: string, options?: { kroger?: boolean; lat?: number; lng?: number }): Promise<{ products: Array<{ name: string; category: string; defaultUnit: string; commonUnits?: string[]; source?: string; imageUrl?: string; price?: number; promoPrice?: number; size?: string; brand?: string }> }> => {
    const params: any = { q: query };
    if (options?.kroger) params.kroger = 'true';
    if (options?.lat) params.lat = options.lat;
    if (options?.lng) params.lng = options.lng;
    const response = await api.get('/shopping-lists/search-products', { params });
    return response.data;
  },

  bulkAddItems: async (listId: string, items: string): Promise<{ count: number; items: any[]; list: any }> => {
    const response = await api.post(`/shopping-lists/${listId}/items/bulk`, { items });
    return response.data;
  },

  setKrogerLocation: async (lat: number, lng: number): Promise<{ krogerLocation: any }> => {
    const response = await api.post('/shopping-lists/set-kroger-location', { lat, lng });
    return response.data;
  },
  markItemsCarted: async (listId: string, itemIds: string[], itemQuantities?: Record<string, number>): Promise<{ success: boolean; count: number }> => {
    const response = await api.post(`/shopping-lists/${listId}/mark-carted`, { itemIds, itemQuantities });
    return response.data;
  },
  smartSearch: async (items: string[]): Promise<{ results: any[]; storeName: string }> => {
    const response = await api.post('/shopping-lists/smart-search', { items });
    return response.data;
  },
  parseItems: async (text: string): Promise<{ items: string[] }> => {
    const response = await api.post('/shopping-lists/parse-items', { text });
    return response.data;
  },
};

// Health Goals API
export const healthGoalsApi = {
  getGoals: async (): Promise<{ goals: any[] }> => {
    const response = await api.get('/health-goals');
    return response.data;
  },

  createGoal: async (data: { goalType: string; targetValue: number; unit?: string; targetDate?: string; startingWeight?: number; startWeightDate?: string }): Promise<{ goal: any }> => {
    const response = await api.post('/health-goals', data);
    return response.data;
  },

  updateGoal: async (id: string, data: any): Promise<{ goal: any }> => {
    const response = await api.patch(`/health-goals/${id}`, data);
    return response.data;
  },

  deleteGoal: async (id: string): Promise<void> => {
    await api.delete(`/health-goals/${id}`);
  },

  getProgress: async (): Promise<{ goals: any[]; dailyTotals: any; weeklyAvg: any; mealCount: number }> => {
    const response = await api.get('/health-goals/progress');
    return response.data;
  },

  scoreRecipes: async (): Promise<{ recipes: any[]; goalTypes: string[] }> => {
    const response = await api.get('/health-goals/score-recipes');
    return response.data;
  },

  logWeight: async (data: { weight: number; unit?: string; logDate: string; notes?: string }): Promise<{ log: any }> => {
    const response = await api.post('/health-goals/weight-log', data);
    return response.data;
  },

  getWeightLogs: async (days?: number): Promise<{ logs: any[]; stats: any }> => {
    const response = await api.get('/health-goals/weight-logs', { params: { days } });
    return response.data;
  },

  deleteWeightLog: async (id: string): Promise<void> => {
    await api.delete(`/health-goals/weight-log/${id}`);
  },

  getCalendarData: async (month: string): Promise<{ days: Record<string, any> }> => {
    const response = await api.get('/health-goals/calendar-data', { params: { month } });
    return response.data;
  },
};

// Nutrition API
export const nutritionApi = {
  getDailyNutrition: async (date: string): Promise<{ meals: any[]; totals: any }> => {
    const response = await api.get(`/nutrition/daily/${date}`);
    return response.data;
  },

  logMeal: async (data: {
    mealType: string;
    mealDate: string;
    mealTime?: string;
    recipeId?: string;
    mealName?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    notes?: string;
  }): Promise<{ mealLog: any }> => {
    const response = await api.post('/nutrition/log-meal', data);
    return response.data;
  },

  searchRecipes: async (query: string): Promise<{ recipes: any[] }> => {
    const response = await api.get('/nutrition/search-recipes', { params: { q: query } });
    return response.data;
  },

  estimateNutrition: async (query: string): Promise<{ mealName: string; calories: number; protein: number; carbs: number; fat: number }> => {
    const response = await api.get('/nutrition/estimate', { params: { q: query } });
    return response.data;
  },

  estimateIngredients: async (ingredients: string[]): Promise<{
    breakdown: Array<{ item: string; calories: number; protein: number; carbs: number; fat: number }>;
    totals: { calories: number; protein: number; carbs: number; fat: number };
  }> => {
    const response = await api.post('/nutrition/estimate-ingredients', { ingredients });
    return response.data;
  },

  getRecentMeals: async (): Promise<{ meals: Array<{
    id: string; mealType: string; mealName: string | null; notes: string | null;
    calories: number | null; proteinGrams: number | null; carbsGrams: number | null; fatGrams: number | null;
    createdAt: string;
  }> }> => {
    const response = await api.get('/nutrition/recent-meals');
    return response.data;
  },

  updateMeal: async (id: string, data: {
    mealType?: string;
    mealName?: string;
    mealTime?: string;
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
  }): Promise<{ mealLog: any }> => {
    const response = await api.patch(`/nutrition/meal/${id}`, data);
    return response.data;
  },

  deleteMeal: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.delete(`/nutrition/meal/${id}`);
    return response.data;
  },
};

// Grocery API
export const groceryApi = {
  getPrice: async (item: string): Promise<any> => {
    const response = await api.get('/grocery/price', { params: { item } });
    return response.data;
  },

  comparePrices: async (items: string[], location?: { lat: number; lng: number }, preferredStores?: string[]): Promise<{
    items: any[];
    storeTotals: Record<string, number>;
    storeLinks?: Record<string, { homeUrl: string; searchUrl: string }>;
    itemSearchUrls?: Record<string, Record<string, string>>;
    bestStore?: { name: string; total: number };
    totalSavings?: number;
    storeDistances?: Array<{ chain: string; distance: number; address: string; logoColor: string; homeUrl: string }>;
    rankedStores?: Array<{ store: string; total: number; distance: number; score: number; recommended: boolean }>;
  }> => {
    const response = await api.post('/grocery/compare', {
      items,
      ...(location && { lat: location.lat, lng: location.lng }),
      ...(preferredStores && { preferredStores }),
    });
    return response.data;
  },

  getDeals: async (lat: number, lng: number, limit?: number): Promise<{
    storeName: string;
    storeAddress?: string;
    deals: Array<{ krogerProductId: string; name: string; brand: string; size: string; price: number; promoPrice?: number; onSale?: boolean; saleSavings?: number; imageUrl?: string; inStock?: boolean }>;
  }> => {
    const response = await api.get('/grocery/deals', { params: { lat, lng, limit } });
    return response.data;
  },

  getPriceHistory: async (item: string, days?: number): Promise<{
    item: string;
    days: number;
    history: any[];
    trend: { direction: 'up' | 'down' | 'stable'; percentChange: number; avgPrice: number };
  }> => {
    const response = await api.get('/grocery/price-history', { params: { item, days } });
    return response.data;
  },
};

// Recipe Cost API
export const recipeCostApi = {
  getRecipeCost: async (id: string, lat?: number, lng?: number): Promise<{
    recipeTitle: string;
    storeName: string;
    totalCost: number;
    perServing: number;
    servings: number;
    ingredients: Array<{ name: string; price: number; unit: string; isEstimated: boolean }>;
  }> => {
    const params: any = {};
    if (lat) params.lat = lat;
    if (lng) params.lng = lng;
    const response = await api.get(`/recipes/${id}/cost`, { params });
    return response.data;
  },
};

// Kroger API
export const krogerApi = {
  getStatus: async (): Promise<{ isLinked: boolean; isExpired: boolean | null }> => {
    const response = await api.get('/kroger/status');
    return response.data;
  },

  getAuthUrl: async (): Promise<{ url: string }> => {
    const response = await api.get('/kroger/auth-url');
    return response.data;
  },

  callback: async (code: string): Promise<{ success: boolean }> => {
    const response = await api.post('/kroger/callback', { code });
    return response.data;
  },

  addToCart: async (items: Array<{ upc: string; quantity: number }>, options?: { listId?: string; itemIds?: string[]; itemQuantities?: Record<string, number> }): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/kroger/add-to-cart', { items, ...options });
    return response.data;
  },
};

// Concepts API
export const conceptsApi = {
  getNewThisWeek: async (): Promise<{ concepts: any[] }> => {
    const response = await api.get('/concepts/new-this-week');
    return response.data;
  },

  list: async (params?: { category?: string; season?: string; page?: number; limit?: number }): Promise<{ concepts: any[]; pagination: any }> => {
    const response = await api.get('/concepts', { params });
    return response.data;
  },

  getBySlug: async (slug: string): Promise<{ concept: any; variants: any[] }> => {
    const response = await api.get(`/concepts/${slug}`);
    return response.data;
  },
};

export default api;
