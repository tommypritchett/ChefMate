import React from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Users, Heart, ShoppingCart } from 'lucide-react';

const RecipeDetailPage: React.FC = () => {
  const { id } = useParams();
  console.log('Recipe ID:', id); // Keep id usage

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recipe Image */}
        <div className="lg:col-span-2">
          <div className="bg-gray-200 rounded-lg h-96 flex items-center justify-center">
            <p className="text-gray-500">Recipe Image</p>
          </div>
        </div>

        {/* Recipe Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
              High Protein Quesarito
            </h1>
            <p className="text-gray-600">
              A healthier take on Taco Bell's Quesarito with lean ground turkey and whole wheat tortillas.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <Clock className="w-6 h-6 mx-auto text-gray-400 mb-1" />
              <div className="text-sm font-medium">35 min</div>
            </div>
            <div className="text-center">
              <Users className="w-6 h-6 mx-auto text-gray-400 mb-1" />
              <div className="text-sm font-medium">4 servings</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600 mb-1">520</div>
              <div className="text-sm font-medium">calories</div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button className="btn btn-primary w-full">
              <Heart className="w-4 h-4 mr-2" />
              Save to Favorites
            </button>
            <button className="btn btn-secondary w-full">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Shopping List
            </button>
          </div>

          {/* Nutrition Comparison */}
          <div className="card p-4">
            <h3 className="font-semibold mb-3">vs Original</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Calories</span>
                <span className="text-green-600">-130</span>
              </div>
              <div className="flex justify-between">
                <span>Protein</span>
                <span className="text-green-600">+17g</span>
              </div>
              <div className="flex justify-between">
                <span>Sodium</span>
                <span className="text-green-600">-520mg</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ingredients & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
          <ul className="space-y-2">
            <li className="flex items-center">
              <input type="checkbox" className="mr-3" />
              <span>1 lb ground turkey (93/7 lean)</span>
            </li>
            <li className="flex items-center">
              <input type="checkbox" className="mr-3" />
              <span>4 whole wheat large tortillas</span>
            </li>
            <li className="flex items-center">
              <input type="checkbox" className="mr-3" />
              <span>1 cup reduced-fat cheddar cheese</span>
            </li>
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="space-y-4">
            <li className="flex">
              <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">
                1
              </span>
              <span>Cook ground turkey in a large skillet over medium heat until browned and cooked through.</span>
            </li>
            <li className="flex">
              <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">
                2
              </span>
              <span>Season turkey with taco seasoning and add black beans. Cook for 2 minutes.</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailPage;