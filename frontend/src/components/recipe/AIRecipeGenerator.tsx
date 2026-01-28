import React, { useState } from 'react';
import { Sparkles, Clock, Users, ChefHat, Loader, Heart, ShoppingCart, Bookmark } from 'lucide-react';
import { aiApi, favoritesApi, shoppingApi } from '../../services/api';
import { Recipe } from '../../types';
import { generateMockRecipe } from '../../services/mockRecipes';

const AIRecipeGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [servings, setServings] = useState(2);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('medium');
  const [maxTime, setMaxTime] = useState(45);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const quickPrompts = [
    "McDonald's Big Mac with 93% lean beef & Greek yogurt sauce",
    "KFC Original Recipe Chicken baked with herbs",
    "Taco Bell Crunchwrap with ground turkey & Greek yogurt", 
    "Burger King Whopper with plant-based protein",
    "Pizza Hut Pizza with cauliflower crust & turkey pepperoni",
    "Subway Italian BMT with lean deli meats",
    "Domino's Buffalo Wings baked not fried",
    "Five Guys Cheeseburger with grass-fed beef"
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a recipe prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Use mock recipes for testing to save AI tokens
      const useMockData = true; // Set to false to use real AI
      
      if (useMockData) {
        // Simulate AI thinking time
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        
        const mockRecipe = generateMockRecipe(prompt.trim());
        
        // Create a recipe object that matches the expected format
        const recipe: Recipe = {
          id: 'mock-' + Date.now(),
          title: mockRecipe.title,
          slug: mockRecipe.title.toLowerCase().replace(/\s+/g, '-'),
          description: mockRecipe.description,
          brand: mockRecipe.brand,
          category: null,
          originalItemName: mockRecipe.originalItem,
          ingredients: mockRecipe.ingredients,
          instructions: mockRecipe.instructions,
          prepTimeMinutes: mockRecipe.prepTime,
          cookTimeMinutes: mockRecipe.cookTime,
          totalTimeMinutes: mockRecipe.prepTime + mockRecipe.cookTime,
          servings: mockRecipe.servings,
          difficulty: mockRecipe.difficulty,
          nutrition: mockRecipe.nutrition,
          originalNutrition: mockRecipe.originalNutrition,
          dietaryTags: mockRecipe.dietaryTags,
          isAiGenerated: true,
          imageUrl: null,
          imageUrls: [],
          viewCount: 0,
          saveCount: 0,
          makeCount: 0,
          averageRating: null,
          isPublished: true,
          isFeatured: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        setGeneratedRecipe(recipe);
      } else {
        // Use real AI API
        const result = await aiApi.generateRecipe({
          prompt: prompt.trim(),
          servings,
          dietaryRestrictions,
        });

        setGeneratedRecipe(result.recipe);
      }
    } catch (err: any) {
      console.error('Recipe generation error:', err);
      
      if (err.response?.status === 401) {
        setError('Please log in to generate recipes');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || 'Invalid request. Please check your inputs.');
      } else if (err.message.includes('Network Error') || err.code === 'ERR_NETWORK') {
        setError('Connection error. Please check if the backend is running.');
      } else {
        setError(err.response?.data?.error || 'Failed to generate recipe. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickPrompt = (quickPrompt: string) => {
    setPrompt(quickPrompt);
  };

  const toggleDietaryRestriction = (restriction: string) => {
    setDietaryRestrictions(prev =>
      prev.includes(restriction)
        ? prev.filter(r => r !== restriction)
        : [...prev, restriction]
    );
  };

  const handleSaveRecipe = async () => {
    if (!generatedRecipe) return;
    
    try {
      console.log('Attempting to save recipe:', generatedRecipe.id);
      const result = await favoritesApi.saveRecipe({
        recipeId: generatedRecipe.id,
        notes: 'Saved from AI Generator'
      });
      console.log('Save recipe result:', result);
      setIsSaved(true);
      // Show success feedback
      alert('Recipe saved successfully!');
    } catch (err) {
      console.error('Failed to save recipe:', err);
      // Show error feedback
      alert('Failed to save recipe. Please try again.');
    }
  };

  const handleAddToShoppingList = async () => {
    if (!generatedRecipe) return;
    
    setIsAddingToCart(true);
    try {
      // Create a shopping list for this recipe
      const list = await shoppingApi.createList({
        name: `${generatedRecipe.title} Ingredients`,
        description: `Shopping list for ${generatedRecipe.title}`,
        sourceType: 'recipe',
        sourceRecipeId: generatedRecipe.id
      });
      
      // Note: Adding individual items would require additional API calls
      // For now, just create the list
      console.log('Shopping list created:', list);
    } catch (err) {
      console.error('Failed to create shopping list:', err);
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <Sparkles className="w-8 h-8 text-purple-600" />
          AI Recipe Generator
        </h1>
        <p className="text-gray-600">
          Create healthier versions of your favorite fast food using AI
        </p>
      </div>

      {/* Quick Prompts */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4">Popular Fast Food Items</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {quickPrompts.map((quickPrompt) => (
            <button
              key={quickPrompt}
              onClick={() => handleQuickPrompt(quickPrompt)}
              className="btn btn-secondary btn-sm text-sm"
            >
              {quickPrompt}
            </button>
          ))}
        </div>
      </div>

      {/* Main Form */}
      <div className="card p-6 space-y-6">
        {/* Recipe Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What would you like to recreate?
          </label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., McDonald's Big Mac, KFC Fried Chicken..."
            className="input w-full"
            disabled={isGenerating}
          />
        </div>

        {/* Recipe Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Servings
            </label>
            <select
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              className="input w-full"
              disabled={isGenerating}
            >
              {[1, 2, 3, 4, 5, 6, 8].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ChefHat className="w-4 h-4 inline mr-1" />
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="input w-full"
              disabled={isGenerating}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Max Time (minutes)
            </label>
            <select
              value={maxTime}
              onChange={(e) => setMaxTime(Number(e.target.value))}
              className="input w-full"
              disabled={isGenerating}
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
            </select>
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dietary Preferences (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {['high-protein', 'low-carb', 'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'low-sodium'].map(restriction => (
              <button
                key={restriction}
                onClick={() => toggleDietaryRestriction(restriction)}
                className={`btn btn-sm ${
                  dietaryRestrictions.includes(restriction) 
                    ? 'btn-primary' 
                    : 'btn-secondary'
                }`}
                disabled={isGenerating}
              >
                {restriction}
              </button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="btn btn-primary w-full"
        >
          {isGenerating ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Generating Recipe... (this takes 3-10 seconds)
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate AI Recipe
            </>
          )}
        </button>
      </div>

      {/* Generated Recipe Display */}
      {generatedRecipe && (
        <div className="card p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{generatedRecipe.title}</h2>
              {generatedRecipe.brand && (
                <p className="text-primary font-medium">Healthier version of {generatedRecipe.brand} original</p>
              )}
              <p className="text-gray-600 mt-2">{generatedRecipe.description}</p>
            </div>
            <div className="text-right space-y-2">
              <div className="bg-green-50 px-3 py-1 rounded-full">
                <span className="text-green-700 font-medium">AI Generated</span>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveRecipe}
                  disabled={isSaved}
                  className={`btn btn-sm ${isSaved ? 'btn-secondary' : 'btn-primary'}`}
                  title="Save to Favorites"
                >
                  {isSaved ? <Bookmark className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                </button>
                
                <button
                  onClick={handleAddToShoppingList}
                  disabled={isAddingToCart}
                  className="btn btn-sm btn-secondary"
                  title="Add to Shopping List"
                >
                  {isAddingToCart ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Recipe Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{(generatedRecipe.prepTimeMinutes || 0) + (generatedRecipe.cookTimeMinutes || 0)}</div>
              <div className="text-sm text-gray-600">Total Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{generatedRecipe.servings}</div>
              <div className="text-sm text-gray-600">Servings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 capitalize">{generatedRecipe.difficulty}</div>
              <div className="text-sm text-gray-600">Difficulty</div>
            </div>
            <div className="text-center">
              {generatedRecipe.nutrition && typeof generatedRecipe.nutrition === 'object' && (
                <>
                  <div className="text-2xl font-bold text-gray-900">{generatedRecipe.nutrition.calories}</div>
                  <div className="text-sm text-gray-600">Calories</div>
                </>
              )}
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {generatedRecipe.ingredients && Array.isArray(generatedRecipe.ingredients) && 
                generatedRecipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">{ingredient.amount} {ingredient.unit}</span>
                    <span className="ml-2">{ingredient.name}</span>
                    {ingredient.notes && (
                      <span className="ml-1 text-sm text-gray-500">({ingredient.notes})</span>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Instructions</h3>
            <div className="space-y-3">
              {generatedRecipe.instructions && Array.isArray(generatedRecipe.instructions) &&
                generatedRecipe.instructions.map((instruction, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-medium">
                      {instruction.step}
                    </div>
                    <div className="flex-1">
                      <p>{instruction.text}</p>
                      {(instruction as any).tips && (
                        <p className="text-sm text-gray-600 mt-1 italic">💡 {(instruction as any).tips}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Nutrition Comparison */}
          {generatedRecipe.nutrition && generatedRecipe.originalNutrition && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Nutrition Comparison</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Your Healthy Version</h4>
                  <div className="space-y-1 text-sm">
                    <div>Calories: {generatedRecipe.nutrition.calories}</div>
                    <div>Protein: {generatedRecipe.nutrition.protein}g</div>
                    <div>Carbs: {generatedRecipe.nutrition.carbs}g</div>
                    <div>Fat: {generatedRecipe.nutrition.fat}g</div>
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">Original Fast Food</h4>
                  <div className="space-y-1 text-sm">
                    <div>Calories: {generatedRecipe.originalNutrition.calories}</div>
                    <div>Protein: {generatedRecipe.originalNutrition.protein}g</div>
                    <div>Carbs: {generatedRecipe.originalNutrition.carbs}g</div>
                    <div>Fat: {generatedRecipe.originalNutrition.fat}g</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tips & Health Benefits */}
          {(generatedRecipe as any).tips && (generatedRecipe as any).tips.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">💡 Health Tips & Benefits</h3>
              <div className="space-y-2">
                {(generatedRecipe as any).tips.map((tip: string, index: number) => (
                  <div key={index} className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingredient Substitutions */}
          {(generatedRecipe as any).substitutions && (generatedRecipe as any).substitutions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">🔄 Ingredient Substitutions</h3>
              <div className="space-y-3">
                {(generatedRecipe as any).substitutions.map((sub: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3">
                    <h4 className="font-medium text-gray-800">{sub.ingredient}</h4>
                    <div className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Alternatives: </span>
                      {sub.alternatives.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIRecipeGenerator;