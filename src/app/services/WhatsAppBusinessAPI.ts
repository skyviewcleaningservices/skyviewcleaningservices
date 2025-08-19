interface WhatsAppMessage {
  to: string;
  message: string;
  type?: 'text' | 'template';
  contentSid?: string;
  contentVariables?: Record<string, string>;
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

export class WhatsAppBusinessAPI {
  private static instance: WhatsAppBusinessAPI;
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private adminPhone: string;

  private constructor() {
    // Twilio WhatsApp Business API credentials
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC4184fe3a912f3f52fd8554f76ef494d8';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio sandbox number
    this.adminPhone = process.env.ADMIN_WHATSAPP_PHONE || 'whatsapp:+917840938282';
  }

  public static getInstance(): WhatsAppBusinessAPI {
    if (!WhatsAppBusinessAPI.instance) {
      WhatsAppBusinessAPI.instance = new WhatsAppBusinessAPI();
    }
    return WhatsAppBusinessAPI.instance;
  }

  private async sendMessage(messageData: WhatsAppMessage): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Check if credentials are configured
      if (!this.accountSid || !this.authToken) {
        // Development mode: log message instead of sending
        console.log('=== WHATSAPP MESSAGE (DEV MODE - No Credentials) ===');
        console.log(`To: ${messageData.to}`);
        console.log(`Message: ${messageData.message}`);
        console.log('===================================================');
        return { success: true, message: 'Message logged (development mode)' };
      }

      // Format phone number for WhatsApp
      const formattedPhone = messageData.to.startsWith('whatsapp:') 
        ? messageData.to 
        : `whatsapp:${messageData.to.replace(/\D/g, '')}`;

      // Use template message if ContentSid is provided, otherwise use regular text message
      const requestBody = new URLSearchParams({
        From: this.fromNumber,
        To: formattedPhone,
      });

      if (messageData.type === 'template' && messageData.contentSid) {
        // Template message with content variables
        requestBody.append('ContentSid', messageData.contentSid);
        if (messageData.contentVariables) {
          requestBody.append('ContentVariables', JSON.stringify(messageData.contentVariables));
        }
      } else {
        // Regular text message
        requestBody.append('Body', messageData.message);
      }

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`,
        },
        body: requestBody,
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, message: 'Message sent successfully' };
      } else {
        const error = await response.text();
        const statusText = response.statusText;
        const status = response.status;
        return { 
          success: false, 
          error: `HTTP ${status} ${statusText}: ${error}` 
        };
      }
    } catch (error) {
      console.error('WhatsApp API error:', error);
      return { 
        success: false, 
        error: `Network/Connection Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
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

    // Enhanced error messages with detailed information
    const customerError = customerResult.error ? 
      `${customerResult.error} | Phone: ${bookingData.phone} | Message Length: ${customerMessage.length} chars` : 
      undefined;
    
    const adminError = adminResult.error ? 
      `${adminResult.error} | Phone: ${this.adminPhone} | Message Length: ${adminMessage.length} chars` : 
      undefined;

    return {
      customerSuccess: customerResult.success,
      adminSuccess: adminResult.success,
      customerError: customerError,
      adminError: adminError
    };
  }

  // Development/testing method that logs messages instead of sending
  public async sendTestMessage(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('=== WHATSAPP MESSAGE (TEST MODE) ===');
      console.log(`To: ${phone}`);
      console.log(`Message: ${message}`);
      console.log('=====================================');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true };
    } catch (error) {
      console.error('Test message error:', error);
      return { success: false, error: 'Failed to send test message' };
    }
  }

  // Send template message using Twilio WhatsApp template
  public async sendTemplateMessage(
    phone: string, 
    contentSid: string, 
    contentVariables: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.sendMessage({
        to: phone,
        message: '', // Not used for template messages
        type: 'template',
        contentSid: contentSid,
        contentVariables: contentVariables
      });

      return result;
    } catch (error) {
      console.error('Template message error:', error);
      return { success: false, error: 'Failed to send template message' };
    }
  }

  // Send booking confirmation using template
  public async sendBookingTemplateNotification(bookingData: BookingData): Promise<{
    customerSuccess: boolean;
    adminSuccess: boolean;
    customerError?: string;
    adminError?: string;
  }> {
    // Template ContentSid from environment variable or fallback
    const templateContentSid = process.env.TWILIO_TEMPLATE_CONTENT_SID || 'HXb5b62575e6e4ff6129ad7c8efe1f983e';
    
    // Simple template variables - just customer name
    const templateVariables = {
      "1": bookingData.name, // Customer name
      "2": bookingData.serviceType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Service type
      "3": "If you have any questions, please contact us at +91 9623707524."
    };

    // Send template message to customer
    const customerResult = await this.sendTemplateMessage(
      bookingData.phone,
      templateContentSid,
      templateVariables
    );

    // Send template message to admin
    const adminResult = await this.sendTemplateMessage(
      this.adminPhone,
      templateContentSid,
      templateVariables
    );

    // Enhanced error messages with detailed information
    const customerError = customerResult.error ? 
      `${customerResult.error} | ContentSid: ${templateContentSid} | Phone: ${bookingData.phone} | Variables: ${JSON.stringify(templateVariables)}` : 
      undefined;
    
    const adminError = adminResult.error ? 
      `${adminResult.error} | ContentSid: ${templateContentSid} | Phone: ${this.adminPhone} | Variables: ${JSON.stringify(templateVariables)}` : 
      undefined;

    return {
      customerSuccess: customerResult.success,
      adminSuccess: adminResult.success,
      customerError: customerError,
      adminError: adminError
    };
  }
}

export default WhatsAppBusinessAPI;
