import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Heart, FolderPlus, X, Folder, Plus, Trash2, Loader } from 'lucide-react';
import { favoritesApi } from '../services/api';

interface FolderType {
  id: string;
  name: string;
  description?: string;
  recipeCount: number;
  recipes: Array<{id: string, title: string, brand?: string, image: string}>;
}

interface SavedRecipeType {
  id: string;
  recipeId: string;
  personalNotes?: string;
  rating?: number;
  savedAt: string;
  recipe: {
    id: string;
    title: string;
    description?: string;
    brand?: string;
    imageUrl?: string;
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    difficulty?: string;
  };
}

const FavoritesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipeType[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'folders'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [foldersResponse, favoritesResponse] = await Promise.all([
        favoritesApi.getFolders(),
        favoritesApi.getFavorites()
      ]);
      
      const mappedFolders = (foldersResponse.folders || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        recipeCount: f.recipeCount || 0,
        recipes: []
      }));
      setFolders(mappedFolders);
      setSavedRecipes(favoritesResponse.savedRecipes || []);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      setFolders([]);
      setSavedRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsaveRecipe = async (savedRecipeId: string) => {
    try {
      await favoritesApi.unsaveRecipe(savedRecipeId);
      setSavedRecipes(savedRecipes.filter(r => r.id !== savedRecipeId));
    } catch (error) {
      console.error('Failed to unsave recipe:', error);
    }
  };
  
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    setIsCreating(true);
    try {
      await favoritesApi.createFolder({
        name: newFolderName,
        description: newFolderDescription
      });
      
      // Success feedback
      toast.success(`Created folder "${newFolderName}"!`, {
        icon: '📁'
      });
      
      await loadData();
      setNewFolderName('');
      setNewFolderDescription('');
      setShowNewFolderModal(false);
    } catch (error: any) {
      console.error('Failed to create folder:', error);
      toast.error(error.response?.data?.error || 'Failed to create folder. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const addRecipeToFolder = (recipeId: string) => {
    const savedRecipe = savedRecipes.find(r => r.recipe.id === recipeId);
    if (!savedRecipe || !selectedFolder) return;

    const recipeForFolder = {
      id: savedRecipe.recipe.id,
      title: savedRecipe.recipe.title,
      brand: savedRecipe.recipe.brand,
      image: '🍽️'
    };

    setFolders(folders.map(folder => 
      folder.id === selectedFolder.id
        ? {
            ...folder,
            recipes: [...folder.recipes, recipeForFolder],
            recipeCount: folder.recipes.length + 1
          }
        : folder
    ));

    // Update selected folder state
    setSelectedFolder({
      ...selectedFolder,
      recipes: [...selectedFolder.recipes, recipeForFolder],
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">
            Saved Recipes
          </h1>
          <p className="text-gray-600 mt-2">
            Your favorite recipes organized in folders
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button 
            onClick={() => setShowNewFolderModal(true)}
            className="btn btn-primary flex items-center gap-2 whitespace-nowrap shadow-lg"
          >
            <FolderPlus className="w-5 h-5" />
            New Folder
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'all' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All Saved ({savedRecipes.length})
        </button>
        <button
          onClick={() => setActiveTab('folders')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'folders' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Folders ({folders.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card p-12 text-center">
          <Loader className="w-8 h-8 mx-auto animate-spin text-primary mb-4" />
          <p className="text-gray-500">Loading favorites...</p>
        </div>
      ) : activeTab === 'all' ? (
        /* All Saved Recipes */
        savedRecipes.length === 0 ? (
          <div className="card p-12 text-center">
            <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">
              No saved recipes yet
            </h2>
            <p className="text-gray-500 mb-6">
              Save recipes from the AI Generator or Recipe Browser
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <a href="/recipes?ai=true" className="btn btn-primary">
                Generate AI Recipe
              </a>
              <a href="/recipes" className="btn btn-secondary">
                Browse Recipes
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedRecipes.map((saved) => (
              <div key={saved.id} className="card overflow-hidden hover:shadow-lg transition-shadow">
                <div className="bg-gradient-to-br from-orange-100 to-red-100 h-40 flex items-center justify-center">
                  {saved.recipe.imageUrl ? (
                    <img 
                      src={saved.recipe.imageUrl} 
                      alt={saved.recipe.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">🍽️</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">
                    {saved.recipe.title}
                  </h3>
                  {saved.recipe.brand && (
                    <p className="text-sm text-primary mb-2">{saved.recipe.brand}</p>
                  )}
                  {saved.recipe.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {saved.recipe.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>
                      {saved.recipe.prepTimeMinutes && saved.recipe.cookTimeMinutes
                        ? `${saved.recipe.prepTimeMinutes + saved.recipe.cookTimeMinutes} min`
                        : 'Time varies'}
                    </span>
                    <span className="capitalize">{saved.recipe.difficulty || 'Medium'}</span>
                  </div>
                  {saved.personalNotes && (
                    <p className="text-xs text-gray-500 italic mb-3 bg-gray-50 p-2 rounded">
                      📝 {saved.personalNotes}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <a 
                      href={`/recipes/${saved.recipe.id}`}
                      className="btn btn-primary btn-sm flex-1"
                    >
                      View Recipe
                    </a>
                    <button 
                      onClick={() => handleUnsaveRecipe(saved.id)}
                      className="btn btn-secondary btn-sm"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Folders Tab */
        folders.length === 0 ? (
          <div className="card p-12 text-center">
            <Folder className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">
              No folders yet
            </h2>
            <p className="text-gray-500 mb-6">
              Create folders to organize your saved recipes
            </p>
            <button 
              onClick={() => setShowNewFolderModal(true)}
              className="btn btn-primary"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Create Folder
            </button>
          </div>
        ) : (
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
        )
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto my-auto shadow-2xl">
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
                disabled={isCreating}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || isCreating}
                className="btn btn-primary flex-1"
              >
                {isCreating ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Folder'
                )}
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
                {savedRecipes
                  .filter(saved => !selectedFolder.recipes.some((r: any) => r.id === saved.recipe.id))
                  .map((saved) => (
                    <div 
                      key={saved.id} 
                      className="card p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 border-gray-200 hover:border-primary"
                      onClick={() => addRecipeToFolder(saved.recipe.id)}
                    >
                      <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-lg h-24 mb-3 flex items-center justify-center">
                        {saved.recipe.imageUrl ? (
                          <img src={saved.recipe.imageUrl} alt={saved.recipe.title} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <span className="text-3xl">🍽️</span>
                        )}
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{saved.recipe.title}</h4>
                      {saved.recipe.brand && (
                        <p className="text-xs text-primary">{saved.recipe.brand}</p>
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
              
              {savedRecipes.filter(saved => !selectedFolder.recipes.some((r: any) => r.id === saved.recipe.id)).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">{savedRecipes.length === 0 ? 'Save some recipes first to add them to folders!' : 'All saved recipes have been added to this folder!'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button for Mobile */}
      <button
        onClick={() => setShowNewFolderModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg lg:hidden z-40 flex items-center justify-center hover:bg-primary-600 transition-colors"
        title="Create New Folder"
      >
        <FolderPlus className="w-6 h-6" />
      </button>
    </div>
  );
};

export default FavoritesPage;