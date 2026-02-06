import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Clock, Users, Heart, ShoppingCart, ArrowLeft, Loader, ChefHat, Bookmark, CheckCircle } from 'lucide-react';
import { recipesApi, favoritesApi, shoppingApi } from '../services/api';
import { Recipe } from '../types';

const RecipeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isMakingIt, setIsMakingIt] = useState(false);
  const [timesMade, setTimesMade] = useState(0);

  useEffect(() => {
    if (id) {
      loadRecipe(id);
    }
  }, [id]);

  const loadRecipe = async (recipeId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await recipesApi.getRecipe(recipeId);
      setRecipe(response.recipe);
    } catch (err: any) {
      console.error('Failed to load recipe:', err);
      setError('Recipe not found or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!recipe) return;
    
    setIsSaving(true);
    try {
      await favoritesApi.saveRecipe({
        recipeId: recipe.id,
        notes: ''
      });
      setIsSaved(true);
    } catch (err) {
      console.error('Failed to save recipe:', err);
      toast.error('Please log in to save recipes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToShoppingList = async () => {
    if (!recipe) return;
    
    setIsAddingToCart(true);
    try {
      // Create a new shopping list - backend auto-populates ingredients from recipe
      const list = await shoppingApi.createList({
        name: `${recipe.title} Ingredients`,
        description: `Shopping list for ${recipe.title}`,
        sourceType: 'recipe',
        sourceRecipeId: recipe.id
      });
      
      const itemCount = list.list?.items?.length || 0;
      toast.success(
        `Added ${itemCount} ingredients to shopping list!`,
        { 
          icon: '🛒',
          duration: 4000,
        }
      );
    } catch (err) {
      console.error('Failed to add to shopping list:', err);
      toast.error('Please log in to create shopping lists');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleMadeIt = async () => {
    if (!recipe) return;
    
    setIsMakingIt(true);
    try {
      const result = await favoritesApi.madeIt(recipe.id);
      setTimesMade(result.timesMade);
      setIsSaved(true); // Auto-saved when marking as made
      toast.success(`Nice! You've made this ${result.timesMade} time${result.timesMade > 1 ? 's' : ''}! 🎉`, {
        duration: 3000,
      });
    } catch (err) {
      console.error('Failed to mark as made:', err);
      toast.error('Please log in to track your cooking');
    } finally {
      setIsMakingIt(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="card p-12 text-center">
        <ChefHat className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Recipe Not Found</h2>
        <p className="text-gray-500 mb-6">{error || 'This recipe could not be loaded.'}</p>
        <Link to="/recipes" className="btn btn-primary">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Recipes
        </Link>
      </div>
    );
  }

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const instructions = Array.isArray(recipe.instructions) ? recipe.instructions : [];
  const nutrition = recipe.nutrition && typeof recipe.nutrition === 'object' ? recipe.nutrition : null;
  const originalNutrition = recipe.originalNutrition && typeof recipe.originalNutrition === 'object' ? recipe.originalNutrition : null;

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link to="/recipes" className="inline-flex items-center text-gray-600 hover:text-primary">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Recipes
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recipe Image */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-lg h-80 sm:h-96 flex items-center justify-center overflow-hidden">
            {recipe.imageUrl ? (
              <img 
                src={recipe.imageUrl} 
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-8xl">🍽️</span>
            )}
          </div>
          
          {recipe.isAiGenerated && (
            <div className="mt-3 inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
              ✨ AI Generated Recipe
            </div>
          )}
        </div>

        {/* Recipe Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 mb-2">
              {recipe.title}
            </h1>
            {recipe.brand && (
              <p className="text-primary font-medium mb-2">
                Healthier version of {recipe.brand} original
              </p>
            )}
            <p className="text-gray-600">
              {recipe.description}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Clock className="w-5 h-5 mx-auto text-gray-400 mb-1" />
              <div className="text-sm font-medium">
                {(recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)} min
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Users className="w-5 h-5 mx-auto text-gray-400 mb-1" />
              <div className="text-sm font-medium">{recipe.servings} servings</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-green-600 mb-1">
                {nutrition?.calories || '—'}
              </div>
              <div className="text-xs font-medium text-gray-500">calories</div>
            </div>
          </div>

          {/* Cost Comparison */}
          {recipe.estimatedCostPerServing && recipe.originalPrice && recipe.costSavingsPercent && (
            <div className="card p-4 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                💰 Cost Comparison
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">🏠 Home-cooked (per serving)</span>
                  <span className="text-lg font-bold text-green-600">
                    ${recipe.estimatedCostPerServing.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">🍔 {recipe.brand || 'Restaurant'}</span>
                  <span className="text-lg font-medium text-gray-800">
                    ${recipe.originalPrice.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-green-200 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Your Savings</span>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-700">
                        ${(recipe.originalPrice - recipe.estimatedCostPerServing).toFixed(2)}
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        ({recipe.costSavingsPercent}% less)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Ingredient cost breakdown */}
              {recipe.ingredientCosts && (
                <div className="mt-4 pt-3 border-t border-green-200">
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-green-700 hover:text-green-800 font-medium">
                      📋 View ingredient cost breakdown
                    </summary>
                    <div className="mt-3 space-y-1 text-xs text-gray-600">
                      {(() => {
                        try {
                          const costs = typeof recipe.ingredientCosts === 'string' 
                            ? JSON.parse(recipe.ingredientCosts) 
                            : recipe.ingredientCosts;
                          return costs.breakdown?.map((item: string, index: number) => (
                            <div key={index} className="pl-2 border-l-2 border-green-200">
                              {item}
                            </div>
                          ));
                        } catch (e) {
                          return <div className="text-gray-500">Cost breakdown unavailable</div>;
                        }
                      })()}
                      <div className="pt-2 text-green-600 font-medium">
                        💡 Tip: You'll have leftovers for more meals!
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}

          {/* Difficulty */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Difficulty:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
              recipe.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
              recipe.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {recipe.difficulty || 'Medium'}
            </span>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button 
              onClick={handleSaveRecipe}
              disabled={isSaved || isSaving}
              className={`btn w-full ${isSaved ? 'btn-secondary' : 'btn-primary'}`}
            >
              {isSaving ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : isSaved ? (
                <Bookmark className="w-4 h-4 mr-2" />
              ) : (
                <Heart className="w-4 h-4 mr-2" />
              )}
              {isSaved ? 'Saved!' : 'Save to Favorites'}
            </button>
            <button 
              onClick={handleAddToShoppingList}
              disabled={isAddingToCart}
              className="btn btn-secondary w-full"
            >
              {isAddingToCart ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShoppingCart className="w-4 h-4 mr-2" />
              )}
              Add to Shopping List
            </button>
            <button 
              onClick={handleMadeIt}
              disabled={isMakingIt}
              className="btn btn-secondary w-full border-green-300 hover:bg-green-50"
            >
              {isMakingIt ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              )}
              I Made This!{timesMade > 0 && ` (${timesMade})`}
            </button>
          </div>

          {/* Nutrition Comparison */}
          {nutrition && originalNutrition && (
            <div className="card p-4">
              <h3 className="font-semibold mb-3">vs Original</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Calories</span>
                  <span className={originalNutrition.calories > nutrition.calories ? 'text-green-600' : 'text-red-600'}>
                    {originalNutrition.calories > nutrition.calories ? '-' : '+'}
                    {Math.abs(originalNutrition.calories - nutrition.calories)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Protein</span>
                  <span className={nutrition.protein > originalNutrition.protein ? 'text-green-600' : 'text-red-600'}>
                    {nutrition.protein > originalNutrition.protein ? '+' : '-'}
                    {Math.abs(nutrition.protein - originalNutrition.protein)}g
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Fat</span>
                  <span className={originalNutrition.fat > nutrition.fat ? 'text-green-600' : 'text-red-600'}>
                    {originalNutrition.fat > nutrition.fat ? '-' : '+'}
                    {Math.abs(originalNutrition.fat - nutrition.fat)}g
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Dietary Tags */}
          {recipe.dietaryTags && recipe.dietaryTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recipe.dietaryTags.map((tag: string, i: number) => (
                <span key={i} className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full Nutrition */}
      {nutrition && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Nutrition per Serving</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{nutrition.calories}</div>
              <div className="text-xs text-gray-500">Calories</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{nutrition.protein}g</div>
              <div className="text-xs text-gray-500">Protein</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{nutrition.carbs}g</div>
              <div className="text-xs text-gray-500">Carbs</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{nutrition.fat}g</div>
              <div className="text-xs text-gray-500">Fat</div>
            </div>
            {nutrition.fiber && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{nutrition.fiber}g</div>
                <div className="text-xs text-gray-500">Fiber</div>
              </div>
            )}
            {nutrition.sodium && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{nutrition.sodium}mg</div>
                <div className="text-xs text-gray-500">Sodium</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ingredients & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
          {ingredients.length === 0 ? (
            <p className="text-gray-500">No ingredients listed.</p>
          ) : (
            <ul className="space-y-3">
              {ingredients.map((ingredient: any, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 rounded" />
                  <span className="flex-1">
                    <span className="font-medium">{ingredient.amount} {ingredient.unit}</span>
                    {' '}{ingredient.name}
                    {ingredient.notes && (
                      <span className="text-gray-500 text-sm"> ({ingredient.notes})</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          {instructions.length === 0 ? (
            <p className="text-gray-500">No instructions listed.</p>
          ) : (
            <ol className="space-y-4">
              {instructions.map((instruction: any, index: number) => (
                <li key={index} className="flex gap-4">
                  <span className="bg-primary text-white rounded-full w-7 h-7 flex items-center justify-center text-sm flex-shrink-0">
                    {instruction.step || index + 1}
                  </span>
                  <div className="flex-1">
                    <p>{instruction.text}</p>
                    {instruction.time && (
                      <p className="text-sm text-gray-500 mt-1">⏱️ {instruction.time} min</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailPage;
