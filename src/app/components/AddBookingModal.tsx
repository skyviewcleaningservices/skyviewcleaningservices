'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/tokenUtils';
import { PUNE_AREAS } from '@/lib/areas';
import ConfirmDialog from './ConfirmDialog';

interface BookingForEdit {
  id: number;
  name: string;
  email: string | null;
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
}

interface AddBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  editingBooking?: BookingForEdit | null;
}

const ADD_ON_SERVICES = [
  'Window Cleaning',
  'Oven Cleaning',
  'Carpet Cleaning',
  'Fridge Cleaning',
  'Deep Kitchen Cleaning',
  'Bathroom Deep Cleaning',
  'Balcony Cleaning',
];

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  address: '',
  area: '',
  serviceType: 'deep-cleaning',
  frequency: 'one-time',
  date: '',
  time: '',
  flatType: 'ONE_BHK',
  additionalServices: [] as string[],
  specialInstructions: '',
};

export default function AddBookingModal({ isOpen, onClose, onCreated, editingBooking }: AddBookingModalProps) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  // Re-sync the form each time the modal opens — it stays mounted between
  // opens, so this is the only point where we know whether we're editing an
  // existing booking or starting a fresh one.
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setShowDeleteConfirm(false);
    if (editingBooking) {
      setFormData({
        name: editingBooking.name,
        email: editingBooking.email || '',
        phone: editingBooking.phone,
        address: editingBooking.address,
        area: editingBooking.area || '',
        serviceType: editingBooking.serviceType,
        frequency: editingBooking.frequency,
        date: editingBooking.preferredDate ? new Date(editingBooking.preferredDate).toISOString().slice(0, 10) : '',
        time: editingBooking.preferredTime,
        flatType: editingBooking.flatType,
        additionalServices: editingBooking.additionalServices ? JSON.parse(editingBooking.additionalServices) : [],
        specialInstructions: editingBooking.specialInstructions || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [isOpen, editingBooking]);

  if (!isOpen) return null;

  const isEditing = !!editingBooking;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setFormData(prev => ({ ...prev, phone: value.replace(/\D/g, '').slice(0, 10) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCheckboxChange = (service: string) => {
    setFormData(prev => ({
      ...prev,
      additionalServices: prev.additionalServices.includes(service)
        ? prev.additionalServices.filter(s => s !== service)
        : [...prev.additionalServices, service],
    }));
  };

  const handleClose = () => {
    setFormData(EMPTY_FORM);
    setError('');
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.phone.length !== 10) {
      setError('Please enter a 10-digit phone number.');
      return;
    }
    // Only enforced for new bookings — editing shouldn't be blocked by an
    // older record's area not matching today's served-area list.
    if (!isEditing && (!formData.area || formData.area === 'Other')) {
      setError('Please select a served area.');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/bookings/${editingBooking.id}` : '/api/bookings';
      const method = isEditing ? 'PATCH' : 'POST';
      // The PATCH endpoint uses preferredDate/preferredTime (matching the DB
      // column names), while POST /api/bookings uses date/time — map here.
      const body = isEditing
        ? {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            area: formData.area,
            serviceType: formData.serviceType,
            frequency: formData.frequency,
            preferredDate: formData.date,
            preferredTime: formData.time,
            flatType: formData.flatType,
            additionalServices: JSON.stringify(formData.additionalServices),
            specialInstructions: formData.specialInstructions,
          }
        : formData;

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (result.success) {
        setFormData(EMPTY_FORM);
        onCreated();
        onClose();
      } else {
        setError(result.message || `Failed to ${isEditing ? 'update' : 'add'} booking.`);
      }
    } catch (err) {
      setError(`Failed to ${isEditing ? 'update' : 'add'} booking. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingBooking) return;

    setIsDeleting(true);
    setError('');
    try {
      const response = await authFetch(`/api/bookings/${editingBooking.id}`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        setFormData(EMPTY_FORM);
        onCreated();
        onClose();
      } else {
        setShowDeleteConfirm(false);
        setError(result.message || 'Failed to delete booking.');
      }
    } catch (err) {
      setShowDeleteConfirm(false);
      setError('Failed to delete booking. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Booking' : 'Add Booking Manually'}</h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
                  Area in Pune *
                </label>
                <select
                  id="area"
                  name="area"
                  required
                  value={formData.area}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select area</option>
                  {PUNE_AREAS.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                id="address"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                placeholder="Flat / street details"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type
                </label>
                <select
                  id="serviceType"
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="regular-cleaning">General Cleaning</option>
                  <option value="deep-cleaning">Deep Cleaning</option>
                  <option value="full-deep-cleaning">Full Deep Cleaning</option>
                </select>
              </div>
              <div>
                <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  id="frequency"
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="one-time">One Time</option>
                  <option value="quaterly">Every 3 months</option>
                  <option value="bi-yearly">Every 6 months</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="flatType" className="block text-sm font-medium text-gray-700 mb-1">
                  Flat Type
                </label>
                <select
                  id="flatType"
                  name="flatType"
                  value={formData.flatType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ONE_BHK">1 BHK</option>
                  <option value="TWO_BHK">2 BHK</option>
                  <option value="THREE_BHK">3 BHK</option>
                  <option value="FOUR_BHK">4 BHK</option>
                  <option value="STUDIO">Studio</option>
                  <option value="PENTHOUSE">Penthouse</option>
                </select>
              </div>
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Date *
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  required
                  min={isEditing ? undefined : getTodayDate()}
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Time *
                </label>
                <select
                  id="time"
                  name="time"
                  required
                  value={formData.time}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a time</option>
                  <option value="8:00">8:00 AM</option>
                  <option value="9:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="16:00">4:00 PM</option>
                  <option value="17:00">5:00 PM</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Services
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ADD_ON_SERVICES.map((service) => (
                  <label key={service} className={`flex items-center ${formData.serviceType === 'full-deep-cleaning' ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.additionalServices.includes(service)}
                      onChange={() => handleCheckboxChange(service)}
                      disabled={formData.serviceType === 'full-deep-cleaning'}
                      className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm text-gray-700">{service}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700 mb-1">
                Special Instructions
              </label>
              <textarea
                id="specialInstructions"
                name="specialInstructions"
                rows={2}
                value={formData.specialInstructions}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting || isSubmitting}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Booking'}
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isDeleting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Booking')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>

    {editingBooking && (
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Booking?"
        message={`${editingBooking.name}'s booking will be permanently deleted.`}
        isConfirming={isDeleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    )}
    </>
  );
}
