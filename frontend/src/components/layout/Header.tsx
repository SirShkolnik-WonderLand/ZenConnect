'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { 
  Home, 
  Upload, 
  Calendar, 
  Mail, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X,
  FileText,
  BarChart3,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  title?: string;
  showNavigation?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = "ZenConnect", 
  showNavigation = true 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    setUser(authService.getUser());
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null);
    };

    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeDropdown]);

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  const navigationGroups = [
    {
      name: 'Core',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'CSV Upload', href: '/csv-upload', icon: Upload },
        { name: 'Services', href: '/services', icon: Calendar },
      ]
    },
    {
      name: 'Marketing',
      items: [
        { name: 'MailChimp', href: '/mailchimp', icon: Mail },
        { name: 'Referrals', href: '/referrals', icon: Users },
      ]
    },
    {
      name: 'Reports',
      items: [
        { name: 'Analytics', href: '/analytics', icon: BarChart3 },
        { name: 'Audit Logs', href: '/audit', icon: FileText },
      ]
    },
    {
      name: 'Admin',
      items: [
        { name: 'Users', href: '/users', icon: Users },
      ]
    }
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          {/* Logo and Title */}
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded flex items-center justify-center mr-2">
              <span className="text-white font-bold text-xs">ZC</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </div>

          {/* Desktop Navigation */}
          {showNavigation && (
            <nav className="hidden md:flex items-center space-x-1">
              {navigationGroups.map((group) => {
                // Filter admin-only groups
                if (group.name === 'Admin' && (!isMounted || !user || user.role !== 'admin')) {
                  return null;
                }
                return (
                <div key={group.name} className="relative">
                  <button
                    onClick={() => setActiveDropdown(activeDropdown === group.name ? null : group.name)}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    {group.name}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </button>
                  
                  {activeDropdown === group.name && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.name}
                              onClick={() => {
                                router.push(item.href);
                                setActiveDropdown(null);
                              }}
                              className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Icon className="h-4 w-4 mr-3" />
                              {item.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
              
              <button
                onClick={() => router.push('/settings')}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              >
                <Settings className="h-4 w-4" />
              </button>
            </nav>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            {isMounted && user && (
              <div className="hidden sm:flex items-center space-x-2">
                <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-700">
                    {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user.name || user.email}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="inline-flex items-center px-2 py-1 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Logout</span>
            </button>

            {/* Mobile menu button */}
            {showNavigation && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden inline-flex items-center justify-center p-1.5 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {showNavigation && isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigationGroups.map((group) => {
                // Filter admin-only groups
                if (group.name === 'Admin' && (!isMounted || !user || user.role !== 'admin')) {
                  return null;
                }
                return (
                <div key={group.name}>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {group.name}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          router.push(item.href);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-left flex items-center px-6 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};