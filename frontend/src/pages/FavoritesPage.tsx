import React, { useState } from 'react';
import { Heart, FolderPlus, X, Folder, Plus, Trash2 } from 'lucide-react';

const FavoritesPage: React.FC = () => {
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [folders, setFolders] = useState<Array<{id: string, name: string, description?: string, recipeCount: number, recipes: Array<{id: string, title: string, brand?: string, image: string}>}>>([]);
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);

  // Sample recipes that can be added to folders
  const availableRecipes = [
    { id: '1', title: 'Protein-Packed Big Mac', brand: "McDonald's", image: '🍔' },
    { id: '2', title: 'Crispy Baked KFC Chicken', brand: 'KFC', image: '🍗' },
    { id: '3', title: 'Healthy Crunchwrap Supreme', brand: 'Taco Bell', image: '🌯' },
    { id: '4', title: 'Greek Yogurt Chicken Tikka', brand: 'Crock Pot', image: '🍛' },
    { id: '5', title: 'Turkey & Sweet Potato Chili', brand: 'Crock Pot', image: '🍲' }
  ];
  
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    
    const newFolder = {
      id: Date.now().toString(),
      name: newFolderName,
      description: newFolderDescription,
      recipeCount: 0,
      recipes: []
    };
    
    setFolders([...folders, newFolder]);
    setNewFolderName('');
    setNewFolderDescription('');
    setShowNewFolderModal(false);
  };

  const addRecipeToFolder = (recipeId: string) => {
    const recipe = availableRecipes.find(r => r.id === recipeId);
    if (!recipe || !selectedFolder) return;

    setFolders(folders.map(folder => 
      folder.id === selectedFolder.id
        ? {
            ...folder,
            recipes: [...folder.recipes, recipe],
            recipeCount: folder.recipes.length + 1
          }
        : folder
    ));

    // Update selected folder state
    setSelectedFolder({
      ...selectedFolder,
      recipes: [...selectedFolder.recipes, recipe],
      recipeCount: selectedFolder.recipes.length + 1
    });

    setShowAddRecipeModal(false);
  };

  const removeRecipeFromFolder = (recipeId: string) => {
    if (!selectedFolder) return;

    const updatedFolder = {
      ...selectedFolder,
      recipes: selectedFolder.recipes.filter((r: any) => r.id !== recipeId),
      recipeCount: selectedFolder.recipes.length - 1
    };

    setFolders(folders.map(folder => 
      folder.id === selectedFolder.id ? updatedFolder : folder
    ));

    setSelectedFolder(updatedFolder);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">
            Saved Recipes
          </h1>
          <p className="text-gray-600 mt-2">
            Your favorite recipes organized in folders
          </p>
        </div>
        <button 
          onClick={() => setShowNewFolderModal(true)}
          className="btn btn-primary mt-4 lg:mt-0"
        >
          <FolderPlus className="w-4 h-4 mr-2" />
          New Folder
        </button>
      </div>

      {/* Folders Display */}
      {folders.length === 0 ? (
        /* Empty State */
        <div className="card p-12 text-center">
          <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            No saved recipes yet
          </h2>
          <p className="text-gray-500 mb-6">
            Start saving recipes you love or create folders to organize them
          </p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => setShowNewFolderModal(true)}
              className="btn btn-primary"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Create Folder
            </button>
            <a href="/recipes" className="btn btn-secondary">
              Browse Recipes
            </a>
          </div>
        </div>
      ) : (
        /* Folders Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {folders.map((folder) => (
            <div key={folder.id} className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center mr-4">
                  <Folder className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">{folder.name}</h3>
                  <p className="text-sm text-gray-500">{folder.recipeCount} recipes</p>
                </div>
              </div>
              {folder.description && (
                <p className="text-gray-600 text-sm mb-4">{folder.description}</p>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Created recently</span>
                <button 
                  onClick={() => setSelectedFolder(folder)}
                  className="btn btn-sm btn-secondary"
                >
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Create New Folder</h3>
              <button 
                onClick={() => setShowNewFolderModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Folder Name *</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="input w-full"
                  placeholder="e.g., Breakfast Favorites, Healthy Options"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  className="input w-full h-20 resize-none"
                  placeholder="Add a description for this folder..."
                  maxLength={200}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-2 p-6 border-t">
              <button 
                onClick={() => setShowNewFolderModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="btn btn-primary flex-1"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Detail Modal */}
      {selectedFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedFolder.name}</h3>
                <p className="text-sm text-gray-600">{selectedFolder.recipeCount} recipes</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowAddRecipeModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Recipe
                </button>
                <button 
                  onClick={() => setSelectedFolder(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {selectedFolder.description && (
                <p className="text-gray-600 mb-6">{selectedFolder.description}</p>
              )}

              {selectedFolder.recipes.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No recipes yet</h3>
                  <p className="text-gray-500 mb-4">Add your favorite recipes to this folder</p>
                  <button 
                    onClick={() => setShowAddRecipeModal(true)}
                    className="btn btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Recipe
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedFolder.recipes.map((recipe: any) => (
                    <div key={recipe.id} className="card p-4 hover:shadow-lg transition-shadow">
                      <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-lg h-32 mb-3 flex items-center justify-center">
                        <span className="text-4xl">{recipe.image}</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{recipe.title}</h4>
                      {recipe.brand && (
                        <p className="text-sm text-primary mb-3">{recipe.brand}</p>
                      )}
                      <div className="flex gap-2">
                        <button className="btn btn-primary btn-sm flex-1">
                          View Recipe
                        </button>
                        <button 
                          onClick={() => removeRecipeFromFolder(recipe.id)}
                          className="btn btn-secondary btn-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Recipe to Folder Modal */}
      {showAddRecipeModal && selectedFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Add Recipe to "{selectedFolder.name}"</h3>
                <p className="text-sm text-gray-600">Choose from available recipes</p>
              </div>
              <button 
                onClick={() => setShowAddRecipeModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableRecipes
                  .filter(recipe => !selectedFolder.recipes.some((r: any) => r.id === recipe.id))
                  .map((recipe) => (
                    <div 
                      key={recipe.id} 
                      className="card p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 border-gray-200 hover:border-primary"
                      onClick={() => addRecipeToFolder(recipe.id)}
                    >
                      <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-lg h-24 mb-3 flex items-center justify-center">
                        <span className="text-3xl">{recipe.image}</span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{recipe.title}</h4>
                      {recipe.brand && (
                        <p className="text-xs text-primary">{recipe.brand}</p>
                      )}
                      <div className="mt-3">
                        <button className="btn btn-primary btn-sm w-full">
                          <Plus className="w-3 h-3 mr-1" />
                          Add to Folder
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
              
              {availableRecipes.filter(recipe => !selectedFolder.recipes.some((r: any) => r.id === recipe.id)).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">All available recipes have been added to this folder!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;