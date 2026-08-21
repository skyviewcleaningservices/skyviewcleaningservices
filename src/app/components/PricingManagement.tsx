'use client';

import { useState, useEffect, useCallback } from 'react';
import { DebouncedInput } from './AdminDashboard';

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
      const response = await fetch('/api/admin/pricing');
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
      await fetch('/api/admin/pricing', {
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
      await fetch('/api/admin/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addOns: [{ id, price }] }),
      });
    } catch (err) {
      console.error('Error updating add-on price:', err);
    }
  }, []);

  if (loading) {
    return <div className="text-center py-4">Loading pricing...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center py-4">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Pricing</h2>
        <p className="text-sm text-gray-500">Blank = shown to customers as &quot;Price on request&quot;</p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Rate card (₹ by flat type × service)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flat type</th>
                {SERVICE_TYPE_ORDER.map(serviceType => (
                  <th key={serviceType} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {SERVICE_TYPE_LABELS[serviceType]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {FLAT_TYPE_ORDER.map(flatType => (
                <tr key={flatType}>
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
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
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm w-28 text-gray-700"
                          />
                        ) : (
                          <span className="text-sm text-gray-400">n/a</span>
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

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Add-on prices (₹)</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {addOns.map(addOn => (
            <div key={addOn.id} className="px-6 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-900">{addOn.name}</span>
              <DebouncedInput
                type="number"
                min="0"
                value={addOn.price ?? undefined}
                placeholder="—"
                onChange={(val) => updateAddOnPrice(addOn.id, val)}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm w-28 text-gray-700"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
