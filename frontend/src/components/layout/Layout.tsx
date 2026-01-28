import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  Home, 
  BookOpen, 
  Heart, 
  Package, 
  ShoppingCart, 
  User,
  LogOut,
  ChefHat
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navigationItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/recipes', icon: BookOpen, label: 'Recipes' },
    { href: '/favorites', icon: Heart, label: 'Favorites' },
    { href: '/inventory', icon: Package, label: 'My Food' },
    { href: '/shopping', icon: ShoppingCart, label: 'Shopping' },
    { href: '/profile', icon: User, label: 'Profile' },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <ChefHat className="w-8 h-8 text-primary" />
              <span className="text-xl font-display font-bold text-primary">
                ChefMate
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigationItems.slice(0, -1).map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <Link
                to="/profile"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/profile')
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:block">
                  {user?.firstName || 'Profile'}
                </span>
              </Link>
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border">
        <div className="grid grid-cols-5 h-16">
          {navigationItems.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                isActive(item.href)
                  ? 'text-primary bg-primary/10'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Add padding at bottom for mobile navigation */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default Layout;