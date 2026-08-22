'use client';

import { useState, useEffect, useCallback } from 'react';
import { DebouncedInput } from './AdminDashboard';
import { authFetch } from '@/lib/tokenUtils';

interface PriceRate {
  id: number;
  flatType: string;
  serviceType: string;
  price: number | null;
}

interface AddOnPrice {
  id: number;
  name: string;
  price: number | null;
}

const FLAT_TYPE_LABELS: Record<string, string> = {
  ONE_BHK: '1 BHK',
  TWO_BHK: '2 BHK',
  THREE_BHK: '3 BHK',
  FOUR_BHK: '4 BHK',
  STUDIO: 'Studio',
  PENTHOUSE: 'Penthouse',
};
const FLAT_TYPE_ORDER = ['STUDIO', 'ONE_BHK', 'TWO_BHK', 'THREE_BHK', 'FOUR_BHK', 'PENTHOUSE'];

const SERVICE_TYPE_LABELS: Record<string, string> = {
  'regular-cleaning': 'General Cleaning',
  'deep-cleaning': 'Deep Cleaning',
  'full-deep-cleaning': 'Full Deep Cleaning',
};
const SERVICE_TYPE_ORDER = ['regular-cleaning', 'deep-cleaning', 'full-deep-cleaning'];

export default function PricingManagement() {
  const [rates, setRates] = useState<PriceRate[]>([]);
  const [addOns, setAddOns] = useState<AddOnPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPricing = useCallback(async () => {
    try {
      const response = await authFetch('/api/admin/pricing');
      if (!response.ok) throw new Error('Failed to fetch pricing');
      const data = await response.json();
      setRates(data.rates);
      setAddOns(data.addOns);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error fetching pricing. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  const updateRatePrice = useCallback(async (id: number, value: string) => {
    const price = value === '' ? null : parseFloat(value);
    setRates(prev => prev.map(r => (r.id === id ? { ...r, price } : r)));
    try {
      await authFetch('/api/admin/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates: [{ id, price }] }),
      });
    } catch (err) {
      console.error('Error updating rate:', err);
    }
  }, []);

  const updateAddOnPrice = useCallback(async (id: number, value: string) => {
    const price = value === '' ? null : parseFloat(value);
    setAddOns(prev => prev.map(a => (a.id === id ? { ...a, price } : a)));
    try {
      await authFetch('/api/admin/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addOns: [{ id, price }] }),
      });
    } catch (err) {
      console.error('Error updating add-on price:', err);
    }
  }, []);

  if (loading) {
    return <div className="text-center py-4 text-muted">Loading pricing...</div>;
  }

  if (error) {
    return <div className="text-red-600 dark:text-red-400 text-center py-4">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-heading">Pricing</h2>
        <p className="text-sm text-muted">Blank = shown to customers as &quot;Price on request&quot;</p>
      </div>

      <div className="panel-table">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-heading">Rate card (₹ by flat type × service)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-indigo-50/70 dark:bg-indigo-950/40">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">Flat type</th>
                {SERVICE_TYPE_ORDER.map(serviceType => (
                  <th key={serviceType} className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">
                    {SERVICE_TYPE_LABELS[serviceType]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="table-body">
              {FLAT_TYPE_ORDER.map(flatType => (
                <tr key={flatType} className="odd:bg-white dark:odd:bg-gray-800 even:bg-gray-50/60 dark:even:bg-gray-900/30 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors">
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-heading">
                    {FLAT_TYPE_LABELS[flatType]}
                  </td>
                  {SERVICE_TYPE_ORDER.map(serviceType => {
                    const rate = rates.find(r => r.flatType === flatType && r.serviceType === serviceType);
                    return (
                      <td key={serviceType} className="px-6 py-3 whitespace-nowrap">
                        {rate ? (
                          <DebouncedInput
                            type="number"
                            min="0"
                            value={rate.price ?? undefined}
                            placeholder="—"
                            onChange={(val) => updateRatePrice(rate.id, val)}
                            className="field-input w-28 px-2 py-1 text-sm"
                          />
                        ) : (
                          <span className="text-sm text-subtle">n/a</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel-table">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-heading">Add-on prices (₹)</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {addOns.map(addOn => (
            <div key={addOn.id} className="px-6 py-3 flex items-center justify-between">
              <span className="text-sm text-heading">{addOn.name}</span>
              <DebouncedInput
                type="number"
                min="0"
                value={addOn.price ?? undefined}
                placeholder="—"
                onChange={(val) => updateAddOnPrice(addOn.id, val)}
                className="field-input w-28 px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
