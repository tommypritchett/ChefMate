import axios from 'axios';
import { AuthResponse, User, Recipe, RecipeCard } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chefmate_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('chefmate_token');
      localStorage.removeItem('chefmate_user');
      // Redirect to login or show auth modal
      window.location.href = '/login';
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
    await api.post('/auth/logout');
    localStorage.removeItem('chefmate_token');
    localStorage.removeItem('chefmate_user');
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

  createRecipe: async (data: {
    title: string;
    description?: string;
    brand?: string;
    originalItemName?: string;
    ingredients: any[];
    instructions: any[];
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    servings?: number;
    difficulty?: string;
    nutrition?: any;
    originalNutrition?: any;
    dietaryTags?: string[];
    isAiGenerated?: boolean;
  }): Promise<{ recipe: Recipe }> => {
    const response = await api.post('/recipes', data);
    return response.data;
  },

  logView: async (id: string): Promise<void> => {
    await api.post(`/recipes/${id}/view`);
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

// Favorites API
export const favoritesApi = {
  // Folders
  getFolders: async (): Promise<{ folders: any[] }> => {
    const response = await api.get('/favorites/folders');
    return response.data;
  },

  createFolder: async (data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }): Promise<{ folder: any }> => {
    const response = await api.post('/favorites/folders', data);
    return response.data;
  },

  deleteFolder: async (id: string): Promise<void> => {
    await api.delete(`/favorites/folders/${id}`);
  },

  // Saved Recipes
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
    purchasedAt?: Date;
    expiresAt?: Date;
  }): Promise<{ item: any }> => {
    const response = await api.post('/inventory', data);
    return response.data;
  },

  updateItem: async (id: string, data: any): Promise<{ item: any }> => {
    const response = await api.patch(`/inventory/${id}`, data);
    return response.data;
  },

  deleteItem: async (id: string): Promise<void> => {
    await api.delete(`/inventory/${id}`);
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
  }): Promise<{ list: any }> => {
    const response = await api.post('/shopping-lists', data);
    return response.data;
  },

  updateList: async (id: string, data: any): Promise<{ list: any }> => {
    const response = await api.patch(`/shopping-lists/${id}`, data);
    return response.data;
  },

  deleteList: async (id: string): Promise<void> => {
    await api.delete(`/shopping-lists/${id}`);
  },

  addItem: async (listId: string, data: {
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
  }): Promise<{ item: any }> => {
    const response = await api.post(`/shopping-lists/${listId}/items`, data);
    return response.data;
  },

  updateItem: async (listId: string, itemId: string, data: {
    isChecked?: boolean;
  }): Promise<{ item: any }> => {
    const response = await api.patch(`/shopping-lists/${listId}/items/${itemId}`, data);
    return response.data;
  },

  deleteItem: async (listId: string, itemId: string): Promise<void> => {
    await api.delete(`/shopping-lists/${listId}/items/${itemId}`);
  },

  // Purchase item and add to inventory
  purchaseItem: async (listId: string, itemId: string, data?: {
    storageLocation?: string;
    category?: string;
  }): Promise<{ success: boolean; message: string; inventoryItem: any }> => {
    const response = await api.post(`/shopping-lists/${listId}/items/${itemId}/purchase`, data || {});
    return response.data;
  },

  // Purchase all unchecked items and add to inventory
  purchaseAll: async (listId: string, data?: {
    storageLocation?: string;
  }): Promise<{ success: boolean; message: string; count: number; inventoryItems: any[] }> => {
    const response = await api.post(`/shopping-lists/${listId}/purchase-all`, data || {});
    return response.data;
  },
};

export default api;