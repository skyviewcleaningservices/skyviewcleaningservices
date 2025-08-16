'use client';

import { useState, useEffect } from 'react';
import { sendBookingEmail, sendEmailViaMailto } from './EmailService';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Real-time validation for phone only with debouncing
    if (name === 'phone') {
      // Clear existing timeout
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }

      // Set new timeout for debounced validation
      const timeout = setTimeout(() => {
        validateField(value);
      }, 500); // 500ms delay

      setValidationTimeout(timeout);
    }
  };

  const validateField = async (value: string) => {
    // Clear previous validation message
    setValidationMessage('');

    // Don't validate if field is empty or too short
    if (!value || value.length < 3) {
      return;
    }

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

      if (result.success) {
        const fieldValidation = result.validation.phone;
        if (fieldValidation.exists) {
          setValidationMessage(fieldValidation.message);
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
        // Show special popup for returning customers
        if (result.isReturningCustomer) {
          showReturningCustomerPopup(result.message, result.previousBookings);
        } else {
          alert(result.message);
        }
        onClose();
        resetForm();
      } else {
        // Fallback to EmailJS if API fails
        const emailResult = await sendBookingEmail(formData);
        
        if (emailResult.success) {
          alert(emailResult.message);
          onClose();
          resetForm();
        } else {
          // Final fallback to mailto
          alert('Opening email client to send booking details...');
          sendEmailViaMailto(formData);
          onClose();
          resetForm();
        }
      }
    } catch (error) {
      console.error('Error submitting booking:', error);
      
      // Try EmailJS as fallback
      try {
        const emailResult = await sendBookingEmail(formData);
        
        if (emailResult.success) {
          alert(emailResult.message);
          onClose();
          resetForm();
        } else {
          // Final fallback to mailto
          alert('Opening email client to send booking details...');
          sendEmailViaMailto(formData);
          onClose();
          resetForm();
        }
      } catch (emailError) {
        console.error('EmailJS error:', emailError);
        alert('Failed to submit booking. Please try again or contact us directly.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const showReturningCustomerPopup = (message: string, previousBookings: number) => {
    setReturningCustomerMessage(message);
    setPreviousBookingsCount(previousBookings);
    setShowReturningCustomerModal(true);
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
                   Email *
                 </label>
                 <input
                   type="email"
                   id="email"
                   name="email"
                   required
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
                 </label>
                 <div className="relative">
                   <input
                     type="tel"
                     id="phone"
                     name="phone"
                     required
                     value={formData.phone}
                     onChange={handleInputChange}
                     className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                       validationMessage 
                         ? 'border-green-500 bg-green-50' 
                         : 'border-gray-300'
                     }`}
                   />
                   {isValidating && (
                     <div className="absolute right-3 top-2">
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
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
                  Service Type *
                </label>
                <select
                  id="serviceType"
                  name="serviceType"
                  required
                  value={formData.serviceType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="deep-cleaning">Deep Cleaning</option>
                  <option value="regular-cleaning">Regular Cleaning</option>
                  <option value="move-in-out">Move-in/Move-out Cleaning</option>
                  <option value="post-construction">Post-Construction Cleaning</option>
                  <option value="special-occasion">Special Occasion Cleaning</option>
                </select>
              </div>
              <div>
                <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency *
                </label>
                <select
                  id="frequency"
                  name="frequency"
                  required
                  value={formData.frequency}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="one-time">One Time</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  'Window Cleaning',
                  'Carpet Cleaning',
                  'Oven Cleaning',
                  'Fridge Cleaning',
                  'Laundry Service',
                  'Pet Hair Removal'
                ].map((service) => (
                  <label key={service} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.additionalServices.includes(service)}
                      onChange={() => handleCheckboxChange(service)}
                      className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
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
    </div>
  );
}
