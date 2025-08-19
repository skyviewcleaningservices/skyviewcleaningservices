'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  serviceType: string;
  frequency: string;
  preferredDate: string;
  preferredTime: string;
  bedrooms: string;
  bathrooms: string;
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

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Booking>>({});
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const { id } = await params;
        const response = await fetch(`/api/bookings/${id}`);
        if (response.ok) {
          const data = await response.json();
          setBooking(data.booking);
          setFormData(data.booking);
        } else {
          setError('Failed to fetch booking');
        }
      } catch (err) {
        setError('Error fetching booking');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [params]);

  const handleInputChange = useCallback((field: keyof Booking, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Handle input change with better UX for text fields
  const handleTextInputChange = useCallback((field: keyof Booking, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Handle number input change with better UX
  const handleNumberInputChange = useCallback((field: keyof Booking, value: string) => {
    // Allow empty string or valid numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({
        ...prev,
        [field]: value === '' ? undefined : parseFloat(value)
      }));
    }
  }, []);

  const handleSave = async () => {
    if (!booking) return;
    
    setSaving(true);
    try {
      const updateData = {
        status: formData.status,
        remarks: formData.remarks,
        paymentAmount: formData.paymentAmount,
        paymentType: formData.paymentType,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        serviceType: formData.serviceType,
        frequency: formData.frequency,
        preferredDate: formData.preferredDate,
        preferredTime: formData.preferredTime,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        additionalServices: formData.additionalServices,
        specialInstructions: formData.specialInstructions,
      };
      
      console.log('Sending update data:', updateData);
      
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const updatedBooking = await response.json();
        console.log('Update successful:', updatedBooking);
        setBooking(updatedBooking.booking);
        setFormData(updatedBooking.booking);
        setIsEditing(false);
        alert('Booking updated successfully!');
      } else {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        alert(`Failed to update booking: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error updating booking:', err);
      alert(`Error updating booking: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (isEditing) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(booking);
      if (hasChanges) {
        const confirmCancel = window.confirm(
          'You have unsaved changes. Are you sure you want to cancel? All changes will be lost.'
        );
        if (!confirmCancel) return;
      }
             setFormData(booking || {}); // Reset to original data
    }
    setIsEditing(!isEditing);
  };

  // Check if a field has been modified
  const isFieldModified = (field: keyof Booking) => {
    if (!booking || !isEditing) return false;
    return formData[field] !== booking[field];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading booking...</div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">Error: {error || 'Booking not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
              <p className="mt-2 text-gray-600">Booking ID: {booking.id}</p>
              {isEditing && (
                <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded-md">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ Edit Mode: Make your changes and click &quot;Save Changes&quot; when done
                  </p>
                  {(() => {
                    const modifiedFields = Object.keys(formData).filter(key => 
                      isFieldModified(key as keyof Booking)
                    );
                    if (modifiedFields.length > 0) {
                      return (
                        <p className="text-yellow-700 text-xs mt-1">
                          📝 Modified fields: {modifiedFields.join(', ')}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Back
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                {isEditing ? 'Cancel Edit' : 'Edit'}
              </button>
              {isEditing && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Booking Details */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Customer Information</h2>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Customer Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                  {isFieldModified('name') && (
                    <span className="ml-2 text-xs text-orange-600">(Modified)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-md disabled:bg-gray-100 ${
                    isFieldModified('name') 
                      ? 'border-orange-300 bg-orange-50' 
                      : 'border-gray-300'
                  }`}
                />
              </div>
                             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Email
                   {isFieldModified('email') && (
                     <span className="ml-2 text-xs text-orange-600">(Modified)</span>
                   )}
                 </label>
                 <input
                   type="email"
                   value={formData.email || ''}
                   onChange={(e) => handleTextInputChange('email', e.target.value)}
                   disabled={!isEditing}
                   className={`w-full px-3 py-2 border rounded-md disabled:bg-gray-100 ${
                     isFieldModified('email') 
                       ? 'border-orange-300 bg-orange-50' 
                       : 'border-gray-300'
                   }`}
                 />
               </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  disabled={!isEditing}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                />
              </div>
            </div>

            {/* Service Details */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Service Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                  <input
                    type="text"
                    value={formData.serviceType || ''}
                    onChange={(e) => handleInputChange('serviceType', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                  <input
                    type="text"
                    value={formData.frequency || ''}
                    onChange={(e) => handleInputChange('frequency', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Date</label>
                  <input
                    type="date"
                    value={formData.preferredDate ? new Date(formData.preferredDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time</label>
                  <input
                    type="text"
                    value={formData.preferredTime || ''}
                    onChange={(e) => handleInputChange('preferredTime', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                  <input
                    type="text"
                    value={formData.bedrooms || ''}
                    onChange={(e) => handleInputChange('bedrooms', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
                  <input
                    type="text"
                    value={formData.bathrooms || ''}
                    onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Status and Payment */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status & Payment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status || 'PENDING'}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Payment Amount
                     {isFieldModified('paymentAmount') && (
                       <span className="ml-2 text-xs text-orange-600">(Modified)</span>
                     )}
                   </label>
                   <input
                     type="text"
                     value={formData.paymentAmount || ''}
                     onChange={(e) => handleNumberInputChange('paymentAmount', e.target.value)}
                     disabled={!isEditing}
                     placeholder="Enter amount (e.g., 1500.50)"
                     className={`w-full px-3 py-2 border rounded-md disabled:bg-gray-100 ${
                       isFieldModified('paymentAmount') 
                         ? 'border-orange-300 bg-orange-50' 
                         : 'border-gray-300'
                     }`}
                   />
                 </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                  <select
                    value={formData.paymentType || ''}
                    onChange={(e) => handleInputChange('paymentType', e.target.value || undefined)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  >
                    <option value="">Select Type</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
                                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Remarks
                     {isFieldModified('remarks') && (
                       <span className="ml-2 text-xs text-orange-600">(Modified)</span>
                     )}
                   </label>
                   <textarea
                     value={formData.remarks || ''}
                     onChange={(e) => handleTextInputChange('remarks', e.target.value)}
                     disabled={!isEditing}
                     rows={3}
                     placeholder="Add any remarks or notes..."
                     className={`w-full px-3 py-2 border rounded-md disabled:bg-gray-100 ${
                       isFieldModified('remarks') 
                         ? 'border-orange-300 bg-orange-50' 
                         : 'border-gray-300'
                     }`}
                   />
                 </div>
              </div>
            </div>

                         {/* Additional Information */}
             <div className="border-t pt-6">
               <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Additional Services</label>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {[
                       'Window Cleaning',
                       'Oven Cleaning',
                       'Carpet Cleaning',
                       'Fridge Cleaning',
                       'Laundry Service',
                       'Deep Kitchen Cleaning',
                       'Bathroom Deep Cleaning',
                       'Balcony Cleaning'
                     ].map((service) => {
                       const currentServices = formData.additionalServices ? JSON.parse(formData.additionalServices) : [];
                       const isSelected = currentServices.includes(service);
                       
                       return (
                         <label key={service} className="flex items-center space-x-2">
                           <input
                             type="checkbox"
                             checked={isSelected}
                             onChange={(e) => {
                               const currentServices = formData.additionalServices ? JSON.parse(formData.additionalServices) : [];
                               let newServices;
                               if (e.target.checked) {
                                 newServices = [...currentServices, service];
                               } else {
                                 newServices = currentServices.filter((s: string) => s !== service);
                               }
                               handleInputChange('additionalServices', JSON.stringify(newServices));
                             }}
                             disabled={!isEditing}
                             className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                           />
                           <span className="text-sm text-gray-700">{service}</span>
                         </label>
                       );
                     })}
                   </div>
                   {formData.additionalServices && JSON.parse(formData.additionalServices).length > 0 && (
                     <div className="mt-3 p-3 bg-gray-50 rounded-md">
                       <p className="text-sm text-gray-600">
                         <strong>Selected Services:</strong> {JSON.parse(formData.additionalServices).join(', ')}
                       </p>
                     </div>
                   )}
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
                   <textarea
                     value={formData.specialInstructions || ''}
                     onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                     disabled={!isEditing}
                     rows={3}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                   />
                 </div>
               </div>
             </div>

            {/* Timestamps */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Timestamps</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Created At</label>
                  <input
                    type="text"
                    value={formatDate(booking.createdAt)}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Updated</label>
                  <input
                    type="text"
                    value={formatDate(booking.updatedAt)}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
