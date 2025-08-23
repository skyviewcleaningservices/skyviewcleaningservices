'use client';

import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';

// ---- Interfaces ----
interface Booking {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  serviceType: string;
  frequency: string;
  preferredDate: string;
  preferredTime: string;
  flatType: string;
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
  bookingId: number,
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

type AdminTab = 'upcoming' | 'pending' | 'completed' | 'cancelled' | 'past';

const TAB_LABELS: Record<AdminTab, string> = {
  upcoming: 'Upcoming',
  pending: 'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
  past: 'Past',
};

// ---- Utility Functions ----
const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const classifyBookings = (bookings: Booking[]) => {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  return {
    upcoming: bookings.filter(b => new Date(b.preferredDate) >= todayEnd),
    past: bookings.filter(b => new Date(b.preferredDate) < todayStart),
    pending: bookings.filter(b => b.status === 'PENDING'),
    completed: bookings.filter(b => b.status === 'COMPLETED'),
    cancelled: bookings.filter(b => b.status === 'CANCELLED'),
  };
};

// ---- Components ----
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
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (newValue !== initialValue?.toString()) onChange(newValue);
    }, debounce);
  }, [debounce, onChange, initialValue]);

  const handleBlur = useCallback(() => {
    if (val !== initialValue?.toString()) onChange(val);
  }, [val, initialValue, onChange]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
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

const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
    </div>
  );
});

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
  const isOverdue = useMemo(() => {
    const today = getToday();
    const bookingDate = new Date(booking.preferredDate);
    return bookingDate < today && booking.status !== 'COMPLETED';
  }, [booking.preferredDate, booking.status]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateBookingStatus(booking.id, e.target.value as Booking['status'], booking.remarks, booking.paymentAmount, booking.paymentType);
  }, [booking.id, booking.remarks, booking.paymentAmount, booking.paymentType, updateBookingStatus]);

  const handlePaymentTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateBookingStatus(booking.id, booking.status, booking.remarks, booking.paymentAmount, (e.target.value as Booking['paymentType']) || undefined);
  }, [booking.id, booking.status, booking.remarks, booking.paymentAmount, updateBookingStatus]);

  const handlePaymentAmountChange = useCallback((val: string) => {
    updateBookingStatus(booking.id, booking.status, booking.remarks, parseFloat(val) || undefined, booking.paymentType);
  }, [booking.id, booking.status, booking.remarks, booking.paymentType, updateBookingStatus]);

  const handleRemarksChange = useCallback((val: string) => {
    updateBookingStatus(booking.id, booking.status, val || undefined, booking.paymentAmount, booking.paymentType);
  }, [booking.id, booking.status, booking.paymentAmount, booking.paymentType, updateBookingStatus]);

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
          <div className="text-sm text-gray-500">{booking.flatType.replace('_', ' ')}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
            {formatDate(booking.preferredDate)}
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
          {STATUS_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
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
          {PAYMENT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
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
          onClick={() => window.open(`/admin/booking/${booking.id}`, '_blank')}
          className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
        >
          View Details
        </button>
      </td>
    </tr>
  );
});

const TableHeader = memo(function TableHeader() {
  const headers = ['Customer', 'Service', 'Date & Time', 'Status', 'Payment Amount', 'Payment Type', 'Remarks', 'Actions'];
  return (
    <thead className="bg-gray-50">
      <tr>
        {headers.map((header) => (
          <th key={header} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
            {header}
          </th>
        ))}
      </tr>
    </thead>
  );
});


