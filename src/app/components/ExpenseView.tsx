'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { authFetch } from '@/lib/tokenUtils';
import ConfirmDialog from './ConfirmDialog';

interface Expense {
  id: number;
  description: string;
  category: string | null;
  amount: number;
  date: string;
  paymentType: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | null;
  notes: string | null;
}

interface ExpenseFormData {
  description: string;
  category: string;
  amount: string;
  date: string;
  paymentType: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | '';
  notes: string;
}

const CATEGORY_SUGGESTIONS = [
  'Cab/Transport',
  'Material Cost',
  'Salaries',
  'Rent',
  'Utilities',
  'Equipment',
  'Marketing',
];

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
};

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// "2026-08" -> "August 2026"
const formatMonthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
};

const todayDateInput = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const EMPTY_FORM: ExpenseFormData = {
  description: '',
  category: '',
  amount: '',
  date: todayDateInput(),
  paymentType: '',
  notes: '',
};

export default function ExpenseView() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`/api/admin/expenses?month=${selectedMonth}`);
      if (response.ok) {
        const data = await response.json();
        setExpenses(data.expenses);
      } else {
        setError('Failed to fetch expenses');
      }
    } catch (err) {
      setError('Error fetching expenses');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleInputChange = (field: keyof ExpenseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim() || !formData.amount || !formData.date) {
      alert('Description, amount, and date are required');
      return;
    }

    setSaving(true);
    try {
      const url = editingExpense ? `/api/admin/expenses/${editingExpense.id}` : '/api/admin/expenses';
      const method = editingExpense ? 'PATCH' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowAddForm(false);
        setEditingExpense(null);
        setFormData(EMPTY_FORM);
        fetchExpenses();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (err) {
      alert('Error saving expense. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      category: expense.category || '',
      amount: String(expense.amount),
      date: expense.date.slice(0, 10),
      paymentType: expense.paymentType || '',
      notes: expense.notes || '',
    });
    setShowAddForm(true);
  };

  const handleDelete = async () => {
    if (!deletingExpense) return;

    setIsDeleting(true);
    try {
      const response = await authFetch(`/api/admin/expenses/${deletingExpense.id}`, { method: 'DELETE' });
      if (response.ok) {
        setDeletingExpense(null);
        fetchExpenses();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (err) {
      alert('Error deleting expense');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalForMonth = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const expense of expenses) {
      const cat = expense.category || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + expense.amount);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  if (loading) return <div className="text-center py-4">Loading expenses...</div>;
  if (error) return <div className="text-red-600 text-center py-4">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Monthly Expenses</h2>
          <p className="text-sm text-gray-500 mt-1">Track cab, materials, and other operating costs by month.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 bg-white"
          />
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingExpense(null);
              setFormData({ ...EMPTY_FORM, date: todayDateInput() });
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Add Expense
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingExpense ? 'Edit Expense' : 'Add Expense'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cab to Baner site, Cleaning supplies"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  list="expense-categories"
                  placeholder="e.g. Cab/Transport, Material Cost"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                />
                <datalist id="expense-categories">
                  {CATEGORY_SUGGESTIONS.map(cat => <option key={cat} value={cat} />)}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                <select
                  value={formData.paymentType}
                  onChange={(e) => handleInputChange('paymentType', e.target.value as ExpenseFormData['paymentType'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                >
                  <option value="">Select type</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingExpense ? 'Update Expense' : 'Add Expense'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingExpense(null);
                  setFormData(EMPTY_FORM);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total — {formatMonthLabel(selectedMonth)}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">₹{totalForMonth.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-5 md:col-span-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">By Category</p>
          {byCategory.length === 0 ? (
            <p className="text-sm text-gray-400">No expenses yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {byCategory.map(([cat, amount]) => (
                <span key={cat} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                  {cat}
                  <span className="tabular-nums text-indigo-500">₹{amount.toLocaleString('en-IN')}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Expenses — {formatMonthLabel(selectedMonth)}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-indigo-50/70">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 uppercase tracking-wider border-b-2 border-indigo-100">Date</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 uppercase tracking-wider border-b-2 border-indigo-100">Description</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 uppercase tracking-wider border-b-2 border-indigo-100">Category</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 uppercase tracking-wider border-b-2 border-indigo-100">Payment</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-indigo-900/80 uppercase tracking-wider border-b-2 border-indigo-100">Amount</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 uppercase tracking-wider border-b-2 border-indigo-100">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">No expenses recorded for this month.</td>
                </tr>
              )}
              {expenses.map(expense => (
                <tr key={expense.id} className="odd:bg-white even:bg-gray-50/60 hover:bg-indigo-50/60 transition-colors">
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(expense.date)}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{expense.description}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{expense.category || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {expense.paymentType ? PAYMENT_LABELS[expense.paymentType] : '—'}
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right tabular-nums">
                    ₹{expense.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-3 text-sm font-medium whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button onClick={() => handleEdit(expense)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                      <button onClick={() => setDeletingExpense(expense)} className="text-red-600 hover:text-red-900">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {expenses.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-indigo-200 bg-indigo-50/70">
                  <td colSpan={4} className="px-6 py-3 text-sm font-semibold text-gray-700 text-right">
                    Total for {formatMonthLabel(selectedMonth)}
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right tabular-nums bg-indigo-100">
                    ₹{totalForMonth.toLocaleString('en-IN')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deletingExpense}
        title="Delete Expense?"
        message={`"${deletingExpense?.description}" will be permanently deleted.`}
        isConfirming={isDeleting}
        onCancel={() => setDeletingExpense(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
