'use client';

import { useState, useEffect, useCallback, memo } from 'react';

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

// ---- Debounced Input (Generic) ----
const DebouncedInput = memo(function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 1000, // Increased to 2 seconds to reduce API calls
  type = 'text',
  placeholder,
  min,
}: {
  value: string | number | undefined;
  onChange: (val: string) => void;
  debounce?: number;
  type?: string;
  placeholder?: string;
  min?: string;
}) {
  const [val, setVal] = useState(initialValue?.toString() || '');

  useEffect(() => {
    setVal(initialValue?.toString() || '');
  }, [initialValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (val?.toString() !== initialValue?.toString()) {
        onChange(val);
      }
    }, debounce);
    return () => clearTimeout(handler);
  }, [val, initialValue, debounce, onChange]);

  return (
    <input
      type={type}
      value={val}
      min={min}
      placeholder={placeholder}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        // Also update on blur (when user clicks away)
        if (val?.toString() !== initialValue?.toString()) {
          onChange(val);
        }
      }}
      className="border border-gray-300 rounded-md px-2 py-1 text-sm w-full"
    />
  );
});

// ---- Row Component ----
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
  return (
    <tr key={booking.id} className="hover:bg-gray-50">
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
          <div className="text-sm font-medium text-gray-900">{formatDate(booking.preferredDate)}</div>
          <div className="text-sm text-gray-500">{booking.preferredTime}</div>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <select
          value={booking.status}
          onChange={(e) =>
            updateBookingStatus(
              booking.id,
              e.target.value as Booking['status'],
              booking.remarks,
              booking.paymentAmount,
              booking.paymentType
            )
          }
          className="border border-gray-300 rounded-md px-2 py-1 text-sm w-32"
        >
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </td>

      {/* Payment Amount */}
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="relative">
          <DebouncedInput
            type="number"
            min="0"
            value={booking.paymentAmount}
            placeholder="Amount"
            onChange={(val) =>
              updateBookingStatus(
                booking.id,
                booking.status,
                booking.remarks,
                parseFloat(val) || undefined,
                booking.paymentType
              )
            }
          />
          {isUpdating && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
      </td>

      {/* Payment Type */}
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <select
          value={booking.paymentType || ''}
          onChange={(e) =>
            updateBookingStatus(
              booking.id,
              booking.status,
              booking.remarks,
              booking.paymentAmount,
              (e.target.value as Booking['paymentType']) || undefined
            )
          }
          className="border border-gray-300 rounded-md px-2 py-1 text-sm w-full"
        >
          <option value="">Select Type</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="UPI">UPI</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
        </select>
      </td>

      {/* Remarks */}
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="relative">
          <DebouncedInput
            type="text"
            value={booking.remarks}
            placeholder="Add remarks..."
            onChange={(val) =>
              updateBookingStatus(
                booking.id,
                booking.status,
                val || undefined,
                booking.paymentAmount,
                booking.paymentType
              )
            }
          />
          {isUpdating && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          onClick={() => window.open(`/admin/booking/${booking.id}`, '_blank')}
          className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
        >
          Update
        </button>
      </td>
    </tr>
  );
});

// ---- Main Dashboard ----
export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingBookings, setUpdatingBookings] = useState<Set<string>>(new Set());

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bookings');
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      setBookings(data.bookings);
    } catch (err) {
      setError('Error fetching bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const updateBookingStatus = useCallback<UpdateFn>(
    async (bookingId, status, remarks, paymentAmount, paymentType) => {
      try {
        // Find the current booking to check if values have actually changed
        const currentBooking = bookings.find(b => b.id === bookingId);
        if (!currentBooking) return;

        // Check if any values have actually changed
        const hasChanges = 
          currentBooking.status !== status ||
          currentBooking.remarks !== remarks ||
          currentBooking.paymentAmount !== paymentAmount ||
          currentBooking.paymentType !== paymentType;

        if (!hasChanges) {
          console.log('No changes detected, skipping API call');
          return;
        }

        // Set updating state
        setUpdatingBookings(prev => new Set(prev).add(bookingId));

        console.log('Updating booking:', bookingId, { status, remarks, paymentAmount, paymentType });

        const response = await fetch(`/api/bookings/${bookingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, remarks, paymentAmount, paymentType }),
        });

        if (!response.ok) throw new Error('Update failed');
        
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? { ...b, status, remarks, paymentAmount, paymentType, updatedAt: new Date().toISOString() }
              : b
          )
        );
      } catch (err) {
        console.error('Error updating booking:', err);
      } finally {
        // Clear updating state
        setUpdatingBookings(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookingId);
          return newSet;
        });
      }
    },
    [bookings]
  );

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading bookings...</div>;
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Booking Management</h1>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold">All Bookings ({bookings.length})</h2>
            <button onClick={fetchBookings} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Customer', 'Service', 'Date & Time', 'Status', 'Payment Amount', 'Payment Type', 'Remarks', 'Actions'].map(
                    (head) => (
                      <th key={head} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {head}
                      </th>
                    )
                  )}
                </tr>
              </thead>
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

          {bookings.length === 0 && <div className="text-center py-12 text-gray-500">No bookings found</div>}
        </div>
      </div>
    </div>
  );
}
