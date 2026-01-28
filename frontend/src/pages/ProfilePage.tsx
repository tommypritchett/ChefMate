import React from 'react';
import { useAuthStore } from '../store/authStore';
import { Settings, CreditCard } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-gray-900">
          Profile Settings
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your account and preferences
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

            <div className="mt-6">
              <button className="btn btn-primary mr-3">
                Update Profile
              </button>
              <button className="btn btn-secondary">
                Change Password
              </button>
            </div>
          </div>

          {/* Dietary Preferences */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">
              Dietary Preferences
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'High-Protein'].map((pref) => (
                <label key={pref} className="flex items-center">
                  <input type="checkbox" className="rounded mr-2" />
                  <span className="text-sm">{pref}</span>
                </label>
              ))}
            </div>
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
                Free Plan
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