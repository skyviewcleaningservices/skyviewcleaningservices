'use client';

import { useEffect, useState } from 'react';
import AdminDashboard from '../components/AdminDashboard';
import UserManagement from '../components/UserManagement';
import EmployeeManagement from '../components/EmployeeManagement';
import AttendanceView from '../components/AttendanceView';
import ExpenseView from '../components/ExpenseView';
import PricingManagement from '../components/PricingManagement';
import QuotationView from '../components/QuotationView';
import ReportsView from '../components/ReportsView';
import ReminderView from '../components/ReminderView';
import CrewView from '../components/CrewView';
import DashboardLayout from '../components/DashboardLayout';
import { checkTokenValidity, clearTokenData, formatTimeUntilExpiry, redirectToLogin } from '@/lib/tokenUtils';

interface AdminUser {
  id: number;
  username: string;
  role: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bookings' | 'users' | 'employees' | 'attendance' | 'expenses' | 'pricing' | 'quotations' | 'reports' | 'reminders'>('bookings');
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

  // STAFF accounts are crew — a stripped-down, read-only view of today's jobs,
  // not the full management dashboard.
  if (adminUser?.role === 'STAFF') {
    return (
      <DashboardLayout
        title="Today's Jobs"
        user={adminUser}
        currentTime={currentTime}
        sessionTimeLeft={sessionTimeLeft}
        onLogout={handleLogout}
      >
        <CrewView />
      </DashboardLayout>
    );
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
        },
        {
          id: 'employees',
          label: 'Employee Management',
          isActive: activeTab === 'employees',
          onClick: () => setActiveTab('employees')
        },
        {
          id: 'attendance',
          label: 'Attendance',
          isActive: activeTab === 'attendance',
          onClick: () => setActiveTab('attendance')
        },
        {
          id: 'expenses',
          label: 'Monthly Expenses',
          isActive: activeTab === 'expenses',
          onClick: () => setActiveTab('expenses')
        },
        {
          id: 'pricing',
          label: 'Pricing',
          isActive: activeTab === 'pricing',
          onClick: () => setActiveTab('pricing')
        },
        {
          id: 'quotations',
          label: 'Quotations',
          isActive: activeTab === 'quotations',
          onClick: () => setActiveTab('quotations')
        },
        {
          id: 'reports',
          label: 'Reports',
          isActive: activeTab === 'reports',
          onClick: () => setActiveTab('reports')
        },
        {
          id: 'reminders',
          label: 'Reminders',
          isActive: activeTab === 'reminders',
          onClick: () => setActiveTab('reminders')
        }
      ]}
    >
      {activeTab === 'bookings' && <AdminDashboard />}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'employees' && <EmployeeManagement />}
      {activeTab === 'attendance' && <AttendanceView />}
      {activeTab === 'expenses' && <ExpenseView />}
      {activeTab === 'pricing' && <PricingManagement />}
      {activeTab === 'quotations' && <QuotationView />}
      {activeTab === 'reports' && <ReportsView />}
      {activeTab === 'reminders' && <ReminderView />}
    </DashboardLayout>
  );
}
