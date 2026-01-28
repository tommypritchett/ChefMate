import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, ExternalLink, X, Trash2, Check } from 'lucide-react';
// import { shoppingApi } from '../services/api';

interface ShoppingList {
  id: string;
  name: string;
  description?: string;
  items: ShoppingListItem[];
  createdAt: string;
  isActive: boolean;
}

interface ShoppingListItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  isCompleted: boolean;
  category?: string;
}

const ShoppingListsPage: React.FC = () => {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
    loadShoppingLists();
  }, []);

  const loadShoppingLists = async () => {
    try {
      setLoading(true);
      // For now, we'll use mock data since the API might not have full shopping list items support
      setLists([
        {
          id: '1',
          name: 'Weekly Groceries',
          description: 'Regular weekly shopping',
          createdAt: new Date().toISOString(),
          isActive: true,
          items: [
            { id: '1', name: 'Greek Yogurt', quantity: 2, unit: 'cups', isCompleted: false, category: 'dairy' },
            { id: '2', name: 'Chicken Breast', quantity: 2, unit: 'lbs', isCompleted: true, category: 'protein' },
            { id: '3', name: 'Spinach', quantity: 1, unit: 'bag', isCompleted: false, category: 'vegetables' }
          ]
        }
      ]);
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
      setLists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    
    const newList: ShoppingList = {
      id: Date.now().toString(),
      name: newListName,
      description: newListDescription,
      createdAt: new Date().toISOString(),
      isActive: true,
      items: []
    };
    
    setLists([newList, ...lists]);
    setNewListName('');
    setNewListDescription('');
    setShowNewListModal(false);
  };

  const handleAddItem = (listId: string) => {
    if (!newItemName.trim()) return;
    
    setLists(lists.map(list => 
      list.id === listId 
        ? {
            ...list,
            items: [
              ...list.items,
              {
                id: Date.now().toString(),
                name: newItemName,
                isCompleted: false
              }
            ]
          }
        : list
    ));
    setNewItemName('');
  };

  const toggleItemCompleted = (listId: string, itemId: string) => {
    setLists(lists.map(list =>
      list.id === listId
        ? {
            ...list,
            items: list.items.map(item =>
              item.id === itemId
                ? { ...item, isCompleted: !item.isCompleted }
                : item
            )
          }
        : list
    ));
  };

  const deleteList = (listId: string) => {
    setLists(lists.filter(list => list.id !== listId));
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">
            Shopping Lists
          </h1>
          <p className="text-gray-600 mt-2">
            Organize your grocery shopping with smart lists
          </p>
        </div>
        <button 
          onClick={() => setShowNewListModal(true)}
          className="btn btn-primary mt-4 lg:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          New List
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : lists.length === 0 ? (
        /* Empty State */
        <div className="card p-12 text-center">
          <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            No shopping lists yet
          </h2>
          <p className="text-gray-500 mb-6">
            Create lists from recipes or start from scratch
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => setShowNewListModal(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create List
            </button>
            <a href="/recipes" className="btn btn-secondary">
              Browse Recipes
            </a>
          </div>
        </div>
      ) : (
        /* Shopping Lists Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list) => {
            const completedItems = list.items.filter(item => item.isCompleted).length;
            const totalItems = list.items.length;
            const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
            
            return (
              <div key={list.id} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg text-gray-900">{list.name}</h3>
                  <button 
                    onClick={() => deleteList(list.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {list.description && (
                  <p className="text-gray-600 text-sm mb-4">{list.description}</p>
                )}
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{completedItems} of {totalItems} items</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                  {list.items.slice(0, 4).map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-2 text-sm"
                      onClick={() => toggleItemCompleted(list.id, item.id)}
                    >
                      <button className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        item.isCompleted 
                          ? 'bg-green-500 border-green-500 text-white' 
                          : 'border-gray-300 hover:border-green-400'
                      }`}>
                        {item.isCompleted && <Check className="w-3 h-3" />}
                      </button>
                      <span className={item.isCompleted ? 'line-through text-gray-500' : 'text-gray-800'}>
                        {item.name}
                        {item.quantity && ` (${item.quantity}${item.unit ? ' ' + item.unit : ''})`}
                      </span>
                    </div>
                  ))}
                  {list.items.length > 4 && (
                    <p className="text-xs text-gray-500">+{list.items.length - 4} more items</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedList(list)}
                    className="btn btn-secondary btn-sm flex-1"
                  >
                    View Details
                  </button>
                  <button className="btn btn-primary btn-sm flex-1">
                    Shop Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Store Links */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Shop Online</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Instacart', 'Walmart', 'Target', 'Amazon Fresh'].map((store) => (
            <button
              key={store}
              onClick={() => console.log(`Navigate to ${store}`)}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">{store}</span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* New List Modal */}
      {showNewListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Create Shopping List</h3>
              <button 
                onClick={() => setShowNewListModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">List Name *</label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="input w-full"
                  placeholder="e.g., Weekly Groceries, Party Shopping"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  className="input w-full h-20 resize-none"
                  placeholder="Add notes about this shopping list..."
                />
              </div>
            </div>

            <div className="flex gap-2 p-6 border-t">
              <button 
                onClick={() => setShowNewListModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateList}
                disabled={!newListName.trim()}
                className="btn btn-primary flex-1"
              >
                Create List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Detail Modal */}
      {selectedList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selectedList.name}</h3>
                <p className="text-sm text-gray-600">{selectedList.items.length} items</p>
              </div>
              <button 
                onClick={() => setSelectedList(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="input flex-1"
                  placeholder="Add new item..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem(selectedList.id)}
                />
                <button 
                  onClick={() => handleAddItem(selectedList.id)}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {selectedList.items.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    onClick={() => toggleItemCompleted(selectedList.id, item.id)}
                  >
                    <button className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      item.isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-gray-300 hover:border-green-400'
                    }`}>
                      {item.isCompleted && <Check className="w-3 h-3" />}
                    </button>
                    <div className="flex-1">
                      <span className={item.isCompleted ? 'line-through text-gray-500' : 'text-gray-800'}>
                        {item.name}
                      </span>
                      {item.quantity && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({item.quantity}{item.unit ? ' ' + item.unit : ''})
                        </span>
                      )}
                    </div>
                    {item.category && (
                      <span className="text-xs bg-white px-2 py-1 rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingListsPage;