import React, { useState, useEffect } from 'react';
import { Package, Plus, Camera, X, Trash2, Sparkles } from 'lucide-react';
import { inventoryApi } from '../services/api';

interface InventoryItem {
  id: string;
  name: string;
  category?: string;
  storageLocation: 'fridge' | 'freezer' | 'pantry';
  quantity?: number;
  unit?: string;
  expiresAt?: Date;
  isExpired?: boolean;
}

const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'protein',
    storageLocation: 'fridge' as 'fridge' | 'freezer' | 'pantry',
    quantity: 1,
    unit: 'pieces',
    expiresAt: ''
  });

  const commonItems = {
    protein: ['Chicken Breast', 'Ground Turkey (93%)', 'Salmon Fillet', 'Greek Yogurt', 'Eggs', 'Tofu', 'Lean Ground Beef (93%)', 'Cottage Cheese'],
    vegetables: ['Broccoli', 'Spinach', 'Carrots', 'Bell Peppers', 'Onions', 'Garlic', 'Tomatoes', 'Lettuce'],
    grains: ['Brown Rice', 'Quinoa', 'Whole Wheat Bread', 'Oats', 'Sweet Potatoes', 'Pasta (Whole Grain)'],
    dairy: ['Low-Fat Milk', 'Part-Skim Mozzarella', 'Greek Yogurt', 'Cottage Cheese', 'Almond Milk'],
    pantry: ['Olive Oil', 'Coconut Oil', 'Honey', 'Spices', 'Canned Beans', 'Nuts', 'Seeds']
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getInventory();
      setItems(response.items || []);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim()) return;
    
    try {
      const itemData = {
        name: newItem.name,
        category: newItem.category,
        storageLocation: newItem.storageLocation,
        quantity: newItem.quantity,
        unit: newItem.unit,
        expiresAt: newItem.expiresAt ? new Date(newItem.expiresAt) : undefined
      };

      await inventoryApi.addItem(itemData);
      await loadInventory();
      setShowAddModal(false);
      setNewItem({
        name: '',
        category: 'protein',
        storageLocation: 'fridge',
        quantity: 1,
        unit: 'pieces',
        expiresAt: ''
      });
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await inventoryApi.deleteItem(id);
      await loadInventory();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const getItemsByLocation = (location: string) => {
    return items.filter(item => item.storageLocation === location);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">
            My Food Inventory
          </h1>
          <p className="text-gray-600 mt-2">
            Track what you have and avoid food waste
          </p>
        </div>
        <div className="flex gap-2 mt-4 lg:mt-0">
          <button className="btn btn-secondary">
            <Camera className="w-4 h-4 mr-2" />
            Scan Photo
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </button>
        </div>
      </div>

      {/* Storage Locations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { name: 'Freezer', icon: '🧊', location: 'freezer', color: 'blue' },
          { name: 'Fridge', icon: '❄️', location: 'fridge', color: 'green' },
          { name: 'Pantry', icon: '🏠', location: 'pantry', color: 'yellow' }
        ].map(storage => {
          const storageItems = getItemsByLocation(storage.location);
          return (
            <div key={storage.location} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{storage.icon} {storage.name}</h3>
                <div className={`text-lg font-bold text-${storage.color}-600`}>
                  {storageItems.length}
                </div>
              </div>
              
              {storageItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Package className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No items yet</p>
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-sm btn-secondary mt-2"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Item
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {storageItems.map(item => (
                    <div key={item.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-800">{item.name}</h4>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-sm text-gray-600">
                        {item.quantity} {item.unit}
                      </div>
                      {item.category && (
                        <div className="text-xs bg-white px-2 py-1 rounded mt-1 inline-block">
                          {item.category}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AI Recipe Suggestions */}
      {items.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">🤖 AI Recipe Suggestions</h3>
              <p className="text-sm text-gray-600">Based on what's in your {getItemsByLocation('fridge').length > 0 ? 'fridge' : getItemsByLocation('freezer').length > 0 ? 'freezer' : 'pantry'}</p>
            </div>
            <button className="btn btn-primary btn-sm">
              <Sparkles className="w-4 h-4 mr-1" />
              Get Suggestions
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Quick Suggestion Cards */}
            {[
              { title: "Quick Protein Bowl", ingredients: getItemsByLocation('fridge').slice(0, 3), time: "15 min" },
              { title: "Healthy Stir Fry", ingredients: getItemsByLocation('fridge').slice(0, 2), time: "20 min" },
              { title: "Meal Prep Special", ingredients: [...getItemsByLocation('fridge').slice(0, 2), ...getItemsByLocation('pantry').slice(0, 1)], time: "30 min" }
            ].filter(suggestion => suggestion.ingredients.length > 0).map((suggestion, i) => (
              <div key={i} className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-medium text-blue-900 mb-2">{suggestion.title}</h4>
                <div className="text-xs text-blue-700 mb-2">
                  Using: {suggestion.ingredients.map(item => item.name).join(', ')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-600">⏱️ {suggestion.time}</span>
                  <button className="btn btn-xs btn-secondary">View Recipe</button>
                </div>
              </div>
            ))}
          </div>
          
          {getItemsByLocation('fridge').length === 0 && getItemsByLocation('freezer').length === 0 && getItemsByLocation('pantry').length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">Add some ingredients to get personalized recipe suggestions!</p>
            </div>
          )}
        </div>
      )}

      {/* Empty State - Only show when no items at all */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            No inventory items yet
          </h2>
          <p className="text-gray-500 mb-6">
            Add your groceries to track freshness and reduce waste
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Item
          </button>
        </div>
      ) : null}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header - Sticky */}
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add Food Item</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Item Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="input w-full"
                  placeholder="e.g., Chicken Breast"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    className="input w-full"
                  >
                    <option value="protein">Protein</option>
                    <option value="vegetables">Vegetables</option>
                    <option value="grains">Grains</option>
                    <option value="dairy">Dairy</option>
                    <option value="pantry">Pantry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Storage</label>
                  <select
                    value={newItem.storageLocation}
                    onChange={(e) => setNewItem({...newItem, storageLocation: e.target.value as any})}
                    className="input w-full"
                  >
                    <option value="fridge">Fridge</option>
                    <option value="freezer">Freezer</option>
                    <option value="pantry">Pantry</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Quantity</label>
                  <input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                    className="input w-full"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Unit</label>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                    className="input w-full"
                  >
                    <option value="pieces">Pieces</option>
                    <option value="lbs">Lbs</option>
                    <option value="oz">Oz</option>
                    <option value="cups">Cups</option>
                    <option value="packages">Packages</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Expires (Optional)</label>
                <input
                  type="date"
                  value={newItem.expiresAt}
                  onChange={(e) => setNewItem({...newItem, expiresAt: e.target.value})}
                  className="input w-full"
                />
              </div>

              {/* Quick Add Common Items */}
              <div>
                <label className="block text-sm font-medium mb-2">Quick Add Common Items</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {commonItems[newItem.category as keyof typeof commonItems]?.slice(0, 6).map(item => (
                    <button
                      key={item}
                      onClick={() => setNewItem({...newItem, name: item})}
                      className="btn btn-secondary btn-sm text-left"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer - Sticky */}
            <div className="sticky bottom-0 bg-white border-t p-6 flex gap-2">
              <button 
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddItem}
                disabled={!newItem.name.trim()}
                className="btn btn-primary flex-1"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;