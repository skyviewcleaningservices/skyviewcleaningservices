interface WhatsAppMessage {
  to: string;
  message: string;
}

interface BookingData {
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
  specialInstructions?: string;
  bookingId?: string;
}

export class WhatsAppService {
  private static instance: WhatsAppService;
  private apiKey: string;
  private apiUrl: string;
  private adminPhone: string;

  private constructor() {
    // You can use services like Twilio, MessageBird, or WhatsApp Business API
    // For this example, I'll use a generic structure that you can adapt
    this.apiKey = process.env.WHATSAPP_API_KEY || '';
    this.apiUrl = process.env.WHATSAPP_API_URL || '';
    this.adminPhone = process.env.ADMIN_WHATSAPP_PHONE || '+1234567890'; // Replace with actual admin phone
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  private async sendMessage(messageData: WhatsAppMessage): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // This is a generic implementation - you'll need to replace with your actual WhatsApp API
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          to: messageData.to,
          message: messageData.message,
          type: 'text'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, message: 'Message sent successfully' };
      } else {
        const error = await response.text();
        return { success: false, error: `Failed to send message: ${error}` };
      }
    } catch (error) {
      console.error('WhatsApp API error:', error);
      return { success: false, error: 'Failed to send WhatsApp message' };
    }
  }

  private formatCustomerMessage(bookingData: BookingData): string {
    const serviceType = bookingData.serviceType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const additionalServices = bookingData.additionalServices.length > 0 
      ? bookingData.additionalServices.join(', ') 
      : 'None';

    return `🎉 *Booking Confirmation - SkyView Cleaning Services*

Dear ${bookingData.name},

Thank you for choosing SkyView Cleaning Services! Your booking has been successfully received.

*Booking Details:*
• Service: ${serviceType}
• Frequency: ${bookingData.frequency}
• Date: ${bookingData.date}
• Time: ${bookingData.time}
• Property: ${bookingData.bedrooms} bed, ${bookingData.bathrooms} bath

*Additional Services:* ${additionalServices}

*Address:* ${bookingData.address}

${bookingData.specialInstructions ? `*Special Instructions:* ${bookingData.specialInstructions}\n` : ''}

We will contact you within 24 hours to confirm your appointment and discuss any specific requirements.

*Booking ID:* ${bookingData.bookingId || 'N/A'}

For any questions, please contact us at +1234567890.

Thank you for trusting SkyView Cleaning Services! 🏠✨`;
  }

  private formatAdminMessage(bookingData: BookingData): string {
    const serviceType = bookingData.serviceType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const additionalServices = bookingData.additionalServices.length > 0 
      ? bookingData.additionalServices.join(', ') 
      : 'None';

    return `📋 *New Booking Alert - SkyView Cleaning Services*

*Customer Information:*
• Name: ${bookingData.name}
• Phone: ${bookingData.phone}
• Email: ${bookingData.email}

*Service Details:*
• Service: ${serviceType}
• Frequency: ${bookingData.frequency}
• Date: ${bookingData.date}
• Time: ${bookingData.time}
• Property: ${bookingData.bedrooms} bed, ${bookingData.bathrooms} bath

*Additional Services:* ${additionalServices}

*Address:* ${bookingData.address}

${bookingData.specialInstructions ? `*Special Instructions:* ${bookingData.specialInstructions}\n` : ''}

*Booking ID:* ${bookingData.bookingId || 'N/A'}

Please review and confirm this booking in the admin dashboard.

Action required: Contact customer within 24 hours.`;
  }

  public async sendBookingNotifications(bookingData: BookingData): Promise<{
    customerSuccess: boolean;
    adminSuccess: boolean;
    customerError?: string;
    adminError?: string;
  }> {
    const customerMessage = this.formatCustomerMessage(bookingData);
    const adminMessage = this.formatAdminMessage(bookingData);

    // Send message to customer
    const customerResult = await this.sendMessage({
      to: bookingData.phone,
      message: customerMessage
    });

    // Send message to admin
    const adminResult = await this.sendMessage({
      to: this.adminPhone,
      message: adminMessage
    });

    return {
      customerSuccess: customerResult.success,
      adminSuccess: adminResult.success,
      customerError: customerResult.error,
      adminError: adminResult.error
    };
  }

  // Alternative implementation using WhatsApp Web API (for testing/development)
  public async sendMessageViaWhatsAppWeb(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      // This is a placeholder for WhatsApp Web API integration
      // You can use libraries like whatsapp-web.js for Node.js
      console.log(`WhatsApp message to ${phone}:`, message);
      
      // For development/testing, just log the message
      return { success: true };
    } catch (error) {
      console.error('WhatsApp Web API error:', error);
      return { success: false, error: 'Failed to send WhatsApp message' };
    }
  }
}

export default WhatsAppService;
