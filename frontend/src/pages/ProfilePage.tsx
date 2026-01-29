import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Settings, CreditCard, Loader, Check } from 'lucide-react';
import { authApi } from '../services/api';

const DIETARY_OPTIONS = [
  { id: 'high-protein', label: 'High Protein', description: 'Focus on protein-rich meals' },
  { id: 'low-carb', label: 'Low Carb', description: 'Reduced carbohydrate intake' },
  { id: 'vegetarian', label: 'Vegetarian', description: 'No meat' },
  { id: 'vegan', label: 'Vegan', description: 'No animal products' },
  { id: 'gluten-free', label: 'Gluten-Free', description: 'No gluten' },
  { id: 'dairy-free', label: 'Dairy-Free', description: 'No dairy products' },
  { id: 'keto', label: 'Keto', description: 'Very low carb, high fat' },
  { id: 'low-sodium', label: 'Low Sodium', description: 'Reduced salt intake' },
];

const ProfilePage: React.FC = () => {
  const { user, logout, setUser } = useAuthStore();
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load existing preferences
  useEffect(() => {
    if (user?.preferences) {
      try {
        const prefs = typeof user.preferences === 'string' 
          ? JSON.parse(user.preferences) 
          : user.preferences;
        setDietaryPreferences(prefs.dietaryPreferences || []);
      } catch (e) {
        console.error('Failed to parse preferences:', e);
      }
    }
  }, [user]);

  const togglePreference = (prefId: string) => {
    setDietaryPreferences(prev => 
      prev.includes(prefId) 
        ? prev.filter(p => p !== prefId)
        : [...prev, prefId]
    );
    setSaveSuccess(false);
  };

  const savePreferences = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const newPreferences = {
        dietaryPreferences,
        updatedAt: new Date().toISOString()
      };
      
      // Send as object - backend handles JSON.stringify
      const response = await authApi.updateProfile({
        preferences: newPreferences
      });
      
      // Update local user state
      if (response.user) {
        setUser(response.user);
      }
      
      setSaveSuccess(true);
      toast.success('Preferences saved! Recipes will be filtered.', { icon: '✅' });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-gray-900">
          Profile Settings
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your account and meal preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold">
                {user?.firstName?.[0] || 'U'}
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-gray-600">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={user?.firstName || ''}
                  className="input"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={user?.lastName || ''}
                  className="input"
                  readOnly
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  className="input"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Dietary Preferences - Now Functional! */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">🍽️ Meal Preferences</h3>
                <p className="text-sm text-gray-600">Select your dietary preferences to get personalized recipe recommendations</p>
              </div>
              {saveSuccess && (
                <span className="flex items-center text-green-600 text-sm">
                  <Check className="w-4 h-4 mr-1" />
                  Saved!
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {DIETARY_OPTIONS.map((option) => (
                <label 
                  key={option.id} 
                  className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    dietaryPreferences.includes(option.id)
                      ? 'border-primary bg-primary bg-opacity-5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    className="rounded mt-1 mr-3"
                    checked={dietaryPreferences.includes(option.id)}
                    onChange={() => togglePreference(option.id)}
                  />
                  <div>
                    <span className="font-medium text-gray-900">{option.label}</span>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <button 
              onClick={savePreferences}
              disabled={isSaving}
              className="btn btn-primary"
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </button>

            {dietaryPreferences.length > 0 && (
              <p className="text-sm text-gray-600 mt-4">
                ✨ Recipes will be filtered to match: <strong>{dietaryPreferences.join(', ')}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subscription */}
          <div className="card p-6">
            <div className="flex items-center space-x-3 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Subscription</h3>
            </div>
            <div className="mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {user?.subscriptionTier === 'premium' ? 'Premium' : 'Free Plan'}
              </span>
            </div>
            <button className="btn btn-primary w-full">
              Upgrade to Premium
            </button>
          </div>

          {/* Settings */}
          <div className="card p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Settings className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Settings</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Email notifications</span>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Push notifications</span>
                <input type="checkbox" className="rounded" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Weekly meal plans</span>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="card p-6">
            <button
              onClick={logout}
              className="btn w-full border-red-200 text-red-600 hover:bg-red-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
