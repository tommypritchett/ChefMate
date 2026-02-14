// User types
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  subscriptionTier: 'free' | 'premium' | 'pro';
  subscriptionExpiresAt: Date | null;
  preferences: any;
  notificationSettings: any;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Recipe types
export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  notes?: string;
  isOptional?: boolean;
}

export interface Instruction {
  step: number;
  text: string;
  time?: number;
  image?: string;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  sugar?: number;
}

export interface Recipe {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  originalItemName: string | null;
  ingredients: Ingredient[];
  instructions: Instruction[];
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  nutrition: NutritionInfo | null;
  originalNutrition: NutritionInfo | null;
  dietaryTags: string[];
  isAiGenerated: boolean;
  imageUrl: string | null;
  imageUrls: string[];
  viewCount: number;
  saveCount: number;
  makeCount: number;
  averageRating: number | null;
  estimatedCostPerServing: number | null;
  originalPrice: number | null;
  costSavingsPercent: number | null;
  ingredientCosts: any | null;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeCard {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  servings: number;
  averageRating: number | null;
  viewCount: number;
  saveCount: number;
  nutrition: NutritionInfo | null;
  dietaryTags: string[];
  estimatedCostPerServing: number | null;
  originalPrice: number | null;
  costSavingsPercent: number | null;
  ingredientCosts: any | null;
  createdAt: Date;
}

// Inventory types
export interface InventoryItem {
  id: string;
  userId: string;
  name: string;
  category: string | null;
  storageLocation: 'fridge' | 'freezer' | 'pantry';
  quantity: number | null;
  unit: string | null;
  purchasedAt: Date | null;
  expiresAt: Date | null;
  openedAt: Date | null;
  predictedExpiryDate: Date | null;
  shelfLifeDays: number | null;
  imageUrl: string | null;
  isExpired: boolean;
  isRunningLow: boolean;
  brand: string | null;
  barcode: string | null;
  price: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Shopping list types
export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  isChecked: boolean;
  checkedAt: Date | null;
  estimatedPrice: number | null;
  actualPrice: number | null;
  storeUrls: { [store: string]: string } | null;
  notes: string | null;
  createdAt: Date;
}

export interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  sourceType: 'manual' | 'recipe' | 'recurring' | null;
  sourceRecipeId: string | null;
  isActive: boolean;
  isRecurring: boolean;
  recurrencePattern: string | null;
  preferredStore: string | null;
  estimatedTotal: number | null;
  items: ShoppingListItem[];
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

// Conversation types
export interface ConversationThread {
  id: string;
  userId: string;
  title: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  messages?: ChatMessage[];
  _count?: { messages: number };
}

export interface ChatMessage {
  id: string;
  userId: string;
  threadId: string | null;
  role: 'user' | 'assistant';
  message: string;
  contextType: string | null;
  contextData: any;
  generatedRecipeId: string | null;
  tokensUsed: number | null;
  createdAt: Date;
}

// Meal plan types
export interface MealPlan {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  notes: string | null;
  slots: MealPlanSlot[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MealPlanSlot {
  id: string;
  mealPlanId: string;
  recipeId: string | null;
  date: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  customName: string | null;
  notes: string | null;
  recipe?: Partial<Recipe> | null;
  createdAt: Date;
  updatedAt: Date;
}

// Health goal types
export interface HealthGoal {
  id: string;
  userId: string;
  goalType: 'calories' | 'protein' | 'carbs' | 'fat' | 'weight';
  targetValue: number;
  currentValue: number | null;
  unit: string | null;
  isActive: boolean;
  startDate: Date;
  targetDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  error: string;
  details?: any;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
}

export interface GenerateRecipeForm {
  prompt: string;
  servings?: number;
  dietaryRestrictions?: string[];
}
