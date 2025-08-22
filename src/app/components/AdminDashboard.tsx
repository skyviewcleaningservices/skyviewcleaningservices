'use client';

import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';

// ---- Interfaces ----
interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  serviceType: string;
  frequency: string;
  preferredDate: string;
  preferredTime: string;
  bedrooms: string;
  bathrooms: string;
  additionalServices: string;
  specialInstructions?: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  statusReason?: string;
  remarks?: string;
  paymentAmount?: number;
  paymentType?: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER';
  createdAt: string;
  updatedAt: string;
}

type UpdateFn = (
  bookingId: string,
  status: Booking['status'],
  remarks?: string,
  paymentAmount?: number,
  paymentType?: Booking['paymentType']
) => Promise<void>;

// ---- Constants ----
const DEBOUNCE_DELAY = 1000;
const API_TIMEOUT = 5000;
const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' }
] as const;

const PAYMENT_OPTIONS = [
  { value: '', label: 'Select Type' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' }
] as const;

// ---- Debounced Input Component ----
const DebouncedInput = memo(function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = DEBOUNCE_DELAY,
  type = 'text',
  placeholder,
  min,
  className = "border border-gray-300 rounded-md px-2 py-1 text-sm w-full text-gray-700"
}: {
  value: string | number | undefined;
  onChange: (val: string) => void;
  debounce?: number;
  type?: string;
  placeholder?: string;
  min?: string;
  className?: string;
}) {
  const [val, setVal] = useState(initialValue?.toString() || '');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setVal(initialValue?.toString() || '');
  }, [initialValue]);

  const handleChange = useCallback((newValue: string) => {
    setVal(newValue);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (newValue !== initialValue?.toString()) {
        onChange(newValue);
      }
    }, debounce);
  }, [debounce, onChange, initialValue]);

  const handleBlur = useCallback(() => {
    if (val !== initialValue?.toString()) {
        onChange(val);
      }
  }, [val, initialValue, onChange]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <input
      type={type}
      value={val}
      min={min}
      placeholder={placeholder}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      className={className}
    />
  );
});

// ---- Loading Spinner Component ----
const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
    </div>
  );
});

// ---- Booking Row Component ----
const BookingRow = memo(function BookingRow({
  booking,
  updateBookingStatus,
  formatDate,
  isUpdating,
}: {
  booking: Booking;
  updateBookingStatus: UpdateFn;
  formatDate: (d: string) => string;
  isUpdating: boolean;
}) {
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateBookingStatus(
      booking.id,
      e.target.value as Booking['status'],
      booking.remarks,
      booking.paymentAmount,
      booking.paymentType
    );
  }, [booking.id, booking.remarks, booking.paymentAmount, booking.paymentType, updateBookingStatus]);

  const handlePaymentTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateBookingStatus(
      booking.id,
      booking.status,
      booking.remarks,
      booking.paymentAmount,
      (e.target.value as Booking['paymentType']) || undefined
    );
  }, [booking.id, booking.status, booking.remarks, booking.paymentAmount, updateBookingStatus]);

  const handlePaymentAmountChange = useCallback((val: string) => {
    updateBookingStatus(
      booking.id,
      booking.status,
      booking.remarks,
      parseFloat(val) || undefined,
      booking.paymentType
    );
  }, [booking.id, booking.status, booking.remarks, booking.paymentType, updateBookingStatus]);

  const handleRemarksChange = useCallback((val: string) => {
    updateBookingStatus(
      booking.id,
      booking.status,
      val || undefined,
      booking.paymentAmount,
      booking.paymentType
    );
  }, [booking.id, booking.status, booking.paymentAmount, booking.paymentType, updateBookingStatus]);

  const handleViewDetails = useCallback(() => {
    window.open(`/admin/booking/${booking.id}`, '_blank');
  }, [booking.id]);

  // Check if booking is overdue (past date but not completed)
  const isOverdue = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(booking.preferredDate);
    return bookingDate < today && booking.status !== 'COMPLETED';
  }, [booking.preferredDate, booking.status]);

  return (
    <tr className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">{booking.name}</div>
          <div className="text-sm text-gray-500">{booking.phone}</div>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">{booking.serviceType}</div>
          <div className="text-sm text-gray-500">{booking.frequency}</div>
          <div className="text-sm text-gray-500">
            {booking.bedrooms} bed, {booking.bathrooms} bath
          </div>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
            {formatDate(booking.preferredDate)}
            {isOverdue && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                Overdue
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">{booking.preferredTime}</div>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <select
          value={booking.status}
          onChange={handleStatusChange}
          className={`border border-gray-300 rounded-md px-2 py-1 text-sm w-32 text-gray-700 ${isOverdue ? 'border-red-300' : ''}`}
        >
          {STATUS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="relative">
          <DebouncedInput
            type="number"
            min="0"
            value={booking.paymentAmount}
            placeholder="Amount"
            onChange={handlePaymentAmountChange}
          />
          {isUpdating && <LoadingSpinner />}
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <select
          value={booking.paymentType || ''}
          onChange={handlePaymentTypeChange}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm w-full text-gray-700"
        >
          {PAYMENT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="relative">
          <DebouncedInput
            type="text"
            value={booking.remarks}
            placeholder="Add remarks..."
            onChange={handleRemarksChange}
          />
          {isUpdating && <LoadingSpinner />}
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button 
          onClick={handleViewDetails}
          className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
        >
          View Details
        </button>
      </td>
    </tr>
  );
});

// ---- Table Header Component ----
const TableHeader = memo(function TableHeader() {
  const headers = ['Customer', 'Service', 'Date & Time', 'Status', 'Payment Amount', 'Payment Type', 'Remarks', 'Actions'];
  
  return (
    <thead className="bg-gray-50">
      <tr>
        {headers.map((header) => (
          <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {header}
          </th>
        ))}
      </tr>
    </thead>
  );
});

// ---- Summary Stats Component ----
const BookingStats = memo(function BookingStats({ 
  bookings, 
  activeTab 
}: { 
  bookings: Booking[]; 
  activeTab: 'upcoming' | 'past' | 'completed' | 'cancelled' | 'pending';
}) {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const total = bookings.length;
    const overdue = bookings.filter(booking => {
      const bookingDate = new Date(booking.preferredDate);
      return bookingDate < today && booking.status !== 'COMPLETED';
    }).length;
    
    const upcoming = bookings.filter(booking => {
      const bookingDate = new Date(booking.preferredDate);
      return bookingDate >= today;
    }).length;
    
    const completed = bookings.filter(booking => booking.status === 'COMPLETED').length;
    const pending = bookings.filter(booking => booking.status === 'PENDING').length;
    const confirmed = bookings.filter(booking => booking.status === 'CONFIRMED').length;
    const cancelled = bookings.filter(booking => booking.status === 'CANCELLED').length;
    
    return { total, overdue, upcoming, completed, pending, confirmed, cancelled };
  }, [bookings]);
return null;
});

