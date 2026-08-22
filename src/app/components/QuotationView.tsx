'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { authFetch } from '@/lib/tokenUtils';
import { generateQuotationPdf } from '@/lib/quotationPdf';
import ConfirmDialog from './ConfirmDialog';
import Toast, { type ToastState } from './Toast';

interface QuotationItem {
  id?: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Quotation {
  id: number;
  number: string;
  type: 'QUOTATION' | 'INVOICE';
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  gstNumber: string | null;
  applyGst: boolean;
  gstPercent: number | null;
  date: string;
  notes: string | null;
  subtotal: number;
  gstAmount: number;
  total: number;
  items: QuotationItem[];
}

interface ItemRow {
  product: string;
  description: string;
  quantity: string;
  rate: string;
}

const FLAT_TYPES = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Studio', 'Penthouse'];
const SERVICE_TYPES = ['General Cleaning', 'Deep Cleaning', 'Full Deep Cleaning'];
const ADD_ON_SERVICES = [
  'Window Cleaning',
  'Oven Cleaning',
  'Carpet Cleaning',
  'Fridge Cleaning',
  'Deep Kitchen Cleaning',
  'Bathroom Deep Cleaning',
  'Balcony Cleaning',
];
const CUSTOM_PRODUCT = 'Other (custom)';

const PRODUCT_OPTIONS = [
  ...FLAT_TYPES.flatMap(flat => SERVICE_TYPES.map(service => `${flat} - ${service}`)),
  ...ADD_ON_SERVICES,
  CUSTOM_PRODUCT,
];

const todayDateInput = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const EMPTY_ITEM: ItemRow = { product: '', description: '', quantity: '1', rate: '' };

const EMPTY_FORM = {
  type: 'QUOTATION' as 'QUOTATION' | 'INVOICE',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerAddress: '',
  gstNumber: '',
  applyGst: false,
  gstPercent: '18',
  date: todayDateInput(),
  notes: '',
};

const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
};

