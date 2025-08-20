import twilio from 'twilio';

interface WhatsAppMessage {
  to: string;
  message?: string;
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
  private client: twilio.Twilio;
  private fromNumber: string;
  private adminPhone: string;
  private contentSid: string;

  private constructor() {
    // Twilio WhatsApp Business API credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC6eaa92e13be2a009ba6dd7461dc2ff35';
    const authToken = process.env.TWILIO_AUTH_TOKEN || '[AuthToken]'; // Replace with your actual auth token

    this.client = twilio(accountSid, authToken);
    this.fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    this.adminPhone = process.env.ADMIN_WHATSAPP_PHONE || 'whatsapp:+917840938282';
    this.contentSid = process.env.TWILIO_TEMPLATE_CONTENT_SID || 'HXb5b62575e6e4ff6129ad7c8efe1f983e';
  }

  public static getInstance(): WhatsAppBusinessAPI {
    if (!WhatsAppBusinessAPI.instance) {
      WhatsAppBusinessAPI.instance = new WhatsAppBusinessAPI();
    }
    return WhatsAppBusinessAPI.instance;
  }

  private async sendMessage(messageData: WhatsAppMessage): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log("Sending message to Whatsapp: " + messageData.to + " with message: " + messageData.message);
      if (messageData.type === 'template' && messageData.contentSid) {
        // Send template message
        const message = await this.client.messages.create({
          from: this.fromNumber,
          contentSid: messageData.contentSid,
          contentVariables: JSON.stringify(messageData.contentVariables || {}),
          to: messageData.to
        });

        console.log('Template message sent successfully:', message.sid);
        return { success: true, message: 'Template message sent successfully' };
      } else {
        // Send text message
        const message = await this.client.messages.create({
          from: this.fromNumber,
          body: messageData.message,
          to: messageData.to
        });

        console.log('Text message sent successfully:', message.sid);
        return { success: true, message: 'Text message sent successfully' };
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send WhatsApp message'
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

  For any questions, please contact us at +91 9623707524.

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

  public async sendCustomerNotification(bookingData: BookingData): Promise<{ success: boolean; error?: string }> {
    const customerPhone = `whatsapp:+91${bookingData.phone}`;
    const message = this.formatCustomerMessage(bookingData);

    return await this.sendMessage({
      to: customerPhone,
      message: message,
      type: 'text'
    });
  }

  public async sendAdminNotification(bookingData: BookingData): Promise<{ success: boolean; error?: string }> {
    const message = this.formatAdminMessage(bookingData);

    return await this.sendMessage({
      to: this.adminPhone,
      message: message,
      type: 'text'
    });
  }

  public async sendTemplateMessage(to: string, contentVariables: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    return await this.sendMessage({
      to: to,
      type: 'template',
      contentSid: this.contentSid,
      contentVariables: contentVariables
    });
  }

  public async sendTestMessage(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
    const formattedPhone = phone.startsWith('whatsapp:') ? phone : `whatsapp:+91${phone}`;

    return await this.sendMessage({
      to: formattedPhone,
      message: message,
      type: 'text'
    });
  }
}

export default WhatsAppBusinessAPI;
