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
  className = "border border-gray-300 rounded-md px-2 py-1 text-sm w-full"
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
          className={`border border-gray-300 rounded-md px-2 py-1 text-sm w-32 ${isOverdue ? 'border-red-300' : ''}`}
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
          className="border border-gray-300 rounded-md px-2 py-1 text-sm w-full"
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
  activeTab: 'upcoming' | 'past';
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">
              {activeTab === 'upcoming' ? 'Upcoming' : 'Past'} Bookings
            </p>
            <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
          </div>
        </div>
      </div>
      
      {activeTab === 'upcoming' && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.overdue}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 rounded-lg">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

// ---- Main Dashboard Component ----
export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingBookings, setUpdatingBookings] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // Cache for last update to prevent unnecessary API calls
  const lastUpdateCache = useRef<Record<string, any>>({});

  const fetchBookings = useCallback(async (showRefreshing = false, includePast = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const url = includePast ? '/api/bookings?includePast=true' : '/api/bookings';
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
    }
  }, []);

  useEffect(() => {
    fetchBookings(false, activeTab === 'past');
  }, [fetchBookings, activeTab]);

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
      } catch (err) {
        console.error("Error updating booking:", err);
        // Revert optimistic update on error
        setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b } : b));
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
    fetchBookings(true, activeTab === 'past');
  }, [fetchBookings, activeTab]);

  const handleTabChange = useCallback((tab: 'upcoming' | 'past') => {
    setActiveTab(tab);
  }, []);

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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Booking Management</h1>

        {/* Booking Statistics */}
        <BookingStats bookings={bookings} activeTab={activeTab} />

        <div className="bg-white shadow rounded-lg">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => handleTabChange('upcoming')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'upcoming'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upcoming Bookings
                </div>
              </button>
              <button
                onClick={() => handleTabChange('past')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'past'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Past Bookings
                </div>
              </button>
            </nav>
          </div>

          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {activeTab === 'upcoming' ? 'Upcoming Bookings' : 'Past Bookings'} ({bookings.length})
              </h2>
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
            
            {activeTab === 'upcoming' && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Showing upcoming bookings (from today onwards) sorted by date
                </p>
              </div>
            )}

            {activeTab === 'past' && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <p className="text-sm text-gray-800 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Showing past bookings (before today) sorted by date
                </p>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <TableHeader />
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
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

          {bookings.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {activeTab === 'upcoming' ? 'No upcoming bookings found' : 'No past bookings found'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
