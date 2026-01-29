import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ChefHat, Sparkles, Clock, Heart, ShoppingCart, Package, Loader } from 'lucide-react';
import { favoritesApi, inventoryApi, shoppingApi, recipesApi } from '../services/api';

const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState({
    savedRecipes: 0,
    inventoryItems: 0,
    shoppingLists: 0,
    totalRecipes: 0,
    loading: true
  });

  useEffect(() => {
    loadStats();
  }, [isAuthenticated]);

  const loadStats = async () => {
    try {
      // Load recipe count (public)
      const recipesRes = await recipesApi.getRecipes({ limit: 1 });
      const totalRecipes = recipesRes.pagination?.total || 0;
      
      if (isAuthenticated) {
        // Load user-specific stats
        const [favoritesRes, inventoryRes, shoppingRes] = await Promise.all([
          favoritesApi.getFavorites().catch(() => ({ savedRecipes: [] })),
          inventoryApi.getInventory().catch(() => ({ items: [] })),
          shoppingApi.getLists().catch(() => ({ lists: [] }))
        ]);
        
        setStats({
          savedRecipes: favoritesRes.savedRecipes?.length || 0,
          inventoryItems: inventoryRes.items?.length || 0,
          shoppingLists: shoppingRes.lists?.length || 0,
          totalRecipes,
          loading: false
        });
      } else {
        setStats(prev => ({
          ...prev,
          totalRecipes,
          loading: false
        }));
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const features = [
    {
      icon: Sparkles,
      title: 'AI Recipe Generation',
      description: 'Create custom healthy versions of your favorite fast food',
      href: '/recipes?ai=true',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      icon: ChefHat,
      title: 'Recipe Database',
      description: `Browse ${stats.totalRecipes}+ healthier fast food recipes`,
      href: '/recipes',
      color: 'bg-orange-50 text-orange-600',
    },
    {
      icon: Package,
      title: 'Smart Inventory',
      description: 'Track your fridge, freezer, and pantry items',
      href: '/inventory',
      color: 'bg-green-50 text-green-600',
    },
    {
      icon: ShoppingCart,
      title: 'Shopping Lists',
      description: 'Plan your grocery trips and add purchases to inventory',
      href: '/shopping',
      color: 'bg-blue-50 text-blue-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900">
          {user?.firstName ? `Welcome back, ${user.firstName}!` : 'Welcome to ChefMate'} 👋
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Make healthier versions of your favorite fast food at home with AI-powered recipes,
          smart inventory management, and seamless shopping lists.
        </p>
      </div>

      {/* Quick Stats */}
      {stats.loading ? (
        <div className="flex justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="card p-5 text-center">
            <div className="text-3xl font-bold text-primary">{stats.totalRecipes}</div>
            <div className="text-gray-600 text-sm">Recipes Available</div>
          </div>
          <div className="card p-5 text-center">
            <div className="text-3xl font-bold text-red-500">{stats.savedRecipes}</div>
            <div className="text-gray-600 text-sm">Saved Favorites</div>
          </div>
          <div className="card p-5 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.inventoryItems}</div>
            <div className="text-gray-600 text-sm">Inventory Items</div>
          </div>
          <div className="card p-5 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.shoppingLists}</div>
            <div className="text-gray-600 text-sm">Shopping Lists</div>
          </div>
        </div>
      )}

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <Link
            key={index}
            to={feature.href}
            className="card p-6 hover:shadow-lg transition-shadow cursor-pointer group"
          >
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg ${feature.color}`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mt-1">
                  {feature.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions for Logged In Users */}
      {isAuthenticated && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/inventory" className="card p-4 hover:bg-green-50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 group-hover:bg-green-200">
                📦
              </div>
              <div>
                <div className="font-medium text-gray-900">Update Inventory</div>
                <div className="text-sm text-gray-500">Add items to your fridge</div>
              </div>
            </div>
          </Link>
          <Link to="/shopping" className="card p-4 hover:bg-blue-50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-200">
                🛒
              </div>
              <div>
                <div className="font-medium text-gray-900">Shopping Lists</div>
                <div className="text-sm text-gray-500">Plan your grocery run</div>
              </div>
            </div>
          </Link>
          <Link to="/profile" className="card p-4 hover:bg-purple-50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 group-hover:bg-purple-200">
                ⚙️
              </div>
              <div>
                <div className="font-medium text-gray-900">Preferences</div>
                <div className="text-sm text-gray-500">Set dietary preferences</div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Call to Action */}
      <div className="card p-8 bg-gradient-to-r from-primary to-primary-dark text-white text-center">
        <h2 className="text-2xl font-display font-bold mb-4">
          Ready to start cooking healthier?
        </h2>
        <p className="text-primary-light mb-6 opacity-90">
          Generate your first AI recipe or browse our curated collection
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/recipes?ai=true"
            className="btn bg-white text-primary hover:bg-gray-100"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Recipe
          </Link>
          <Link
            to="/recipes"
            className="btn border-2 border-white text-white hover:bg-white hover:text-primary"
          >
            <ChefHat className="w-4 h-4 mr-2" />
            Browse Recipes
          </Link>
        </div>
      </div>

      {/* Not logged in prompt */}
      {!isAuthenticated && (
        <div className="card p-6 bg-yellow-50 border border-yellow-200">
          <div className="flex items-start gap-4">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="font-semibold text-gray-900">Create an account to unlock all features</h3>
              <p className="text-gray-600 mt-1">
                Save your favorite recipes, track your inventory, create shopping lists, and get personalized recommendations.
              </p>
              <div className="flex gap-3 mt-4">
                <Link to="/register" className="btn btn-primary btn-sm">Sign Up Free</Link>
                <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
