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
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
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
