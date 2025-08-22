'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { checkTokenValidity, clearTokenData, formatTimeUntilExpiry, redirectToLogin } from '../utils/tokenUtils';

interface UserData {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export default function UserDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionTimeLeft, setSessionTimeLeft] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'profile'>('overview');

  useEffect(() => {
    // Check if user is authenticated with valid token
    const isValid = checkTokenValidity();
    const user = localStorage.getItem('userData');

    if (isValid && user) {
      setIsAuthenticated(true);
      try {
        const userData = JSON.parse(user);
        setUserData(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        handleLogout();
      }
    } else {
      // Redirect to login page if not authenticated
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
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-slate-900">
        <div className="text-lg text-gray-900 dark:text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login page
  }

  return (
    <DashboardLayout
      title="User Dashboard"
      user={userData ? { username: userData.name, role: 'Customer' } : null}
      currentTime={currentTime}
      sessionTimeLeft={sessionTimeLeft}
      onLogout={handleLogout}
      tabs={[
        {
          id: 'overview',
          label: 'Overview',
          isActive: activeTab === 'overview',
          onClick: () => setActiveTab('overview')
        },
        {
          id: 'bookings',
          label: 'My Bookings',
          isActive: activeTab === 'bookings',
          onClick: () => setActiveTab('bookings')
        },
        {
          id: 'profile',
          label: 'Profile',
          isActive: activeTab === 'profile',
          onClick: () => setActiveTab('profile')
        }
      ]}
    >
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Welcome to SkyView Cleaning Services</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Manage your cleaning bookings and profile information from this dashboard.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-indigo-900 dark:text-indigo-100">Total Bookings</h4>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">0</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 dark:text-green-100">Completed</h4>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">0</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 dark:text-yellow-100">Pending</h4>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">0</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Bookings</h3>
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No bookings found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You haven't made any bookings yet.
            </p>
            <div className="mt-6">
              <a
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Book a Service
              </a>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h3>
          {userData && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{userData.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{userData.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{userData.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{userData.address}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
