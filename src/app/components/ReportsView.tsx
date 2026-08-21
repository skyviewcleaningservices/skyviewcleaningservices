'use client';

import { useState, useEffect, useMemo } from 'react';

interface Booking {
  id: number;
  serviceType: string;
  area?: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  paymentAmount?: number;
  paymentType?: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER';
  createdAt: string;
}

interface Row {
  label: string;
  count: number;
  revenue: number;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  'regular-cleaning': 'General Cleaning',
  'deep-cleaning': 'Deep Cleaning',
  'full-deep-cleaning': 'Full Deep Cleaning',
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
};

function buildRows(bookings: Booking[], keyFn: (b: Booking) => string): Row[] {
  const map = new Map<string, Row>();
  for (const b of bookings) {
    const key = keyFn(b);
    const row = map.get(key) || { label: key, count: 0, revenue: 0 };
    row.count += 1;
    row.revenue += b.paymentAmount || 0;
    map.set(key, row);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function BarTable({ title, rows, valueKey }: { title: string; rows: Row[]; valueKey: 'count' | 'revenue' }) {
  const max = Math.max(1, ...rows.map(r => r[valueKey]));
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map(row => (
            <div key={row.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{row.label}</span>
                <span className="text-gray-500">
                  {valueKey === 'revenue'
                    ? `₹${row.revenue.toLocaleString('en-IN')} (${row.count} booking${row.count === 1 ? '' : 's'})`
                    : `${row.count} booking${row.count === 1 ? '' : 's'}`}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${(row[valueKey] / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportsView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/bookings?tab=all')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch bookings');
        return res.json();
      })
      .then(data => setBookings(data.bookings))
      .catch(err => {
        console.error(err);
        setError('Error loading report data. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  const notCancelled = useMemo(() => bookings.filter(b => b.status !== 'CANCELLED'), [bookings]);

  const byMonth = useMemo(
    () =>
      buildRows(notCancelled, b =>
        new Date(b.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      ).sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime()),
    [notCancelled]
  );

  const byPaymentType = useMemo(
    () =>
      buildRows(
        bookings.filter(b => b.paymentType),
        b => PAYMENT_TYPE_LABELS[b.paymentType || ''] || b.paymentType || 'Unknown'
      ),
    [bookings]
  );

  const byServiceType = useMemo(
    () => buildRows(notCancelled, b => SERVICE_TYPE_LABELS[b.serviceType] || b.serviceType),
    [notCancelled]
  );

  const byArea = useMemo(
    () => buildRows(notCancelled, b => (b.area && b.area !== 'Other' ? b.area : 'Other / Unspecified')),
    [notCancelled]
  );

  if (loading) return <div className="text-center py-4">Loading reports...</div>;
  if (error) return <div className="text-red-600 text-center py-4">{error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Reports</h2>

      <BarTable title="Bookings & revenue by month" rows={byMonth} valueKey="revenue" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BarTable title="Revenue by payment method" rows={byPaymentType} valueKey="revenue" />
        <BarTable title="Bookings by service tier" rows={byServiceType} valueKey="count" />
      </div>

      <BarTable title="Bookings by Pune area" rows={byArea} valueKey="count" />
    </div>
  );
}
