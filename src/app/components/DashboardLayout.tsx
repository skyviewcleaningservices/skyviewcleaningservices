'use client';

import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  user?: {
    username: string;
    role: string;
  } | null;
  currentTime?: Date;
  sessionTimeLeft?: string | null;
  onLogout?: () => void;
  showLogout?: boolean;
  tabs?: {
    id: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }[];
}

export default function DashboardLayout({
  children,
  title,
  user,
  currentTime,
  sessionTimeLeft,
  onLogout,
  showLogout = true,
  tabs
}: DashboardLayoutProps) {
  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen">
      {/* Header with Logo */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <a href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer">
                <img 
                  src="/logo.png" 
                  alt="SkyView Logo" 
                  className="w-12 h-12"
                />
                <div>
                  <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">SkyView</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Cleaning Services</p>
                </div>
              </a>
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-6">
              {user && (
                <div className="flex flex-col items-end space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Welcome,</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">({user.role})</span>
                  </div>
                  {currentTime && (
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
                  )}
                  {sessionTimeLeft && (
                    <div className="text-xs text-orange-600 dark:text-orange-400">
                      Session expires: {sessionTimeLeft}
                    </div>
                  )}
                </div>
              )}
              
              {showLogout && onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      {tabs && tabs.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={tab.onClick}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    tab.isActive
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
