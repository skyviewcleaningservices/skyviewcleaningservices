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
    <div className="bg-gray-50 dark:bg-slate-900 min-h-screen flex flex-col">
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
                  className="w-11 h-11"
                />
                <div className="leading-tight">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">SkyView</p>
                  <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-widest -mt-0.5">Cleaning Services</p>
                </div>
              </a>
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-4">
              {currentTime && (
                <div className="hidden lg:block text-right leading-tight">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 tabular-nums">
                    {currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              )}

              {user && (
                <div className="hidden sm:flex items-center gap-3 bg-gray-50 dark:bg-slate-700/50 rounded-full pl-1.5 pr-4 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center text-xs font-semibold uppercase">
                    {user.username.slice(0, 1)}
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{user.role}{sessionTimeLeft ? ` · expires in ${sessionTimeLeft}` : ''}</p>
                  </div>
                </div>
              )}

              {showLogout && onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-500/50 transition-colors text-sm font-medium"
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
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-1.5 overflow-x-auto py-3 -mx-1 px-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={tab.onClick}
                  className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${
                    tab.isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {children}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <img src="/logo.png" alt="SkyView Logo" className="w-5 h-5" />
            <span>SkyView Cleaning Services — Admin Console</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} SkyView Cleaning Services. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
