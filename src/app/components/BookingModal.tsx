'use client';

import { useState, useEffect } from 'react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SuccessData {
  message: string;
  bookingId?: string;
  isReturningCustomer: boolean;
  previousBookings: number;
  whatsappNotifications?: {
    customerSent: boolean;
    adminSent: boolean;
    customerError?: string;
    adminError?: string;
  };
}

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    serviceType: 'deep-cleaning',
    frequency: 'one-time',
    date: '',
    time: '',
    bedrooms: '1',
    bathrooms: '1',
    additionalServices: [] as string[],
    specialInstructions: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReturningCustomerModal, setShowReturningCustomerModal] = useState(false);
  const [returningCustomerMessage, setReturningCustomerMessage] = useState('');
  const [previousBookingsCount, setPreviousBookingsCount] = useState(0);
  const [validationMessage, setValidationMessage] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationTimeout, setValidationTimeout] = useState(null as NodeJS.Timeout | null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeout) clearTimeout(validationTimeout);
    };
  }, [validationTimeout]);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Special handling for phone number
    if (name === 'phone') {
      // Remove all non-digit characters
      let digitsOnly = value.replace(/\D/g, '');

      // Remove initial 0 or +91
      if (digitsOnly.startsWith('91') && digitsOnly.length > 10) {
        digitsOnly = digitsOnly.substring(2);
      }
      if (digitsOnly.startsWith('0')) {
        digitsOnly = digitsOnly.substring(1);
      }

      // Limit to 10 digits
      digitsOnly = digitsOnly.substring(0, 10);

      // Update form data with cleaned phone number
      setFormData(prev => ({
        ...prev,
        [name]: digitsOnly
      }));

      // Clear existing timeout
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }

      // Only validate if phone number has exactly 10 digits
      if (digitsOnly.length === 10) {
        // Set new timeout for debounced validation
        const timeout = setTimeout(() => {
          validateField(digitsOnly);
        }, 500); // 500ms delay

        setValidationTimeout(timeout);
      } else {
        // Clear validation message if not 10 digits
        setValidationMessage('');
      }
    } else if (name === 'serviceType') {
      // Special handling for service type changes
      setFormData(prev => {
        const newFormData = {
          ...prev,
          [name]: value
        };

        // If Full Deep Cleaning is selected, clear additional services
        if (value === 'full-deep-cleaning') {
          newFormData.additionalServices = [];
        }

        return newFormData;
      });
    } else {
      // Handle other fields normally
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateField = async (value: string) => {
    // Clear previous validation message
    setValidationMessage('');

    // Extract only digits from phone number
    const digitsOnly = value.replace(/\D/g, '');

    // Don't validate if not exactly 10 digits
    if (!value || digitsOnly.length !== 10) {
      console.log('Phone validation skipped: Not 10 digits', { value, digitsOnly, length: digitsOnly.length });
      return;
    }

    console.log('Phone validation triggered: 10 digits detected', { value, digitsOnly });

    // Set validating state
    setIsValidating(true);

    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: '',
          phone: value
        }),
      });

      const result = await response.json();
      console.log('Validation API response:', result);

      if (result.success) {
        const fieldValidation = result.validation.phone;
        if (fieldValidation.exists) {
          setValidationMessage(fieldValidation.message);
          console.log('Returning customer detected:', fieldValidation.message);
        } else {
          console.log('New customer - no previous bookings found');
        }
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCheckboxChange = (service: string) => {
    setFormData(prev => ({
      ...prev,
      additionalServices: prev.additionalServices.includes(service)
        ? prev.additionalServices.filter(s => s !== service)
        : [...prev.additionalServices, service]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that the selected date is not in the past
    if (!formData.date) {
      alert('Please select a preferred date.');
      return;
    }

    const selectedDate = new Date(formData.date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

    if (selectedDate < today) {
      alert('Please select a date that is not in the past.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Try API route first
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // Show success modal with booking details and WhatsApp status
        setSuccessData(result);
        setShowSuccessModal(true);
      } else {
        // Show error message if API fails
        setSuccessData({
          message: result.message || 'Failed to submit booking. Please try again.',
          isReturningCustomer: false,
          previousBookings: 0
        });
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error submitting booking:', error);

      setSuccessData({
        message: 'Failed to submit booking. Please try again or contact us directly.',
        isReturningCustomer: false,
        previousBookings: 0
      });
      setShowSuccessModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showReturningCustomerPopup = (message: string, previousBookings: number) => {
    setReturningCustomerMessage(message);
    setPreviousBookingsCount(previousBookings);
    setShowReturningCustomerModal(true);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      serviceType: 'deep-cleaning',
      frequency: 'one-time',
      date: '',
      time: '',
      bedrooms: '1',
      bathrooms: '1',
      additionalServices: [],
      specialInstructions: '',
    });

    // Clear validation message and timeout
    setValidationMessage('');
    if (validationTimeout) clearTimeout(validationTimeout);
    setValidationTimeout(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Book Your Cleaning Service</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Validation Message */}
            {validationMessage && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                <p className="text-sm text-green-800 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {validationMessage}
                </p>
              </div>
            )}

            {/* Personal Information */}
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
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                  <span className="text-xs text-gray-500 ml-1">(10 digits required for validation)</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter 10-digit mobile number"
                    maxLength={15}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${validationMessage
                      ? 'border-green-500 bg-green-50'
                      : formData.phone.length === 10
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300'
                      }`}
                  />
                  {isValidating && (
                    <div className="absolute right-3 top-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    </div>
                  )}
                  {formData.phone.length === 10 && !isValidating && !validationMessage && (
                    <div className="absolute right-3 top-2">
                      <div className="text-blue-500">✓</div>
                    </div>
                  )}
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
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Service Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type
                </label>
                <select
                  id="serviceType"
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="one-time">One Time</option>
                  <option value="quaterly">Every 3 months</option>
                  <option value="bi-yearly">Every 6 months</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            {/* Property Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-1">
                  Bedrooms
                </label>
                <select
                  id="bedrooms"
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5+">5+</option>
                </select>
              </div>
              <div>
                <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700 mb-1">
                  Bathrooms
                </label>
                <select
                  id="bathrooms"
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5+">5+</option>
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
                  min={getTodayDate()}
                  value={formData.date}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value + 'T00:00:00');
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    if (selectedDate < today) {
                      alert('Please select a date that is not in the past.');
                      e.target.value = '';
                      setFormData(prev => ({ ...prev, date: '' }));
                      return;
                    }

                    handleInputChange(e);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
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
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

            {/* Additional Services */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Services
              </label>

              {/* Message for Full Deep Cleaning */}
              {formData.serviceType === 'full-deep-cleaning' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                  <p className="text-sm text-blue-800 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <strong>Note:</strong> Full Deep Cleaning already includes all additional services. No need to select them separately.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  'Window Cleaning',
                  'Carpet Cleaning',
                  'Oven Cleaning',
                  'Fridge Cleaning'
                ].map((service) => (
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

            {/* Special Instructions */}
            <div>
              <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700 mb-1">
                Special Instructions
              </label>
              <textarea
                id="specialInstructions"
                name="specialInstructions"
                rows={3}
                value={formData.specialInstructions}
                onChange={handleInputChange}
                placeholder="Any special requirements or instructions..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Book Now'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Returning Customer Success Modal */}
      {showReturningCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome Back! 🎉</h3>
              <p className="text-sm text-gray-600 mb-4">{returningCustomerMessage}</p>
              {previousBookingsCount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Loyalty Note:</strong> This is your {previousBookingsCount + 1} booking with us!
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowReturningCustomerModal(false)}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Thank You!
            </button>
          </div>
        </div>
      )}

      {/* Booking Success Modal */}
      {showSuccessModal && successData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Booking Successful! 🎉</h3>
              <p className="text-lg text-gray-600">{successData.message}</p>
            </div>

            {/* Booking Details */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Name:</strong> {formData.name}</p>
                  <p><strong>Phone:</strong> {formData.phone}</p>
                  <p><strong>Email:</strong> {formData.email || 'Not provided'}</p>
                  <p><strong>Address:</strong> {formData.address}</p>
                </div>
                <div>
                  <p><strong>Service:</strong> {formData.serviceType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                  <p><strong>Frequency:</strong> {formData.frequency.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                  <p><strong>Date:</strong> {formData.date}</p>
                  <p><strong>Time:</strong> {formData.time}</p>
                </div>
              </div>
              {formData.additionalServices.length > 0 && (
                <div className="mt-4">
                  <p><strong>Additional Services:</strong></p>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {formData.additionalServices.map((service, index) => (
                      <li key={index}>{service}</li>
                    ))}
                  </ul>
                </div>
              )}
              {formData.specialInstructions && (
                <div className="mt-4">
                  <p><strong>Special Instructions:</strong></p>
                  <p className="text-sm text-gray-600">{formData.specialInstructions}</p>
                </div>
              )}
            </div>

            {/* Booking ID and Status */}
            {successData.bookingId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Booking ID:</strong> {successData.bookingId}
                </p>
                <p className="text-xs text-blue-600 mt-1">Please keep this ID for reference</p>
              </div>
            )}

                         {/* Returning Customer Info */}
             {successData.isReturningCustomer && (
               <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                 <p className="text-sm text-yellow-800">
                   <strong>Welcome Back!</strong> This is your {successData.previousBookings + 1} booking with us.
                 </p>
               </div>
             )}

             {/* WhatsApp Notification Status */}
             {successData.whatsappNotifications && (
               <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                 <h5 className="font-semibold text-gray-800 mb-3">WhatsApp Notifications</h5>
                 <div className="space-y-2 text-sm">
                   <div className="flex items-center justify-between">
                     <span className="text-gray-600">Customer Notification:</span>
                     <span className={`flex items-center ${successData.whatsappNotifications.customerSent ? 'text-green-600' : 'text-red-600'}`}>
                       {successData.whatsappNotifications.customerSent ? (
                         <>
                           <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                             <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                           </svg>
                           Sent
                         </>
                       ) : (
                         <>
                           <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                             <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                           </svg>
                           Failed
                         </>
                       )}
                     </span>
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-gray-600">Admin Notification:</span>
                     <span className={`flex items-center ${successData.whatsappNotifications.adminSent ? 'text-green-600' : 'text-red-600'}`}>
                       {successData.whatsappNotifications.adminSent ? (
                         <>
                           <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                             <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                           </svg>
                           Sent
                         </>
                       ) : (
                         <>
                           <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                             <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                           </svg>
                           Failed
                         </>
                       )}
                     </span>
                   </div>
                   {successData.whatsappNotifications.customerError && (
                     <div className="text-xs text-red-600 mt-1">
                       Customer Error: {successData.whatsappNotifications.customerError}
                     </div>
                   )}
                   {successData.whatsappNotifications.adminError && (
                     <div className="text-xs text-red-600 mt-1">
                       Admin Error: {successData.whatsappNotifications.adminError}
                     </div>
                   )}
                 </div>
               </div>
             )}

             {/* Next Steps */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
              <h5 className="font-semibold text-indigo-800 mb-2">What&apos;s Next?</h5>
              <ul className="text-sm text-indigo-700 space-y-1">
                <li>• We&apos;ll contact you within 3 hours to confirm your Booking</li>
                <li>• Please ensure someone is available at the scheduled time</li>
                <li>• For any changes, please call us at +91 9623707524</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSuccessModalClose}
                className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                Done
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessData(null);
                  // Keep the modal open for another booking
                }}
                className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium"
              >
                Book Another Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
