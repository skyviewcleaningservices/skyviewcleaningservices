'use client';

import { useState, useEffect, useMemo } from 'react';
import { authFetch } from '@/lib/tokenUtils';

interface Booking {
  id: number;
  name: string;
  email: string;
  phone: string;
  serviceType: string;
  frequency: string;
  preferredDate: string;
  preferredTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

const STATUS_BADGE: Record<Booking['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-200 text-gray-600',
};

const getDateKey = (isoString: string) => isoString.slice(0, 10);

const addDaysToKey = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Formats a "H:mm" / "HH:mm" 24-hour time string (as stored on the booking)
// into a readable "h:mm AM/PM" for display on the upcoming-jobs cards.
function formatTime(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${period}`;
}

function groupByUpcomingDay(bookings: Booking[]) {
  // Local calendar date, not new Date().toISOString().slice(0, 10) — that's
  // the UTC date, which is a day behind local "today" for part of the day
  // (e.g. 12:00-5:30am IST is still the previous UTC date).
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const buckets: { label: string; dateKey: string; bookings: Booking[] }[] = [
    { label: 'Today', dateKey: todayKey, bookings: [] },
    { label: 'Tomorrow', dateKey: addDaysToKey(todayKey, 1), bookings: [] },
    { label: 'Day After Tomorrow', dateKey: addDaysToKey(todayKey, 2), bookings: [] },
  ];

  for (const booking of bookings) {
    const key = getDateKey(booking.preferredDate);
    const bucket = buckets.find(b => b.dateKey === key);
    if (bucket) bucket.bookings.push(booking);
  }

  for (const bucket of buckets) {
    bucket.bookings.sort((a, b) => {
      const [aH, aM] = a.preferredTime.split(':').map(Number);
      const [bH, bM] = b.preferredTime.split(':').map(Number);
      return (aH * 60 + (aM || 0)) - (bH * 60 + (bM || 0));
    });
  }

  return buckets;
}

interface DueCustomer {
  phone: string;
  name: string;
  email: string;
  serviceType: string;
  frequency: string;
  lastCleanDate: string;
  dueDate: string;
  bookingId: number;
}

const FREQUENCY_DAYS: Record<string, number> = {
  quaterly: 90,
  'bi-yearly': 180,
  yearly: 365,
};

const FREQUENCY_LABELS: Record<string, string> = {
  quaterly: 'Every 3 months',
  'bi-yearly': 'Every 6 months',
  yearly: 'Yearly',
};

function computeDueCustomers(bookings: Booking[]): DueCustomer[] {
  const byPhone = new Map<string, Booking[]>();
  for (const b of bookings) {
    if (!byPhone.has(b.phone)) byPhone.set(b.phone, []);
    byPhone.get(b.phone)!.push(b);
  }

  const due: DueCustomer[] = [];
  const now = Date.now();

  for (const [phone, customerBookings] of byPhone) {
    const completedRecurring = customerBookings
      .filter(b => b.status === 'COMPLETED' && FREQUENCY_DAYS[b.frequency])
      .sort((a, b) => new Date(b.preferredDate).getTime() - new Date(a.preferredDate).getTime());

    const lastCompleted = completedRecurring[0];
    if (!lastCompleted) continue;

    const lastCleanTime = new Date(lastCompleted.preferredDate).getTime();
    const dueTime = lastCleanTime + FREQUENCY_DAYS[lastCompleted.frequency] * 24 * 60 * 60 * 1000;
    if (dueTime > now) continue;

    // Skip if they've already booked again since that last completed clean
    const hasNewerBooking = customerBookings.some(
      b => b.id !== lastCompleted.id && new Date(b.preferredDate).getTime() > lastCleanTime
    );
    if (hasNewerBooking) continue;

    due.push({
      phone,
      name: lastCompleted.name,
      email: lastCompleted.email,
      serviceType: lastCompleted.serviceType,
      frequency: lastCompleted.frequency,
      lastCleanDate: lastCompleted.preferredDate,
      dueDate: new Date(dueTime).toISOString(),
      bookingId: lastCompleted.id,
    });
  }

  return due.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export default function ReminderView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sentIds, setSentIds] = useState<Set<number>>(new Set());
  const [sendError, setSendError] = useState<Record<number, string>>({});

  useEffect(() => {
    authFetch('/api/bookings?tab=all')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch bookings');
        return res.json();
      })
      .then(data => setBookings(data.bookings))
      .catch(err => {
        console.error(err);
        setError('Error loading reminder data. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  const dueCustomers = useMemo(() => computeDueCustomers(bookings), [bookings]);
  const upcomingByDay = useMemo(() => groupByUpcomingDay(bookings), [bookings]);

  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const handleStatusUpdate = async (bookingId: number, status: Booking['status']) => {
    setUpdatingId(bookingId);
    try {
      const res = await authFetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, status } : b)));
      }
    } catch (err) {
      console.error('Failed to update booking status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSend = async (customer: DueCustomer) => {
    setSendingId(customer.bookingId);
    setSendError(prev => ({ ...prev, [customer.bookingId]: '' }));
    try {
      const res = await authFetch('/api/admin/reminders/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: customer.bookingId }),
      });
      const data = await res.json();
      if (data.success) {
        setSentIds(prev => new Set(prev).add(customer.bookingId));
      } else {
        setSendError(prev => ({ ...prev, [customer.bookingId]: data.message || 'Failed to send' }));
      }
    } catch (err) {
      console.error(err);
      setSendError(prev => ({ ...prev, [customer.bookingId]: 'Failed to send' }));
    } finally {
      setSendingId(null);
    }
  };

  if (loading) return <div className="text-center py-4">Loading reminders...</div>;
  if (error) return <div className="text-red-600 text-center py-4">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reminders</h2>
        <p className="text-sm text-gray-500 mt-1">
          Customers on a recurring plan who are due for their next clean, based on their last completed booking.
          Sending is manual — nothing goes out automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {upcomingByDay.map(({ label, dateKey, bookings: dayBookings }) => (
          <div key={dateKey} className="bg-white shadow rounded-lg overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
              <p className="text-xs text-gray-500">
                {new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                {' · '}{dayBookings.length} booking{dayBookings.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {dayBookings.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-gray-400">Nothing scheduled</div>
              )}
              {dayBookings.map(booking => {
                const isIncomplete = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
                return (
                  <div key={booking.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{booking.name}</p>
                        <p className="text-xs text-gray-500">{formatTime(booking.preferredTime)} · {booking.serviceType}</p>
                      </div>
                      {!isIncomplete && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${STATUS_BADGE[booking.status]}`}>
                          {booking.status}
                        </span>
                      )}
                    </div>
                    {isIncomplete && (
                      <select
                        value={booking.status}
                        disabled={updatingId === booking.id}
                        onChange={(e) => handleStatusUpdate(booking.id, e.target.value as Booking['status'])}
                        className={`mt-1.5 text-xs font-medium rounded px-2 py-1 border-0 ${STATUS_BADGE[booking.status]} disabled:opacity-50`}
                      >
                        {STATUS_OPTIONS.map(({ value, label: optionLabel }) => (
                          <option key={value} value={value}>{optionLabel}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Due for a reminder ({dueCustomers.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {dueCustomers.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-gray-500">No one is due right now.</div>
          )}
          {dueCustomers.map(customer => {
            const isSent = sentIds.has(customer.bookingId);
            const isSending = sendingId === customer.bookingId;
            const error = sendError[customer.bookingId];
            return (
              <div key={customer.bookingId} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                  <div className="text-xs text-gray-500">
                    {customer.email || 'No email on file'} · {customer.phone}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {FREQUENCY_LABELS[customer.frequency] || customer.frequency} · last clean{' '}
                    {new Date(customer.lastCleanDate).toLocaleDateString()}
                  </div>
                  {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
                </div>
                {isSent ? (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded bg-green-100 text-green-700">
                    Sent
                  </span>
                ) : (
                  <button
                    onClick={() => handleSend(customer)}
                    disabled={isSending || !customer.email}
                    title={!customer.email ? 'No email on file' : undefined}
                    className="text-xs font-medium px-3 py-1.5 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? 'Sending...' : 'Send Reminder'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
