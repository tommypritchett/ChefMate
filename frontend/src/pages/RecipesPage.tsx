import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, Sparkles, X, Clock, Users, ChefHat, Loader, SlidersHorizontal } from 'lucide-react';
import AIRecipeGenerator from '../components/recipe/AIRecipeGenerator';
import { recipesApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface DBRecipe {
  id: string;
  title: string;
  slug?: string;
  description: string | null;
  brand: string | null;
  category?: string | null;
  imageUrl?: string | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  difficulty?: string | null;
  servings?: number | null;
  nutrition?: { calories: number; protein: number; carbs: number; fat: number } | null;
  dietaryTags?: string[] | null;
}

const BRAND_EMOJIS: Record<string, string> = {
  "McDonald's": "🍔",
  "Taco Bell": "🌮",
  "KFC": "🍗",
  "Chick-fil-A": "🐔",
  "Chipotle": "🌯",
  "Burger King": "🍔",
  "Wendy's": "🍔",
  "Pizza Hut": "🍕",
  "Domino's": "🍕",
  "Starbucks": "☕",
  "Panera Bread": "🥖",
  "Panda Express": "🥡",
  "In-N-Out": "🍔",
  "Five Guys": "🍟",
  "Popeyes": "🍗",
  "Buffalo Wild Wings": "🍗",
  "Olive Garden": "🍝",
  "Outback Steakhouse": "🥩",
};

const RecipesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [showAIGenerator, setShowAIGenerator] = useState(searchParams.get('ai') === 'true');
  const [dbRecipes, setDbRecipes] = useState<DBRecipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuthStore();
  
  // Get user's dietary preferences
  const userPreferences = useMemo(() => {
    if (user?.preferences) {
      try {
        const prefs = typeof user.preferences === 'string' 
          ? JSON.parse(user.preferences) 
          : user.preferences;
        return prefs.dietaryPreferences || [];
      } catch (e) {
        return [];
      }
    }
    return [];
  }, [user]);
  
  // Get unique brands from recipes
  const brands = useMemo(() => {
    const brandSet = new Set<string>();
    dbRecipes.forEach(r => {
      if (r.brand) brandSet.add(r.brand);
    });
    return Array.from(brandSet).sort();
  }, [dbRecipes]);
  
  // Filter and sort recipes based on user preferences and search
  const filteredRecipes = useMemo(() => {
    let recipes = dbRecipes;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      recipes = recipes.filter(r => 
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.brand?.toLowerCase().includes(query) ||
        r.dietaryTags?.some(t => t.toLowerCase().includes(query))
      );
    }
    
    // Apply brand filter
    if (selectedBrand) {
      recipes = recipes.filter(r => r.brand === selectedBrand);
    }
    
    // Sort by preference matching
    if (userPreferences.length === 0) return recipes;
    
    const matchesPreferences = (recipe: DBRecipe) => {
      const tags = recipe.dietaryTags || [];
      return userPreferences.some((pref: string) => 
        tags.some((tag: string) => 
          tag.toLowerCase().includes(pref.toLowerCase()) ||
          pref.toLowerCase().includes(tag.toLowerCase())
        )
      );
    };
    
    const matching = recipes.filter(matchesPreferences);
    const others = recipes.filter(r => !matchesPreferences(r));
    
    return [...matching, ...others];
  }, [dbRecipes, userPreferences, searchQuery, selectedBrand]);
  
  // Count how many recipes match preferences
  const matchingCount = useMemo(() => {
    if (userPreferences.length === 0) return 0;
    return filteredRecipes.filter(recipe => {
      const tags = recipe.dietaryTags || [];
      return userPreferences.some((pref: string) => 
        tags.some((tag: string) => 
          tag.toLowerCase().includes(pref.toLowerCase()) ||
          pref.toLowerCase().includes(tag.toLowerCase())
        )
      );
    }).length;
  }, [filteredRecipes, userPreferences]);
  
  // Auto-show AI generator if ?ai=true in URL
  useEffect(() => {
    if (searchParams.get('ai') === 'true') {
      setShowAIGenerator(true);
    }
  }, [searchParams]);
  
  // Load real recipes from database
  useEffect(() => {
    loadRecipes();
  }, []);
  
  const loadRecipes = async () => {
    try {
      setLoadingRecipes(true);
      const response = await recipesApi.getRecipes({ limit: 100 });
      setDbRecipes(response.recipes || []);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const getRecipeEmoji = (recipe: DBRecipe) => {
    if (recipe.brand && BRAND_EMOJIS[recipe.brand]) {
      return BRAND_EMOJIS[recipe.brand];
    }
    // Default based on category or title
    const title = recipe.title.toLowerCase();
    if (title.includes('burger') || title.includes('sandwich')) return '🍔';
    if (title.includes('chicken')) return '🍗';
    if (title.includes('taco') || title.includes('burrito')) return '🌮';
    if (title.includes('pizza')) return '🍕';
    if (title.includes('salad')) return '🥗';
    if (title.includes('bowl')) return '🥣';
    if (title.includes('fish') || title.includes('salmon')) return '🐟';
    if (title.includes('steak') || title.includes('beef')) return '🥩';
    return '🍽️';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">
            Recipe Collection
          </h1>
          <p className="text-gray-600 mt-2">
            Discover healthier versions of your favorite fast food • {dbRecipes.length} recipes
          </p>
        </div>
        <div className="mt-4 lg:mt-0">
          <button 
            className="btn btn-primary"
            onClick={() => setShowAIGenerator(!showAIGenerator)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {showAIGenerator ? 'Hide AI Generator' : 'Generate AI Recipe'}
          </button>
        </div>
      </div>

      {/* AI Recipe Generator */}
      {showAIGenerator && (
        <div className="border-t pt-6">
          <AIRecipeGenerator />
        </div>
      )}

      {/* Search and Filters */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search recipes, brands, ingredients..."
              className="input pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>
        
        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedBrand(null)}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  !selectedBrand 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Brands
              </button>
              {brands.map(brand => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(brand === selectedBrand ? null : brand)}
                  className={`px-3 py-1.5 rounded-full text-sm ${
                    brand === selectedBrand 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {BRAND_EMOJIS[brand] || '🍽️'} {brand}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Preferences Banner */}
      {userPreferences.length > 0 && (
        <div className="bg-gradient-to-r from-primary/10 to-green-100 px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="text-gray-700">
            ✨ <strong>{matchingCount}</strong> of {filteredRecipes.length} recipes match your preferences: <span className="text-primary">{userPreferences.join(', ')}</span>
          </span>
          <Link to="/profile" className="text-sm text-primary hover:underline">
            Update preferences →
          </Link>
        </div>
      )}

      {/* Recipe Collection */}
      {loadingRecipes ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-gray-600">Loading recipes...</span>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🍽️</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No recipes found</h3>
          <p className="text-gray-500">
            {searchQuery || selectedBrand 
              ? 'Try adjusting your search or filters'
              : 'Generate a custom recipe with AI!'}
          </p>
          {(searchQuery || selectedBrand) && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedBrand(null); }}
              className="btn btn-secondary mt-4"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => {
            const isMatch = userPreferences.length > 0 && recipe.dietaryTags?.some(tag =>
              userPreferences.some((pref: string) =>
                tag.toLowerCase().includes(pref.toLowerCase()) ||
                pref.toLowerCase().includes(tag.toLowerCase())
              )
            );
            
            return (
              <Link 
                key={recipe.id} 
                to={`/recipes/${recipe.id}`}
                className={`card overflow-hidden hover:shadow-lg transition-all ${
                  isMatch ? 'ring-2 ring-green-400 ring-opacity-50' : ''
                }`}
              >
                <div className="bg-gradient-to-br from-orange-50 to-red-50 h-40 flex items-center justify-center relative">
                  {recipe.imageUrl ? (
                    <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">{getRecipeEmoji(recipe)}</span>
                  )}
                  {isMatch && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      ✓ Matches
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">{recipe.title}</h3>
                  </div>
                  {recipe.brand && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {recipe.brand}
                    </span>
                  )}
                  <p className="text-gray-600 text-sm mt-2 line-clamp-2">{recipe.description}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500 mt-3">
                    <span className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      {(recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)} min
                    </span>
                    <span>🔥 {recipe.nutrition?.calories || '—'} cal</span>
                    <span className="flex items-center capitalize">
                      <ChefHat className="w-3.5 h-3.5 mr-1" />
                      {recipe.difficulty || 'Medium'}
                    </span>
                  </div>
                  {recipe.dietaryTags && recipe.dietaryTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {recipe.dietaryTags.slice(0, 3).map((tag: string, i: number) => (
                        <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                      {recipe.dietaryTags.length > 3 && (
                        <span className="text-xs text-gray-500">+{recipe.dietaryTags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecipesPage;