export default function QuotationView() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [items, setItems] = useState<ItemRow[]>([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [deletingQuotation, setDeletingQuotation] = useState<Quotation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch('/api/admin/quotations');
      if (response.ok) {
        const data = await response.json();
        setQuotations(data.quotations);
      } else {
        setError('Failed to fetch quotations');
      }
    } catch (err) {
      setError('Error fetching quotations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleFormChange = (field: keyof typeof EMPTY_FORM, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof ItemRow, value: string) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (field === 'product') {
        return { ...item, product: value, description: value === CUSTOM_PRODUCT ? '' : value };
      }
      return { ...item, [field]: value };
    }));
  };

  const addItemRow = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItemRow = (index: number) => setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0), 0),
    [items]
  );
  const gstPercentNum = parseFloat(formData.gstPercent) || 0;
  const gstAmount = formData.applyGst ? (subtotal * gstPercentNum) / 100 : 0;
  const total = subtotal + gstAmount;

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setItems([{ ...EMPTY_ITEM }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName.trim()) {
      setToast({ message: 'Customer name is required', type: 'error' });
      return;
    }
    const validItems = items.filter(item => item.description.trim());
    if (validItems.length === 0) {
      setToast({ message: 'Add at least one line item', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const response = await authFetch('/api/admin/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          gstPercent: formData.applyGst ? gstPercentNum : null,
          items: validItems.map(item => ({
            description: item.description,
            quantity: parseFloat(item.quantity) || 0,
            rate: parseFloat(item.rate) || 0,
          })),
        }),
      });

      if (response.ok) {
        setToast({ message: `${formData.type === 'INVOICE' ? 'Invoice' : 'Quotation'} created`, type: 'success' });
        setShowForm(false);
        resetForm();
        fetchQuotations();
      } else {
        const errorData = await response.json();
        setToast({ message: errorData.message, type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Error saving. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingQuotation) return;

    setIsDeleting(true);
    try {
      const response = await authFetch(`/api/admin/quotations/${deletingQuotation.id}`, { method: 'DELETE' });
      if (response.ok) {
        setToast({ message: 'Deleted', type: 'success' });
        setDeletingQuotation(null);
        fetchQuotations();
      } else {
        const errorData = await response.json();
        setToast({ message: errorData.message, type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Error deleting', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = (quotation: Quotation) => {
    const pdf = generateQuotationPdf(quotation);
    pdf.save(`${quotation.number}-${quotation.customerName.replace(/\s+/g, '-')}.pdf`);
  };

  if (loading) return <div className="text-center py-4 text-muted">Loading quotations...</div>;
  if (error) return <div className="text-red-600 dark:text-red-400 text-center py-4">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-heading">Quotations & Invoices</h2>
          <p className="text-sm text-muted mt-1">Create a quotation or invoice for a customer and download it as a PDF.</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            resetForm();
          }}
          className="btn-primary"
        >
          + New
        </button>
      </div>

      {showForm && (
        <div className="panel p-6">
          <h3 className="text-lg font-medium text-heading mb-4">New Quotation / Invoice</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-2">
              {(['QUOTATION', 'INVOICE'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleFormChange('type', type)}
                  className={`px-4 py-2 rounded-md text-sm font-medium border ${
                    formData.type === type
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {type === 'QUOTATION' ? 'Quotation' : 'Invoice'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => handleFormChange('customerName', e.target.value)}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Phone</label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => handleFormChange('customerPhone', e.target.value)}
                  className="field-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Email</label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => handleFormChange('customerEmail', e.target.value)}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleFormChange('date', e.target.value)}
                  className="field-input"
                />
              </div>
            </div>

            <div>
              <label className="field-label">Address</label>
              <textarea
                rows={2}
                value={formData.customerAddress}
                onChange={(e) => handleFormChange('customerAddress', e.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">Customer GST No.</label>
              <input
                type="text"
                placeholder="e.g. 27AAAAA0000A1Z5"
                value={formData.gstNumber}
                onChange={(e) => handleFormChange('gstNumber', e.target.value)}
                className="field-input md:w-1/2"
              />
            </div>

            {/* Line items */}
            <div>
              <label className="block text-sm font-medium text-body mb-2">Items</label>

              {/* Header row — same grid template as each item row below, so columns line up exactly */}
              <div className="hidden md:grid md:grid-cols-12 gap-2 px-1 mb-1">
                <span className="md:col-span-3 text-xs font-semibold text-muted uppercase tracking-wider">Service</span>
                <span className="md:col-span-3 text-xs font-semibold text-muted uppercase tracking-wider">Description</span>
                <span className="md:col-span-1 text-xs font-semibold text-muted uppercase tracking-wider">Qty</span>
                <span className="md:col-span-2 text-xs font-semibold text-muted uppercase tracking-wider">Rate</span>
                <span className="md:col-span-2 text-xs font-semibold text-muted uppercase tracking-wider text-right">Amount</span>
                <span className="md:col-span-1" />
              </div>

              <div className="space-y-2">
                {items.map((item, index) => {
                  const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
                  return (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                      <div className="md:col-span-3">
                        <select
                          value={item.product}
                          onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                          className="field-input text-sm"
                        >
                          <option value="">Select a service</option>
                          {PRODUCT_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <input
                          type="text"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="field-input text-sm"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <input
                          type="text"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value.replace(/[^0-9.]/g, ''))}
                          className="field-input text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          placeholder="Rate"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value.replace(/[^0-9.]/g, ''))}
                          className="field-input text-sm"
                        />
                      </div>
                      <div className="md:col-span-2 px-3 py-2 text-sm text-body text-right tabular-nums">
                        ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="md:col-span-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          disabled={items.length === 1}
                          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={addItemRow}
                className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
              >
                + Add item
              </button>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-body">
                <input
                  type="checkbox"
                  checked={formData.applyGst}
                  onChange={(e) => handleFormChange('applyGst', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                />
                Add GST
              </label>
              {formData.applyGst && (
                <div className="mt-2 w-full md:w-1/4">
                  <label className="field-label">GST %</label>
                  <input
                    type="text"
                    value={formData.gstPercent}
                    onChange={(e) => handleFormChange('gstPercent', e.target.value.replace(/[^0-9.]/g, ''))}
                    className="field-input"
                  />
                </div>
              )}
            </div>

            {/* Totals preview */}
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-4 space-y-1 max-w-xs ml-auto text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="tabular-nums">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {formData.applyGst && (
                <div className="flex justify-between text-muted">
                  <span>GST ({gstPercentNum || 0}%)</span>
                  <span className="tabular-nums">₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-heading pt-1 border-t border-gray-200 dark:border-gray-700">
                <span>Total</span>
                <span className="tabular-nums">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div>
              <label className="field-label">Notes / Terms</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                className="field-input"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : `Create ${formData.type === 'INVOICE' ? 'Invoice' : 'Quotation'}`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel-table">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-heading">History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-indigo-50/70 dark:bg-indigo-950/40">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">Number</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">Type</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">Customer</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">Date</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">Total</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {quotations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted">No quotations or invoices yet.</td>
                </tr>
              )}
              {quotations.map(quotation => (
                <tr key={quotation.id} className="odd:bg-white dark:odd:bg-gray-800 even:bg-gray-50/60 dark:even:bg-gray-900/30 hover:bg-indigo-50/60 dark:hover:bg-indigo-900/20 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-heading whitespace-nowrap">{quotation.number}</td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      quotation.type === 'INVOICE' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                    }`}>
                      {quotation.type === 'INVOICE' ? 'Invoice' : 'Quotation'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-body">{quotation.customerName}</td>
                  <td className="px-6 py-3 text-sm text-muted whitespace-nowrap">{formatDate(quotation.date)}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-heading text-right tabular-nums whitespace-nowrap">
                    ₹{quotation.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 text-sm font-medium whitespace-nowrap">
                    <div className="flex space-x-3">
                      <button onClick={() => handleDownload(quotation)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300">Download</button>
                      <button onClick={() => setDeletingQuotation(quotation)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deletingQuotation}
        title={`Delete ${deletingQuotation?.type === 'INVOICE' ? 'Invoice' : 'Quotation'}?`}
        message={`${deletingQuotation?.number} for ${deletingQuotation?.customerName} will be permanently deleted.`}
        isConfirming={isDeleting}
        onCancel={() => setDeletingQuotation(null)}
        onConfirm={handleDelete}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
