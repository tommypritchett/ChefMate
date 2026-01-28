import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ChefHat, Sparkles, Clock, Heart } from 'lucide-react';

const HomePage: React.FC = () => {
  const { user } = useAuthStore();

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
      description: 'Browse 100+ healthier fast food recipes',
      href: '/recipes',
      color: 'bg-orange-50 text-orange-600',
    },
    {
      icon: Clock,
      title: 'Smart Meal Planning',
      description: 'Plan meals based on your inventory and preferences',
      href: '/inventory',
      color: 'bg-green-50 text-green-600',
    },
    {
      icon: Heart,
      title: 'Saved Favorites',
      description: 'Keep track of recipes you love',
      href: '/favorites',
      color: 'bg-red-50 text-red-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-display font-bold text-gray-900">
          Welcome back, {user?.firstName || 'Chef'}! 👋
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Make healthier versions of your favorite fast food at home with AI-powered recipes,
          smart inventory management, and personalized meal planning.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-primary">0</div>
          <div className="text-gray-600">Recipes Saved</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-green-600">$0</div>
          <div className="text-gray-600">Money Saved</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-blue-600">0</div>
          <div className="text-gray-600">Meals Cooked</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-purple-600">0</div>
          <div className="text-gray-600">AI Recipes</div>
        </div>
      </div>

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

      {/* Call to Action */}
      <div className="card p-8 bg-gradient-to-r from-primary to-primary-dark text-white text-center">
        <h2 className="text-2xl font-display font-bold mb-4">
          Ready to start cooking healthier?
        </h2>
        <p className="text-primary-light mb-6">
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
    </div>
  );
};

export default HomePage;