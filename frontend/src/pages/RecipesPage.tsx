import React, { useState } from 'react';
import { Search, Filter, Sparkles, X, Clock, Users, ChefHat, Heart, ShoppingCart } from 'lucide-react';
import AIRecipeGenerator from '../components/recipe/AIRecipeGenerator';

interface Recipe {
  title: string;
  brand: string;
  description: string;
  time: string;
  calories: number;
  difficulty: string;
  image: string;
  ingredients?: string[];
  instructions?: string[];
}

const RecipesPage: React.FC = () => {
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const recipeData: Recipe[] = [
    {
      title: "Protein-Packed Big Mac",
      brand: "McDonald's",
      description: "93% lean ground beef, Greek yogurt special sauce, whole wheat buns",
      time: "25 min",
      calories: 420,
      difficulty: "Medium",
      image: "🍔",
      ingredients: [
        "93% lean ground beef (0.75 lbs)",
        "Greek yogurt (0.5 cup)",
        "Whole wheat burger buns (2 pieces)",
        "Romaine lettuce (2 cups, shredded)",
        "Tomatoes (2 medium, sliced)",
        "Red onion (0.25 cup, thinly sliced)",
        "Reduced-fat cheddar (2 slices)",
        "Dill pickles (8 slices)",
        "Dijon mustard (1 tbsp)",
        "Apple cider vinegar (1 tsp)"
      ],
      instructions: [
        "Prepare Greek yogurt special sauce by mixing yogurt, mustard, vinegar, and spices. Refrigerate for 10 minutes.",
        "Season ground beef with salt and pepper. Form into 4 thin patties.",
        "Cook patties in non-stick skillet over medium-high heat for 2-3 minutes per side until well-browned.",
        "Toast whole wheat buns until golden brown.",
        "Assemble burgers with sauce, lettuce, tomato, onion, beef patty, cheese, pickles, and top bun."
      ]
    },
    {
      title: "Crispy Baked KFC Chicken",
      brand: "KFC",
      description: "Air-fried chicken thighs with 11 herbs & spices, no deep frying",
      time: "45 min", 
      calories: 380,
      difficulty: "Medium",
      image: "🍗",
      ingredients: [
        "Chicken thighs, skin removed (2 lbs)",
        "Greek yogurt (1 cup)",
        "Whole wheat panko breadcrumbs (1.5 cups)",
        "Almond flour (0.5 cup)",
        "Smoked paprika (2 tsp)",
        "Garlic powder (1 tsp)",
        "Onion powder (1 tsp)",
        "Dried thyme (1 tsp)",
        "Dried oregano (1 tsp)",
        "Sea salt (1 tsp)"
      ],
      instructions: [
        "Marinate chicken in Greek yogurt with half the seasonings for 2+ hours.",
        "Preheat oven to 425°F. Line baking sheet with wire rack.",
        "Mix panko, almond flour, and remaining spices for coating.",
        "Coat marinated chicken thoroughly in herb mixture.",
        "Bake for 35-40 minutes until internal temperature reaches 165°F and coating is golden."
      ]
    },
    {
      title: "Healthy Crunchwrap Supreme",
      brand: "Taco Bell",
      description: "Whole grain tortilla, lean ground turkey, Greek yogurt crema",
      time: "20 min",
      calories: 450,
      difficulty: "Easy",
      image: "🌯",
      ingredients: [
        "Large whole grain tortillas (4 pieces)",
        "Ground turkey 93% lean (1 lb)",
        "Greek yogurt (1 cup)",
        "Black beans (1 can, drained)",
        "Reduced-fat Mexican cheese (1 cup)",
        "Romaine lettuce (2 cups, chopped)",
        "Tomatoes (2 medium, diced)",
        "Avocado (1 large, sliced)",
        "Lime juice (2 tbsp)",
        "Cumin (1 tsp)"
      ],
      instructions: [
        "Cook ground turkey with cumin and seasonings until browned.",
        "Mix Greek yogurt with lime juice for crema.",
        "Warm tortillas and layer with turkey, beans, cheese, lettuce, tomatoes.",
        "Add yogurt crema and avocado.",
        "Fold tortilla edges and cook in skillet until crispy on both sides."
      ]
    },
    {
      title: "Guilt-Free Whopper",
      brand: "Burger King",
      description: "Plant-based patty option, avocado spread, multigrain bun",
      time: "15 min",
      calories: 390,
      difficulty: "Easy", 
      image: "🍔",
      ingredients: [
        "Plant-based burger patties (2 pieces)",
        "Multigrain buns (2 pieces)",
        "Avocado (1 large, mashed)",
        "Romaine lettuce (4 leaves)",
        "Tomato (1 large, sliced)",
        "Red onion (4 slices)",
        "Pickles (6 slices)",
        "Dijon mustard (1 tbsp)",
        "Lime juice (1 tsp)"
      ],
      instructions: [
        "Cook plant-based patties according to package instructions.",
        "Toast multigrain buns until lightly golden.",
        "Mash avocado with lime juice and spread on buns.",
        "Layer with lettuce, tomato, onion, cooked patty, pickles.",
        "Add mustard and assemble burger."
      ]
    },
    {
      title: "Cauliflower Crust Pizza",
      brand: "Pizza Hut",
      description: "Low-carb cauliflower base, part-skim mozzarella, turkey pepperoni",
      time: "35 min",
      calories: 320,
      difficulty: "Medium",
      image: "🍕",
      ingredients: [
        "Cauliflower crust (1 pre-made or homemade)",
        "Part-skim mozzarella (1 cup, shredded)",
        "Turkey pepperoni (3 oz)",
        "Pizza sauce, low sodium (0.5 cup)",
        "Bell peppers (1, sliced)",
        "Red onion (0.5, sliced)",
        "Fresh basil (0.25 cup)",
        "Italian seasoning (1 tsp)",
        "Garlic powder (0.5 tsp)"
      ],
      instructions: [
        "Preheat oven to 450°F.",
        "Spread pizza sauce evenly on cauliflower crust.",
        "Sprinkle with mozzarella cheese and seasonings.",
        "Add turkey pepperoni, bell peppers, and red onion.",
        "Bake for 12-15 minutes until cheese is melted and edges are crispy. Garnish with fresh basil."
      ]
    },
    {
      title: "Baked Sweet Potato Fries",
      brand: "McDonald's",
      description: "Crispy oven-baked with Greek yogurt aioli, paprika seasoning",
      time: "30 min",
      calories: 180,
      difficulty: "Easy",
      image: "🍟",
      ingredients: [
        "Sweet potatoes (2 large, cut into fries)",
        "Olive oil (2 tbsp)",
        "Smoked paprika (1 tsp)",
        "Garlic powder (0.5 tsp)",
        "Sea salt (0.5 tsp)",
        "Greek yogurt (0.5 cup)",
        "Lemon juice (1 tbsp)",
        "Fresh chives (2 tbsp, chopped)"
      ],
      instructions: [
        "Preheat oven to 425°F and line baking sheet with parchment.",
        "Toss cut sweet potatoes with olive oil and seasonings.",
        "Arrange in single layer on baking sheet.",
        "Bake for 25-30 minutes, flipping halfway through.",
        "Make aioli by mixing Greek yogurt with lemon juice and chives. Serve fries with aioli."
      ]
    }
  ];

  const crockPotRecipes: Recipe[] = [
    {
      title: "Greek Yogurt Chicken Tikka",
      brand: "Crock Pot Meal Prep",
      description: "High-protein chicken marinated in Greek yogurt and spices, slow-cooked to perfection",
      time: "6 hours",
      calories: 320,
      difficulty: "Easy",
      image: "🍛",
      ingredients: [
        "Chicken breasts, boneless (2 lbs)",
        "Greek yogurt, plain (1 cup)",
        "Garam masala (2 tsp)",
        "Turmeric (1 tsp)",
        "Cumin powder (1 tsp)",
        "Coriander powder (1 tsp)",
        "Garlic, minced (4 cloves)",
        "Ginger, fresh grated (1 tbsp)",
        "Tomato paste (2 tbsp)",
        "Coconut milk, light (1 can)",
        "Onion, diced (1 large)",
        "Bell peppers (2, sliced)"
      ],
      instructions: [
        "Marinate chicken in Greek yogurt, garam masala, turmeric, cumin, coriander, garlic, and ginger for at least 2 hours.",
        "Add marinated chicken and all ingredients to crock pot.",
        "Cook on LOW for 6 hours or HIGH for 3 hours until chicken is tender.",
        "Shred chicken and mix back into sauce.",
        "Serve over brown rice or quinoa. Perfect for meal prep - stores for 5 days in fridge."
      ]
    },
    {
      title: "Turkey & Sweet Potato Chili",
      brand: "Crock Pot Meal Prep", 
      description: "93% lean ground turkey, sweet potatoes, black beans, perfect for meal prep",
      time: "4 hours",
      calories: 280,
      difficulty: "Easy",
      image: "🍲",
      ingredients: [
        "Ground turkey, 93% lean (2 lbs)",
        "Sweet potatoes, cubed (2 large)",
        "Black beans, canned (2 cans)",
        "Kidney beans, canned (1 can)",
        "Diced tomatoes, canned (28 oz)",
        "Onion, diced (1 large)",
        "Bell pepper, diced (2)",
        "Chili powder (2 tbsp)",
        "Cumin (1 tbsp)",
        "Smoked paprika (1 tsp)",
        "Low-sodium chicken broth (2 cups)",
        "Greek yogurt for serving (1 cup)"
      ],
      instructions: [
        "Brown ground turkey in a skillet with onions and peppers.",
        "Add browned turkey mixture to crock pot with all remaining ingredients except Greek yogurt.",
        "Cook on LOW for 4 hours until sweet potatoes are tender.",
        "Adjust seasoning to taste and add more broth if needed.",
        "Serve topped with Greek yogurt. Perfect for freezing in individual portions."
      ]
    },
    {
      title: "Protein-Packed Beef Stew",
      brand: "Crock Pot Meal Prep",
      description: "Lean beef chunks, carrots, celery, quinoa for extra protein and fiber", 
      time: "8 hours",
      calories: 350,
      difficulty: "Medium",
      image: "🥩",
      ingredients: [
        "Beef chuck roast, lean, cubed (2 lbs)",
        "Quinoa, uncooked (1 cup)",
        "Carrots, sliced (4 large)",
        "Celery, chopped (4 stalks)",
        "Potatoes, cubed (3 medium)",
        "Onion, diced (1 large)",
        "Low-sodium beef broth (4 cups)",
        "Tomato paste (3 tbsp)",
        "Worcestershire sauce (2 tbsp)",
        "Dried thyme (2 tsp)",
        "Bay leaves (2)",
        "Salt and pepper to taste"
      ],
      instructions: [
        "Season beef cubes with salt and pepper, then brown in a skillet (optional for better flavor).",
        "Add all ingredients except quinoa to crock pot.",
        "Cook on LOW for 7 hours until beef is tender.",
        "Add quinoa in the last hour of cooking.",
        "Remove bay leaves before serving. Stores well for meal prep up to 4 days."
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">
            Recipe Collection
          </h1>
          <p className="text-gray-600 mt-2">
            Discover healthier versions of your favorite fast food
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
              placeholder="Search recipes..."
              className="input pl-10 w-full"
            />
          </div>
          <button className="btn btn-secondary">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Recipe Collection */}
      <div className="space-y-8">
        {/* Featured Fast Food Recreations */}
        <div>
          <h2 className="text-xl font-semibold mb-4">🍔 Fast Food Classics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipeData.map((recipe, i) => (
              <div key={i} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-lg h-48 mb-4 flex items-center justify-center">
                  <span className="text-6xl">{recipe.image}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{recipe.title}</h3>
                    <span className="text-xs bg-primary text-white px-2 py-1 rounded-full">{recipe.brand}</span>
                  </div>
                  <p className="text-gray-600 text-sm">{recipe.description}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>⏱️ {recipe.time}</span>
                    <span>🔥 {recipe.calories} cal</span>
                    <span>👨‍🍳 {recipe.difficulty}</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    console.log('Fast food recipe clicked:', recipe.title);
                    setSelectedRecipe(recipe);
                  }}
                  className="btn btn-primary btn-sm w-full mt-4"
                >
                  View Recipe
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Crock Pot Meal Prep Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">🥘 Crock Pot Meal Prep</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {crockPotRecipes.map((recipe, i) => (
              <div key={i} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-lg h-32 mb-4 flex items-center justify-center">
                  <span className="text-4xl">{recipe.image}</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{recipe.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{recipe.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>🕒 {recipe.time}</span>
                  <span>🔥 {recipe.calories} cal</span>
                  <span>👨‍🍳 {recipe.difficulty}</span>
                </div>
                <button 
                  onClick={() => {
                    console.log('Crock pot recipe clicked:', recipe.title);
                    setSelectedRecipe(recipe);
                  }}
                  className="btn btn-primary btn-sm w-full"
                >
                  View Recipe
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recipe Detail Modal */}
      {selectedRecipe && (() => {
        console.log('Selected recipe for modal:', selectedRecipe);
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedRecipe.title}</h2>
                  <p className="text-primary font-medium">Healthier version of {selectedRecipe.brand} original</p>
                </div>
              <button 
                onClick={() => setSelectedRecipe(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Recipe Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="flex items-center justify-center text-primary mb-1">
                    <Clock className="w-5 h-5 mr-1" />
                  </div>
                  <div className="text-lg font-bold text-gray-900">{selectedRecipe.time}</div>
                  <div className="text-sm text-gray-600">Total Time</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center text-primary mb-1">
                    <Users className="w-5 h-5 mr-1" />
                  </div>
                  <div className="text-lg font-bold text-gray-900">2</div>
                  <div className="text-sm text-gray-600">Servings</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center text-primary mb-1">
                    <ChefHat className="w-5 h-5 mr-1" />
                  </div>
                  <div className="text-lg font-bold text-gray-900">{selectedRecipe.difficulty}</div>
                  <div className="text-sm text-gray-600">Difficulty</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center text-primary mb-1">
                    🔥
                  </div>
                  <div className="text-lg font-bold text-gray-900">{selectedRecipe.calories}</div>
                  <div className="text-sm text-gray-600">Calories</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button className="btn btn-primary flex-1">
                  <Heart className="w-4 h-4 mr-2" />
                  Save Recipe
                </button>
                <button className="btn btn-secondary flex-1">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Shopping List
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Ingredients */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Ingredients</h3>
                  <div className="space-y-2">
                    {selectedRecipe.ingredients?.map((ingredient, index) => (
                      <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs mr-3">
                          {index + 1}
                        </div>
                        <span className="text-gray-800">{ingredient}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Instructions</h3>
                  <div className="space-y-4">
                    {selectedRecipe.instructions?.map((instruction, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-800">{instruction}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">About This Recipe</h4>
                <p className="text-blue-800">{selectedRecipe.description}</p>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};

export default RecipesPage;