// ---- Main Dashboard Component ----
export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingBookings, setUpdatingBookings] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('upcoming');

  const lastUpdateCache = useRef<Record<string, any>>({});

  const filteredBookings = useMemo(() => {
    if (!searchTerm.trim()) return bookings;
    const term = searchTerm.toLowerCase();
    return bookings.filter(
      b =>
        b.name.toLowerCase().includes(term) ||
        b.phone.includes(term) ||
        b.email.toLowerCase().includes(term) ||
        b.serviceType.toLowerCase().includes(term)
    );
  }, [bookings, searchTerm]);

  const tabCounts = useMemo(() => {
    const classified = classifyBookings(allBookings);
    return {
      ...Object.fromEntries(Object.entries(classified).map(([k, v]) => [k, v.length])),
    } as Record<AdminTab, number>;
  }, [allBookings]);

  const fetchBookings = useCallback(async (showRefreshing = false, showTabLoading = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else if (showTabLoading) {
        setTabLoading(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`/api/bookings?tab=${activeTab}`);
      if (!response.ok) throw new Error('Failed to fetch bookings');

      const data = await response.json();
      setBookings(data.bookings);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error fetching bookings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setTabLoading(false);
    }
  }, [activeTab]);

  const fetchAllBookings = useCallback(async () => {
    try {
      const response = await fetch('/api/bookings?tab=all');
      if (!response.ok) throw new Error('Failed to fetch all bookings');

      const data = await response.json();
      setAllBookings(data.bookings);
    } catch (err) {
      console.error('Error fetching all bookings:', err);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchAllBookings();
  }, [fetchBookings, fetchAllBookings]);

  const updateBookingStatus = useCallback<UpdateFn>(
    async (bookingId, status, remarks, paymentAmount, paymentType) => {
      const payload = { status, remarks, paymentAmount, paymentType };
      const last = lastUpdateCache.current[bookingId];
      if (last && JSON.stringify(last) === JSON.stringify(payload)) return;

      lastUpdateCache.current[bookingId] = payload;

      // Optimistic update
      setBookings(prev =>
        prev.map(b => (b.id === bookingId ? { ...b, ...payload, updatedAt: new Date().toISOString() } : b))
      );

      setUpdatingBookings(prev => new Set(prev).add(bookingId));

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

        const res = await fetch(`/api/bookings/${bookingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) throw new Error('Update failed');
      } catch (err) {
        console.error('Update error:', err);
        // rollback: re-fetch instead of manual revert
        fetchBookings();
      } finally {
        setUpdatingBookings(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookingId);
          return newSet;
        });
      }
    },
    [fetchBookings]
  );

  const handleRefresh = useCallback(() => {
    fetchBookings(true);
    fetchAllBookings();
  }, [fetchBookings, fetchAllBookings]);
  
  const handleTabChange = useCallback((tab: AdminTab) => {
    setActiveTab(tab);
    fetchBookings(false, true); // Show tab loading state
  }, [fetchBookings]);

  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-600">{error}</div>;

  return (
      <div className="max-w-7xl mx-auto">
        {/* Main Dashboard */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          {/* Navigation Bar */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              {/* Tabs */}
              <nav className="flex space-x-6">
                {(Object.keys(TAB_LABELS) as AdminTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    disabled={tabLoading}
                    className={`py-2 px-3 rounded-md font-semibold text-sm transition-colors flex items-center ${
                      activeTab === tab
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    } ${tabLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {tabLoading && activeTab === tab ? (
                      <>
                        <div className="w-3 h-3 border border-indigo-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      `${TAB_LABELS[tab]} (${tabCounts[tab]})`
                    )}
                  </button>
                ))}
              </nav>
              
              {/* Actions */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search bookings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 w-64 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm font-medium transition-colors"
                >
                  {refreshing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {tabLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-600 font-medium">Loading bookings...</span>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <TableHeader />
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredBookings.map(b => (
                    <BookingRow
                      key={b.id}
                      booking={b}
                      updateBookingStatus={updateBookingStatus}
                      formatDate={(d: string) => new Date(d).toLocaleDateString()}
                      isUpdating={updatingBookings.has(b.id)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Empty State */}
          {filteredBookings.length === 0 && (
            <div className="text-center py-16">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm.trim() ? 'No matching bookings' : `No ${TAB_LABELS[activeTab].toLowerCase()} bookings`}
              </h3>
              <p className="text-gray-500">
                {searchTerm.trim() 
                  ? `No bookings found matching "${searchTerm}"`
                  : `There are no ${TAB_LABELS[activeTab].toLowerCase()} bookings at the moment.`
                }
              </p>
            </div>
          )}
        </div>
      </div>
  );
}
