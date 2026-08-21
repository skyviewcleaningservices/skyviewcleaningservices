'use client';

import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import CustomerHistoryModal from './CustomerHistoryModal';
import AddBookingModal from './AddBookingModal';
import ImportBookingsModal from './ImportBookingsModal';
import { authFetch } from '@/lib/tokenUtils';
import { startPdf, PDF_TABLE_START_Y } from '@/lib/pdf';
import { autoTable } from 'jspdf-autotable';

// ---- Interfaces ----
interface Booking {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  area?: string;
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
  paymentType?: Booking['paymentType'],
  statusReason?: string
) => Promise<void>;

// ---- Constants ----
const DEBOUNCE_DELAY = 1000;
const API_TIMEOUT = 5000;
// Purely informational thresholds for the week strip below — not a booking limit.
const BUSY_THRESHOLD = 6;
const FULL_THRESHOLD = 10;
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
// Explicit dd/mm/yyyy — toLocaleDateString() alone follows the browser's
// locale, which isn't reliably dd/mm/yyyy for every admin.
const formatDateDMY = (d: string) => {
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

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
export const DebouncedInput = memo(function DebouncedInput({
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
  onViewHistory,
}: {
  booking: Booking;
  updateBookingStatus: UpdateFn;
  formatDate: (d: string) => string;
  isUpdating: boolean;
  onViewHistory: (phone: string) => void;
}) {
  const isOverdue = useMemo(() => {
    const today = getToday();
    const bookingDate = new Date(booking.preferredDate);
    return bookingDate < today && booking.status !== 'COMPLETED';
  }, [booking.preferredDate, booking.status]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateBookingStatus(booking.id, e.target.value as Booking['status'], booking.remarks, booking.paymentAmount, booking.paymentType, booking.statusReason);
  }, [booking.id, booking.remarks, booking.paymentAmount, booking.paymentType, booking.statusReason, updateBookingStatus]);

  const handlePaymentTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateBookingStatus(booking.id, booking.status, booking.remarks, booking.paymentAmount, (e.target.value as Booking['paymentType']) || undefined, booking.statusReason);
  }, [booking.id, booking.status, booking.remarks, booking.paymentAmount, booking.statusReason, updateBookingStatus]);

  const handlePaymentAmountChange = useCallback((val: string) => {
    updateBookingStatus(booking.id, booking.status, booking.remarks, parseFloat(val) || undefined, booking.paymentType, booking.statusReason);
  }, [booking.id, booking.status, booking.remarks, booking.paymentType, booking.statusReason, updateBookingStatus]);

  const handleRemarksChange = useCallback((val: string) => {
    updateBookingStatus(booking.id, booking.status, val || undefined, booking.paymentAmount, booking.paymentType, booking.statusReason);
  }, [booking.id, booking.status, booking.paymentAmount, booking.paymentType, booking.statusReason, updateBookingStatus]);

  const handleAccept = useCallback(() => {
    updateBookingStatus(booking.id, 'CONFIRMED', booking.remarks, booking.paymentAmount, booking.paymentType, booking.statusReason);
  }, [booking.id, booking.remarks, booking.paymentAmount, booking.paymentType, booking.statusReason, updateBookingStatus]);

  const handleDecline = useCallback(() => {
    const reason = window.prompt('Reason for declining this booking?') || undefined;
    updateBookingStatus(booking.id, 'CANCELLED', booking.remarks, booking.paymentAmount, booking.paymentType, reason);
  }, [booking.id, booking.remarks, booking.paymentAmount, booking.paymentType, updateBookingStatus]);

  return (
    <tr className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">{booking.name}</div>
          <div className="text-sm text-gray-500">{booking.phone}</div>
        </div>
      </td>
      <td className="px-6 py-4 max-w-[180px]">
        <div>
          <div className="text-sm font-medium text-gray-900 break-words" title={booking.serviceType}>{booking.serviceType}</div>
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
        <div className="flex flex-col items-start gap-1.5">
          {booking.status === 'PENDING' && (
            <div className="flex gap-1.5">
              <button
                onClick={handleAccept}
                className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
              >
                ✓ Accept
              </button>
              <button
                onClick={handleDecline}
                className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
              >
                ✕ Decline
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => window.open(`/admin/booking/${booking.id}`, '_blank')}
              className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
            >
              View / Edit
            </button>
            <button
              onClick={() => onViewHistory(booking.phone)}
              className="text-gray-500 hover:text-gray-800 text-xs font-medium"
            >
              History
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
});

const getDateKey = (isoString: string) => isoString.slice(0, 10);

const addDaysToKey = (key: string, days: number) => {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return getDateKey(d.toISOString());
};

