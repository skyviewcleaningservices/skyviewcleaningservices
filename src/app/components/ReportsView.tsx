'use client';

import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { authFetch } from '@/lib/tokenUtils';
import { startPdf } from '@/lib/pdf';
import { autoTable } from 'jspdf-autotable';
import type { jsPDF } from 'jspdf';
import { SERVED_PUNE_AREAS } from '@/lib/areas';

interface Booking {
  id: number;
  serviceType: string;
  flatType: string;
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

// Only these four tiers — Studio/Penthouse are excluded from this report by design.
const FLAT_TIERS: { key: string; label: string }[] = [
  { key: 'ONE_BHK', label: '1 BHK' },
  { key: 'TWO_BHK', label: '2 BHK' },
  { key: 'THREE_BHK', label: '3 BHK' },
  { key: 'FOUR_BHK', label: '4 BHK' },
];

// Legacy/imported bookings can have area values that only differ by case
// (e.g. "kothrud" vs "Kothrud"), which would otherwise show as separate rows.
function canonicalizeArea(area: string | undefined): string {
  if (!area || area === 'Other') return 'Other / Unspecified';
  const trimmed = area.trim();
  const match = SERVED_PUNE_AREAS.find(a => a.toLowerCase() === trimmed.toLowerCase());
  if (match) return match;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

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

// Amount actually collected (paymentAmount present), grouped by calendar
// month for one specific year — always all 12 months, Jan through Dec, even
// where a month has no collections.
function buildMonthlyCollectionsForYear(bookings: Booking[], year: number): CollectionPoint[] {
  const points: CollectionPoint[] = Array.from({ length: 12 }, (_, i) => {
    const monthDate = new Date(year, i, 1);
    return {
      key: `${year}-${String(i + 1).padStart(2, '0')}`,
      label: monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
      shortLabel: monthDate.toLocaleDateString('en-US', { month: 'short' }),
      amount: 0,
      count: 0,
    };
  });
  for (const b of bookings) {
    if (b.paymentAmount == null) continue;
    const d = new Date(b.preferredDate);
    if (d.getFullYear() !== year) continue;
    const point = points[d.getMonth()];
    point.amount += b.paymentAmount;
    point.count += 1;
  }
  return points;
}

// Booking counts per flat tier (1/2/3/4 BHK only) for one calendar year —
// always returns all four tiers, in order, even when a tier has zero bookings.
function buildFlatTierRowsForYear(bookings: Booking[], year: number): Row[] {
  const rows = new Map(FLAT_TIERS.map(t => [t.key, { label: t.label, count: 0, revenue: 0 }]));
  for (const b of bookings) {
    if (new Date(b.preferredDate).getFullYear() !== year) continue;
    const row = rows.get(b.flatType);
    if (!row) continue;
    row.count += 1;
    row.revenue += b.paymentAmount || 0;
  }
  return FLAT_TIERS.map(t => rows.get(t.key)!);
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

function BarTable({ title, rows, valueKey, extra }: { title: string; rows: Row[]; valueKey: 'count' | 'revenue'; extra?: ReactNode }) {
  const max = Math.max(1, ...rows.map(r => r[valueKey]));
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {extra}
      </div>
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

  const byPaymentType = useMemo(
    () =>
      buildRows(
        bookings.filter(b => b.paymentType),
        b => PAYMENT_TYPE_LABELS[b.paymentType || ''] || b.paymentType || 'Unknown'
      ),
    [bookings]
  );

  const availableYears = useMemo(() => {
    const years = new Set(notCancelled.map(b => new Date(b.preferredDate).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [notCancelled]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Default to the most recent year with data, once it's known — but only
  // set it once, so picking an older year doesn't get overwritten on refetch.
  useEffect(() => {
    if (selectedYear === null && availableYears.length > 0) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const byFlatTier = useMemo(
    () => (selectedYear === null ? [] : buildFlatTierRowsForYear(notCancelled, selectedYear)),
    [notCancelled, selectedYear]
  );

  const byArea = useMemo(
    () => buildRows(notCancelled, b => canonicalizeArea(b.area)),
    [notCancelled]
  );

  // Years that actually have a recorded collection — drives the "By month" dropdown.
  const collectionYears = useMemo(() => {
    const years = new Set(
      bookings.filter(b => b.paymentAmount != null).map(b => new Date(b.preferredDate).getFullYear())
    );
    return Array.from(years).sort((a, b) => b - a);
  }, [bookings]);

  const [selectedCollectionYear, setSelectedCollectionYear] = useState<number | null>(null);

  useEffect(() => {
    if (selectedCollectionYear === null && collectionYears.length > 0) {
      setSelectedCollectionYear(collectionYears[0]);
    }
  }, [collectionYears, selectedCollectionYear]);

  const monthlyCollections = useMemo(
    () => (selectedCollectionYear === null ? [] : buildMonthlyCollectionsForYear(bookings, selectedCollectionYear)),
    [bookings, selectedCollectionYear]
  );

  const [yearRange, setYearRange] = useState<3 | 5 | 'all'>(5);
  const yearlyCollectionsAll = useMemo(() => buildYearlyCollections(bookings), [bookings]);
  const yearlyCollections = useMemo(
    () => (yearRange === 'all' ? yearlyCollectionsAll : yearlyCollectionsAll.slice(-yearRange)),
    [yearlyCollectionsAll, yearRange]
  );

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
    doc.text(`By month — ${selectedCollectionYear ?? ''}`, 14, 48);
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
    doc.text(`By year${yearRange === 'all' ? '' : ` (last ${yearRange})`}`, 14, nextY);
    nextY = drawCollectionsChartToPdf(doc, yearlyCollections, nextY + 4);
    autoTable(doc, {
      startY: nextY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
      head: [['Year', 'Collected', 'Bookings']],
      body: yearlyCollections.map(p => [p.label, `Rs. ${p.amount.toLocaleString('en-IN')}`, String(p.count)]),
    });

    doc.save(`skyview-collections-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [monthlyCollections, yearlyCollections, totalCollected, selectedCollectionYear, yearRange]);

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

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">By month</p>
          {collectionYears.length > 0 && selectedCollectionYear !== null && (
            <select
              value={selectedCollectionYear}
              onChange={(e) => setSelectedCollectionYear(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {collectionYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        </div>
        {monthlyCollections.length === 0 || collectionYears.length === 0 ? (
          <p className="text-sm text-gray-400 mb-6">No payments recorded yet.</p>
        ) : (
          <div className="mb-6"><CollectionsChart points={monthlyCollections} /></div>
        )}

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">By year</p>
          <div className="flex gap-1">
            {([3, 5, 'all'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setYearRange(opt)}
                className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                  yearRange === opt
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt === 'all' ? 'All' : `Last ${opt}`}
              </button>
            ))}
          </div>
        </div>
        {yearlyCollections.length === 0 ? (
          <p className="text-sm text-gray-400">No payments recorded yet.</p>
        ) : (
          <CollectionsChart points={yearlyCollections} height={160} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BarTable title="Revenue by payment method" rows={byPaymentType} valueKey="revenue" />
        <BarTable
          title="Bookings by flat type"
          rows={byFlatTier}
          valueKey="count"
          extra={
            availableYears.length > 0 && selectedYear !== null ? (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            ) : null
          }
        />
      </div>

      <BarTable title="Bookings by Pune area" rows={byArea} valueKey="count" />
    </div>
  );
}
