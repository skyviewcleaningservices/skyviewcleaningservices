'use client';

import { useEffect, useState } from 'react';
import AdminDashboard from '../components/AdminDashboard';
import UserManagement from '../components/UserManagement';
import { checkTokenValidity, clearTokenData, formatTimeUntilExpiry, redirectToLogin } from '../utils/tokenUtils';

interface AdminUser {
  id: string;
  username: string;
  role: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bookings' | 'users'>('bookings');
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionTimeLeft, setSessionTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated with valid token
    const isValid = checkTokenValidity();
    const user = localStorage.getItem('adminUser');

    if (isValid && user) {
      setIsAuthenticated(true);
      try {
        const userData = JSON.parse(user);
        setAdminUser(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        handleLogout();
      }
    } else {
      // Redirect to admin login page if not authenticated
      redirectToLogin();
    }
    setIsLoading(false);
  }, []);

  // Update time every second and check session
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());

      // Check token validity and update session time
      if (isAuthenticated) {
        const isValid = checkTokenValidity();
        if (!isValid) {
          handleLogout();
          return;
        }

        const timeLeft = formatTimeUntilExpiry();
        setSessionTimeLeft(timeLeft);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated]);

  const handleLogout = () => {
    clearTokenData();
    redirectToLogin();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-lg text-gray-900 dark:text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login page
  }

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">SkyView Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              {adminUser && (
                <div className="flex flex-col items-end space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Welcome,</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{adminUser.username}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">({adminUser.role})</span>
                  </div>
                  <div className="flex flex-col text-xs text-gray-500 dark:text-gray-400">
                    <div>
                      {currentTime.toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div>
                      {currentTime.toLocaleTimeString('en-US', {
                        hour12: true,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'bookings'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              Booking Management
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              User Management
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'bookings' ? <AdminDashboard /> : <UserManagement />}
      </div>
    </div>
  );
}
