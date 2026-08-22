'use client';

interface Booking {
  id: number;
  serviceType: string;
  preferredDate: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  paymentAmount?: number | null;
}

interface CustomerHistoryModalProps {
  phone: string;
  bookings: Booking[];
  onClose: () => void;
}

const STATUS_STYLES: Record<Booking['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function CustomerHistoryModal({ phone, bookings, onClose }: CustomerHistoryModalProps) {
  const totalSpend = bookings.reduce((sum, b) => sum + (b.paymentAmount || 0), 0);
  const lastCompleted = bookings
    .filter(b => b.status === 'COMPLETED')
    .sort((a, b) => new Date(b.preferredDate).getTime() - new Date(a.preferredDate).getTime())[0];
  const sortedBookings = [...bookings].sort(
    (a, b) => new Date(b.preferredDate).getTime() - new Date(a.preferredDate).getTime()
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="panel max-w-lg w-full max-h-[85vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold text-heading">Customer History</h3>
            <p className="text-sm text-muted">{phone}</p>
          </div>
          <button onClick={onClose} className="icon-btn-muted text-2xl font-bold">
            ×
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{bookings.length}</div>
            <div className="text-xs text-indigo-900 dark:text-indigo-300">Total bookings</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">₹{totalSpend.toLocaleString('en-IN')}</div>
            <div className="text-xs text-green-900 dark:text-green-300">Lifetime spend</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3 text-center">
            <div className="text-sm font-bold text-body">
              {lastCompleted ? new Date(lastCompleted.preferredDate).toLocaleDateString() : '—'}
            </div>
            <div className="text-xs text-muted">Last completed clean</div>
          </div>
        </div>

        <h4 className="text-sm font-semibold text-body mb-2">Booking history</h4>
        <div className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {sortedBookings.map(b => (
            <div key={b.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div>
                <div className="font-medium text-heading">{b.serviceType}</div>
                <div className="text-xs text-muted">{new Date(b.preferredDate).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                {b.paymentAmount != null && (
                  <span className="text-muted">₹{b.paymentAmount.toLocaleString('en-IN')}</span>
                )}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[b.status]}`}>
                  {b.status}
                </span>
              </div>
            </div>
          ))}
          {sortedBookings.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted">No bookings found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