// ---- Main Dashboard Component ----
export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingBookings, setUpdatingBookings] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [countsLoading, setCountsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'completed' | 'cancelled' | 'pending'>('upcoming');
  
  // Memoize the current tab to prevent unnecessary re-renders
  const currentTab = useMemo(() => activeTab, [activeTab]);
  
  // Memoize filtered bookings for better performance
  const filteredBookings = useMemo(() => {
    if (!searchTerm.trim()) return bookings;
    
    const term = searchTerm.toLowerCase();
    return bookings.filter(booking => 
      booking.name.toLowerCase().includes(term) ||
      booking.phone.includes(term) ||
      booking.email.toLowerCase().includes(term) ||
      booking.serviceType.toLowerCase().includes(term)
    );
  }, [bookings, searchTerm]);

  // Calculate counts for each tab
  const tabCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      upcoming: allBookings.filter(booking => {
        const bookingDate = new Date(booking.preferredDate);
        return bookingDate >= today;
      }).length,
      pending: allBookings.filter(booking => booking.status === 'PENDING').length,
      completed: allBookings.filter(booking => booking.status === 'COMPLETED').length,
      cancelled: allBookings.filter(booking => booking.status === 'CANCELLED').length,
      past: allBookings.filter(booking => {
        const bookingDate = new Date(booking.preferredDate);
        return bookingDate < today;
      }).length
    };
  }, [allBookings]);

  // Cache for last update to prevent unnecessary API calls
  const lastUpdateCache = useRef<Record<string, any>>({});

  const fetchAllBookings = useCallback(async () => {
    try {
      setCountsLoading(true);
      const response = await fetch('/api/bookings?tab=all');
      if (response.ok) {
        const data = await response.json();
        setAllBookings(data.bookings);
      }
    } catch (err) {
      console.error('Error fetching all bookings for counts:', err);
    } finally {
      setCountsLoading(false);
    }
  }, []);

  const fetchBookings = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else if (!tabLoading) {
      setLoading(true);
      }
      
      // Use server-side filtering based on active tab
      const url = `/api/bookings?tab=${activeTab}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      
      const data = await response.json();
      setBookings(data.bookings);
      setError(null);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Error fetching bookings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setTabLoading(false);
    }
  }, [activeTab, tabLoading]);

  useEffect(() => {
    fetchBookings(false);
  }, [fetchBookings, activeTab]);

  // Fetch all bookings for tab counts on component mount
  useEffect(() => {
    fetchAllBookings();
  }, [fetchAllBookings]);

  // Refresh all bookings periodically to keep tab counts updated
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllBookings();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchAllBookings]);

  const updateBookingStatus = useCallback<UpdateFn>(
    async (bookingId, status, remarks, paymentAmount, paymentType) => {
      try {
        const payload = { status, remarks, paymentAmount, paymentType };
  
        // Check if values have actually changed since last update
        const lastUpdate = lastUpdateCache.current[bookingId];
        if (lastUpdate && JSON.stringify(lastUpdate) === JSON.stringify(payload)) {
          return; // No changes detected, skip API call
        }
  
        // Save new payload to cache
        lastUpdateCache.current[bookingId] = payload;
  
        // Optimistic UI update
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId 
              ? { ...b, ...payload, updatedAt: new Date().toISOString() } 
              : b
          )
        );
        
        // Also update allBookings for tab counts
        setAllBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId 
              ? { ...b, ...payload, updatedAt: new Date().toISOString() } 
              : b
          )
        );
  
        setUpdatingBookings((prev) => new Set(prev).add(bookingId));
  
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
  
        const response = await fetch(`/api/bookings/${bookingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
  
        clearTimeout(timeout);
  
        if (!response.ok) {
          throw new Error("Update failed");
        }
        
        // Update allBookings to refresh tab counts
        setAllBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId 
              ? { ...b, ...payload, updatedAt: new Date().toISOString() } 
              : b
          )
        );
      } catch (err) {
        console.error("Error updating booking:", err);
        // Revert optimistic update on error
        setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b } : b));
        setAllBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b } : b));
      } finally {
        setUpdatingBookings((prev) => {
          const newSet = new Set(prev);
          newSet.delete(bookingId);
          return newSet;
        });
      }
    },
    []
  );

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }, []);

  const handleRefresh = useCallback(() => {
    fetchBookings(true);
    // Also refresh all bookings to update tab counts
    fetchAllBookings();
  }, [fetchBookings, fetchAllBookings, activeTab]);

  const handleTabChange = useCallback((tab: 'upcoming' | 'past' | 'completed' | 'cancelled' | 'pending') => {
    if (tab !== activeTab) {
      setTabLoading(true);
      setActiveTab(tab);
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading bookings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600 text-center">
          <div className="text-lg mb-4">{error}</div>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Booking Statistics */}
        <BookingStats bookings={bookings} activeTab={activeTab} />

        <div className="bg-white shadow rounded-lg relative mt-6">
          {/* Tab Navigation with Search and Refresh */}
          <div className="border-b border-gray-200">
            <div className="flex justify-between items-center px-6">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                <button
                  onClick={() => handleTabChange('upcoming')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'upcoming'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Upcoming ({countsLoading ? '...' : tabCounts.upcoming})
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange('pending')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'pending'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pending ({countsLoading ? '...' : tabCounts.pending})
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange('completed')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'completed'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Completed ({countsLoading ? '...' : tabCounts.completed})
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange('cancelled')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'cancelled'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Cancelled ({countsLoading ? '...' : tabCounts.cancelled})
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange('past')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'past'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Past ({countsLoading ? '...' : tabCounts.past})
                  </div>
                </button>
              </nav>
              
              {/* Search and Refresh aligned with tabs */}
              <div className="flex items-center space-x-4 ml-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search bookings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <svg className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {refreshing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Refreshing...
                    </>
                  ) : (
                    'Refresh'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-white relative z-10">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {activeTab === 'upcoming'}
                {activeTab === 'pending'}
                {activeTab === 'completed'}
                {activeTab === 'cancelled'}
                {activeTab === 'past'}
              </h2>
              {tabLoading && (
                <div className="ml-3">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            
            {activeTab === 'upcoming' && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-3">
                <p className="text-sm text-blue-800 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Showing upcoming bookings (from today onwards) sorted by date
                </p>
              </div>
            )}

            {activeTab === 'pending' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-3">
                <p className="text-sm text-yellow-800 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Showing all pending bookings across all dates
                </p>
              </div>
            )}

            {activeTab === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 mt-3">
                <p className="text-sm text-green-800 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Showing all completed bookings across all dates
                </p>
              </div>
            )}

            {activeTab === 'cancelled' && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-3">
                <p className="text-sm text-red-800 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Showing all cancelled bookings across all dates
                </p>
              </div>
            )}

            {activeTab === 'past' && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-3">
                <p className="text-sm text-gray-800 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Showing past bookings (before today) sorted by date
                </p>
              </div>
            )}
          </div>

          <div className="overflow-x-auto bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <TableHeader />
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <BookingRow 
                    key={booking.id} 
                    booking={booking} 
                    updateBookingStatus={updateBookingStatus} 
                    formatDate={formatDate}
                    isUpdating={updatingBookings.has(booking.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {filteredBookings.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchTerm.trim() ? (
                `No bookings found matching "${searchTerm}"`
              ) : (
                <>
                  {activeTab === 'upcoming' && 'No upcoming bookings found'}
                  {activeTab === 'pending' && 'No pending bookings found'}
                  {activeTab === 'completed' && 'No completed bookings found'}
                  {activeTab === 'cancelled' && 'No cancelled bookings found'}
                  {activeTab === 'past' && 'No past bookings found'}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
