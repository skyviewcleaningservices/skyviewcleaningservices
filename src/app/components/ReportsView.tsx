'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { authFetch } from '@/lib/tokenUtils';
import { startPdf } from '@/lib/pdf';
import { autoTable } from 'jspdf-autotable';
import type { jsPDF } from 'jspdf';

interface Booking {
  id: number;
  serviceType: string;
  area?: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  paymentAmount?: number;
  paymentType?: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER';
  preferredDate: string;
  createdAt: string;
}

interface Row {
  label: string;
  count: number;
  revenue: number;
}

interface CollectionPoint {
  key: string;
  label: string;
  shortLabel: string;
  amount: number;
  count: number;
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

// Amount actually collected (paymentAmount present), grouped by calendar month
// of the service date — the most recent 12 months that have a collection.
function buildMonthlyCollections(bookings: Booking[]): CollectionPoint[] {
  const map = new Map<string, CollectionPoint>();
  for (const b of bookings) {
    if (b.paymentAmount == null) continue;
    const d = new Date(b.preferredDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const point = map.get(key) || {
      key,
      label: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
      // Always includes the year (not just "Aug") — the 12-month window can
      // span a year boundary, and the same month name would otherwise repeat
      // with no way to tell which year's bar is which.
      shortLabel: `${d.toLocaleDateString('en-US', { month: 'short' })} '${String(d.getFullYear()).slice(-2)}`,
      amount: 0,
      count: 0,
    };
    point.amount += b.paymentAmount;
    point.count += 1;
    map.set(key, point);
  }
  return Array.from(map.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-12);
}

// Same, grouped by calendar year.
function buildYearlyCollections(bookings: Booking[]): CollectionPoint[] {
  const map = new Map<string, CollectionPoint>();
  for (const b of bookings) {
    if (b.paymentAmount == null) continue;
    const year = String(new Date(b.preferredDate).getFullYear());
    const point = map.get(year) || { key: year, label: year, shortLabel: year, amount: 0, count: 0 };
    point.amount += b.paymentAmount;
    point.count += 1;
    map.set(year, point);
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
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

// A real bar chart (not the horizontal-bar-list style used above) — better
// suited to showing a trend across time.
function CollectionsChart({ points, height = 200 }: { points: CollectionPoint[]; height?: number }) {
  const width = 760;
  const padBottom = 28;
  const max = Math.max(1, ...points.map(p => p.amount));
  const gap = 10;
  const barWidth = points.length ? (width - (points.length - 1) * gap) / points.length : 0;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Bar chart of amount collected per period: ${points.map(p => `${p.label} ₹${Math.round(p.amount)}`).join(', ')}`}
        className="w-full h-auto"
      >
        <g className="text-gray-400" stroke="currentColor" strokeWidth="1">
          <line x1="0" y1={height - padBottom} x2={width} y2={height - padBottom} />
        </g>
        {points.map((p, i) => {
          const barH = (p.amount / max) * (height - padBottom - 20);
          const x = i * (barWidth + gap);
          const y = height - padBottom - barH;
          return (
            <g key={p.key}>
              <rect x={x} y={y} width={barWidth} height={barH} rx="3" className="fill-indigo-500" />
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="11" className="fill-gray-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {p.amount >= 1000 ? `₹${Math.round(p.amount / 1000)}k` : `₹${Math.round(p.amount)}`}
              </text>
              <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" fontSize="11" className="fill-gray-500">
                {p.shortLabel}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="text-xs text-gray-400 mt-1">Amount collected, by period. Bars are proportional to the largest period shown.</figcaption>
    </figure>
  );
}

function drawCollectionsChartToPdf(doc: jsPDF, points: CollectionPoint[], startY: number): number {
  const chartX = 14;
  const chartW = 182;
  const chartH = 55;
  const gap = 2;
  const max = Math.max(1, ...points.map(p => p.amount));
  const barW = points.length ? (chartW - (points.length - 1) * gap) / points.length : 0;

  doc.setDrawColor(200);
  doc.line(chartX, startY + chartH, chartX + chartW, startY + chartH);

  points.forEach((p, i) => {
    const barH = (p.amount / max) * (chartH - 6);
    const x = chartX + i * (barW + gap);
    const y = startY + chartH - barH;
    doc.setFillColor(79, 70, 229);
    doc.rect(x, y, barW, barH, 'F');
    doc.setFontSize(6);
    doc.setTextColor(110);
    doc.text(p.shortLabel, x + barW / 2, startY + chartH + 5, { align: 'center' });
  });

  doc.setTextColor(0);
  return startY + chartH + 12;
}

export default function ReportsView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch('/api/bookings?tab=all')
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

  const monthlyCollections = useMemo(() => buildMonthlyCollections(bookings), [bookings]);
  const yearlyCollections = useMemo(() => buildYearlyCollections(bookings), [bookings]);
  const totalCollected = useMemo(
    () => bookings.reduce((sum, b) => sum + (b.paymentAmount || 0), 0),
    [bookings]
  );

  const handleExportCollectionsPdf = useCallback(() => {
    // "Rs." not "₹" below — jsPDF's built-in fonts don't include the Rupee glyph,
    // it renders as a garbled character otherwise.
    const doc = startPdf('Collections Report');

    doc.setFontSize(11);
    doc.text(`Total collected to date: Rs. ${totalCollected.toLocaleString('en-IN')}`, 14, 38);

    doc.setFontSize(10);
    doc.text('By month', 14, 48);
    let nextY = drawCollectionsChartToPdf(doc, monthlyCollections, 52);
    autoTable(doc, {
      startY: nextY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
      head: [['Month', 'Collected', 'Bookings']],
      body: monthlyCollections.map(p => [p.label, `Rs. ${p.amount.toLocaleString('en-IN')}`, String(p.count)]),
    });

    // @ts-expect-error - lastAutoTable is attached by the plugin at runtime
    nextY = (doc.lastAutoTable?.finalY || nextY) + 14;
    if (nextY > 250) {
      doc.addPage();
      nextY = 20;
    }
    doc.setFontSize(10);
    doc.text('By year', 14, nextY);
    nextY = drawCollectionsChartToPdf(doc, yearlyCollections, nextY + 4);
    autoTable(doc, {
      startY: nextY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
      head: [['Year', 'Collected', 'Bookings']],
      body: yearlyCollections.map(p => [p.label, `Rs. ${p.amount.toLocaleString('en-IN')}`, String(p.count)]),
    });

    doc.save(`skyview-collections-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [monthlyCollections, yearlyCollections, totalCollected]);

  if (loading) return <div className="text-center py-4">Loading reports...</div>;
  if (error) return <div className="text-red-600 text-center py-4">{error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Reports</h2>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Collections</h3>
            <p className="text-xs text-gray-500 mt-1">
              Total collected to date: <span className="font-semibold text-gray-700">₹{totalCollected.toLocaleString('en-IN')}</span>
            </p>
          </div>
          <button
            onClick={handleExportCollectionsPdf}
            className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center text-xs font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2h-4.586a1 1 0 01-.707-.293l-1.414-1.414A1 1 0 0011.586 3H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Export PDF
          </button>
        </div>

        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">By month (last 12)</p>
        {monthlyCollections.length === 0 ? (
          <p className="text-sm text-gray-400 mb-6">No payments recorded yet.</p>
        ) : (
          <div className="mb-6"><CollectionsChart points={monthlyCollections} /></div>
        )}

        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">By year</p>
        {yearlyCollections.length === 0 ? (
          <p className="text-sm text-gray-400">No payments recorded yet.</p>
        ) : (
          <CollectionsChart points={yearlyCollections} height={160} />
        )}
      </div>

      <BarTable title="Bookings & revenue by month" rows={byMonth} valueKey="revenue" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BarTable title="Revenue by payment method" rows={byPaymentType} valueKey="revenue" />
        <BarTable title="Bookings by service tier" rows={byServiceType} valueKey="count" />
      </div>

      <BarTable title="Bookings by Pune area" rows={byArea} valueKey="count" />
    </div>
  );
}
