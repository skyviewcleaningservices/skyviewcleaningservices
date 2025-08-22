'use client';

import { useEffect, useState } from 'react';
import AdminDashboard from '../components/AdminDashboard';
import UserManagement from '../components/UserManagement';
import DashboardLayout from '../components/DashboardLayout';
import { checkTokenValidity, clearTokenData, formatTimeUntilExpiry, redirectToLogin } from '../utils/tokenUtils';

interface AdminUser {
  id: number;
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
    <DashboardLayout
      title="Admin Dashboard"
      user={adminUser}
      currentTime={currentTime}
      sessionTimeLeft={sessionTimeLeft}
      onLogout={handleLogout}
      tabs={[
        {
          id: 'bookings',
          label: 'Booking Management',
          isActive: activeTab === 'bookings',
          onClick: () => setActiveTab('bookings')
        },
        {
          id: 'users',
          label: 'User Management',
          isActive: activeTab === 'users',
          onClick: () => setActiveTab('users')
        }
      ]}
    >
      {activeTab === 'bookings' ? <AdminDashboard /> : <UserManagement />}
    </DashboardLayout>
  );
}
