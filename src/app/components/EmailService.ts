import emailjs from '@emailjs/browser';

// EmailJS configuration
// You'll need to sign up at https://www.emailjs.com/ and get these credentials
const EMAILJS_CONFIG = {
  SERVICE_ID: 'your_service_id', // Replace with your EmailJS service ID
  TEMPLATE_ID: 'your_template_id', // Replace with your EmailJS template ID
  PUBLIC_KEY: 'your_public_key', // Replace with your EmailJS public key
};

export interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  serviceType: string;
  frequency: string;
  date: string;
  time: string;
  bedrooms: string;
  bathrooms: string;
  additionalServices: string[];
  specialInstructions: string;
}

export async function sendBookingEmail(formData: BookingFormData): Promise<{ success: boolean; message: string }> {
  try {
    debugger;
    // Initialize EmailJS
    emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

    // Prepare email template parameters
    const templateParams = {
      to_email: 'ishwardyade.net@gmail.com', // Your business email
      from_name: formData.name,
      from_email: formData.email,
      from_phone: formData.phone,
      customer_address: formData.address,
      service_type: formData.serviceType,
      frequency: formData.frequency,
      preferred_date: formData.date,
      preferred_time: formData.time,
      bedrooms: formData.bedrooms,
      bathrooms: formData.bathrooms,
      additional_services: formData.additionalServices.join(', ') || 'None',
      special_instructions: formData.specialInstructions || 'None',
      submission_date: new Date().toLocaleString(),
    };

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams
    );

    if (response.status === 200) {
      return {
        success: true,
        message: 'Booking submitted successfully! We will contact you soon to confirm your appointment.'
      };
    } else {
      throw new Error('Email service returned non-200 status');
    }

  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      message: 'Failed to send email. Please try again or contact us directly.'
    };
  }
}

// Alternative: Simple email using mailto link (fallback)
export function sendEmailViaMailto(formData: BookingFormData): void {
  const subject = 'New Booking Request - SkyView Cleaning Services';
  const body = `
New Booking Request

Customer Information:
- Name: ${formData.name}
- Email: ${formData.email}
- Phone: ${formData.phone}
- Address: ${formData.address}

Service Details:
- Service Type: ${formData.serviceType}
- Frequency: ${formData.frequency}
- Preferred Date: ${formData.date}
- Preferred Time: ${formData.time}

Property Details:
- Bedrooms: ${formData.bedrooms}
- Bathrooms: ${formData.bathrooms}

Additional Services: ${formData.additionalServices.join(', ') || 'None'}

Special Instructions: ${formData.specialInstructions || 'None'}

Submitted on: ${new Date().toLocaleString()}
  `;

  const mailtoLink = `mailto:skyviewcleaningservices@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoLink);
}