const WeekStrip = memo(function WeekStrip({ bookings }: { bookings: Booking[] }) {
  const days = useMemo(() => {
    const todayKey = getDateKey(new Date().toISOString());
    return Array.from({ length: 7 }, (_, i) => {
      const key = addDaysToKey(todayKey, i);
      const count = bookings.filter(b => b.status !== 'CANCELLED' && getDateKey(b.preferredDate) === key).length;
      const label = new Date(`${key}T00:00:00.000Z`).toLocaleDateString('en-US', {
        weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
      });
      return { key, count, label };
    });
  }, [bookings]);

  return (
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Next 7 days at a glance</p>
      <div className="grid grid-cols-7 gap-2">
        {days.map(({ key, count, label }) => {
          const level = count >= FULL_THRESHOLD ? 'full' : count >= BUSY_THRESHOLD ? 'busy' : 'normal';
          return (
            <div
              key={key}
              title={`${count} booking${count === 1 ? '' : 's'} on ${label}`}
              className={`rounded-md border px-2 py-2 text-center ${
                level === 'full' ? 'bg-red-50 border-red-200' :
                level === 'busy' ? 'bg-amber-50 border-amber-200' :
                'bg-white border-gray-200'
              }`}
            >
              <div className="text-[10px] font-semibold uppercase text-gray-500">{label}</div>
              <div className={`text-lg font-bold ${
                level === 'full' ? 'text-red-600' : level === 'busy' ? 'text-amber-600' : 'text-gray-900'
              }`}>
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

type SortField = 'customer' | 'date';
type SortDir = 'asc' | 'desc';

const TableHeader = memo(function TableHeader({
  sortField,
  sortDir,
  onSort,
}: {
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const headers: { label: string; field?: SortField }[] = [
    { label: 'Customer', field: 'customer' },
    { label: 'Service' },
    { label: 'Date & Time', field: 'date' },
    { label: 'Status' },
    { label: 'Payment Amount' },
    { label: 'Payment Type' },
    { label: 'Remarks' },
    { label: 'Actions' },
  ];
  return (
    <thead className="bg-gray-50">
      <tr>
        {headers.map(({ label, field }) => (
          <th key={label} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
            {field ? (
              <button
                type="button"
                onClick={() => onSort(field)}
                className="flex items-center gap-1 hover:text-gray-900"
              >
                {label}
                <span className="text-[10px]">
                  {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                </span>
              </button>
            ) : (
              label
            )}
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
  const [historyPhone, setHistoryPhone] = useState<string | null>(null);
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDir(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'date' ? 'desc' : 'asc');
    }
  }, [sortField]);

  const lastUpdateCache = useRef<Record<string, any>>({});
  const fetchAbortRef = useRef<AbortController | null>(null);

  const filteredBookings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? bookings.filter(
          b =>
            b.name.toLowerCase().includes(term) ||
            b.phone.includes(term) ||
            b.email.toLowerCase().includes(term) ||
            b.serviceType.toLowerCase().includes(term)
        )
      : bookings;

    const sorted = [...filtered].sort((a, b) => {
      const cmp = sortField === 'date'
        ? new Date(a.preferredDate).getTime() - new Date(b.preferredDate).getTime()
        : a.name.localeCompare(b.name);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [bookings, searchTerm, sortField, sortDir]);

  const tabCounts = useMemo(() => {
    const classified = classifyBookings(allBookings);
    return {
      ...Object.fromEntries(Object.entries(classified).map(([k, v]) => [k, v.length])),
    } as Record<AdminTab, number>;
  }, [allBookings]);

  // `tab` is always passed explicitly (never read from `activeTab` state) so a fast tab
  // switch can't fetch with a stale tab value from before React commits the new one.
  // The abort controller cancels any in-flight request from a previous tab so an
  // out-of-order response can never overwrite the currently-selected tab's data.
  const fetchBookings = useCallback(async (
    tab: AdminTab,
    { showRefreshing = false, showTabLoading = false }: { showRefreshing?: boolean; showTabLoading?: boolean } = {}
  ) => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else if (showTabLoading) {
        setTabLoading(true);
      } else {
        setLoading(true);
      }

      const response = await authFetch(`/api/bookings?tab=${tab}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Failed to fetch bookings');

      const data = await response.json();
      setBookings(data.bookings);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error(err);
      setError('Error fetching bookings. Please try again.');
    } finally {
      if (fetchAbortRef.current === controller) {
        setLoading(false);
        setRefreshing(false);
        setTabLoading(false);
      }
    }
  }, []);

  const fetchAllBookings = useCallback(async () => {
    try {
      const response = await authFetch('/api/bookings?tab=all');
      if (!response.ok) throw new Error('Failed to fetch all bookings');

      const data = await response.json();
      setAllBookings(data.bookings);
    } catch (err) {
      console.error('Error fetching all bookings:', err);
    }
  }, []);

  // Runs once on mount — fetchBookings/fetchAllBookings are stable (empty dep arrays).
  useEffect(() => {
    fetchBookings(activeTab);
    fetchAllBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateBookingStatus = useCallback<UpdateFn>(
    async (bookingId, status, remarks, paymentAmount, paymentType, statusReason) => {
      const payload = { status, remarks, paymentAmount, paymentType, statusReason };
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

        const res = await authFetch(`/api/bookings/${bookingId}`, {
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
        fetchBookings(activeTab);
      } finally {
        setUpdatingBookings(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookingId);
          return newSet;
        });
      }
    },
    [fetchBookings, activeTab]
  );

  const handleRefresh = useCallback(() => {
    fetchBookings(activeTab, { showRefreshing: true });
    fetchAllBookings();
  }, [fetchBookings, fetchAllBookings, activeTab]);

  const handleExportCsv = useCallback(() => {
    const columns: (keyof Booking)[] = [
      'id', 'name', 'phone', 'email', 'address', 'area', 'serviceType', 'frequency',
      'flatType', 'preferredDate', 'preferredTime', 'status', 'statusReason',
      'paymentAmount', 'paymentType', 'remarks',
    ];
    const escapeCsv = (value: unknown) => {
      let str = value === undefined || value === null ? '' : String(value);
      // Neutralize spreadsheet formula injection — a leading =, +, -, or @ would
      // otherwise be evaluated as a formula when opened in Excel/Sheets.
      if (/^[=+\-@]/.test(str)) str = `'${str}`;
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const rows = [
      columns.join(','),
      ...filteredBookings.map(b => columns.map(col => escapeCsv(b[col])).join(',')),
    ];

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `skyview-bookings-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredBookings, activeTab]);

  const handleExportPdf = useCallback(() => {
    // "Rs." not "₹" below — jsPDF's built-in fonts don't include the Rupee glyph,
    // it renders as a garbled character otherwise.
    const doc = startPdf(`Bookings — ${TAB_LABELS[activeTab]}`);
    autoTable(doc, {
      startY: PDF_TABLE_START_Y,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] },
      head: [['ID', 'Name', 'Phone', 'Area', 'Service', 'Date', 'Time', 'Status', 'Amount', 'Payment', 'Remarks']],
      body: filteredBookings.map(b => [
        b.id,
        b.name,
        b.phone,
        b.area || '—',
        `${b.serviceType} (${b.flatType.replace('_', ' ')})`,
        new Date(b.preferredDate).toLocaleDateString(),
        b.preferredTime,
        b.status,
        b.paymentAmount != null ? `Rs. ${b.paymentAmount}` : '—',
        b.paymentType || '—',
        b.remarks || '',
      ]),
    });
    doc.save(`skyview-bookings-${activeTab}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [filteredBookings, activeTab]);

  const handleTabChange = useCallback((tab: AdminTab) => {
    setActiveTab(tab);
    fetchBookings(tab, { showTabLoading: true });
  }, [fetchBookings]);

  return (
    <>
      <div className="max-w-7xl mx-auto">
        {/* Main Dashboard */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <WeekStrip bookings={allBookings} />

          {/* Navigation Bar */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 space-y-3">
            {/* Tabs */}
            <nav className="flex items-center gap-2 overflow-x-auto">
              {(Object.keys(TAB_LABELS) as AdminTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  disabled={tabLoading}
                  className={`py-2 px-3 rounded-md font-semibold text-sm transition-colors flex items-center whitespace-nowrap ${
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
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-64 max-w-full border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => setShowAddBookingModal(true)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Booking
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l3 3m-3-3l-3 3" />
                  </svg>
                  Import CSV
                </button>
                <button
                  onClick={handleExportCsv}
                  disabled={filteredBookings.length === 0}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Export CSV
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={filteredBookings.length === 0}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2h-4.586a1 1 0 01-.707-.293l-1.414-1.414A1 1 0 0011.586 3H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Export PDF
                </button>
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
            {error ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="text-red-600">{error}</span>
                <button
                  onClick={() => fetchBookings(activeTab, { showTabLoading: true })}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline"
                >
                  Try again
                </button>
              </div>
            ) : loading || tabLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-600 font-medium">Loading bookings...</span>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <TableHeader sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredBookings.map(b => (
                    <BookingRow
                      key={b.id}
                      booking={b}
                      updateBookingStatus={updateBookingStatus}
                      formatDate={formatDateDMY}
                      isUpdating={updatingBookings.has(b.id)}
                      onViewHistory={setHistoryPhone}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Empty State */}
          {!error && !loading && !tabLoading && filteredBookings.length === 0 && (
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

      {historyPhone && (
        <CustomerHistoryModal
          phone={historyPhone}
          bookings={allBookings.filter(b => b.phone === historyPhone)}
          onClose={() => setHistoryPhone(null)}
        />
      )}

      <AddBookingModal
        isOpen={showAddBookingModal}
        onClose={() => setShowAddBookingModal(false)}
        onCreated={() => {
          fetchBookings(activeTab);
          fetchAllBookings();
        }}
      />

      <ImportBookingsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={() => {
          fetchBookings(activeTab);
          fetchAllBookings();
        }}
      />
    </>
  );
}
