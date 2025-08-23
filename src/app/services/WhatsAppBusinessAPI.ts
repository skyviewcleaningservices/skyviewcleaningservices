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
  flatType: string;
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
  private isSandbox: boolean;

  private constructor() {
    // Twilio WhatsApp Business API credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    // Validate required environment variables
    if (!accountSid || !authToken) {
      console.error('Missing Twilio credentials:', {
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken
      });
      throw new Error('Missing Twilio credentials');
    }

    this.client = twilio(accountSid, authToken);
    this.fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    this.adminPhone = process.env.ADMIN_WHATSAPP_PHONE || 'whatsapp:+917840938282';
    this.contentSid = process.env.TWILIO_TEMPLATE_CONTENT_SID || 'HXb5b62575e6e4ff6129ad7c8efe1f983e';

    // Check if we're using sandbox (common in production when not approved)
    this.isSandbox = this.fromNumber.includes('+14155238886');

    console.log('WhatsApp API initialized:', {
      fromNumber: this.fromNumber,
      adminPhone: this.adminPhone,
      isSandbox: this.isSandbox,
      hasContentSid: !!this.contentSid
    });
  }

  public static getInstance(): WhatsAppBusinessAPI {
    if (!WhatsAppBusinessAPI.instance) {
      WhatsAppBusinessAPI.instance = new WhatsAppBusinessAPI();
    }
    return WhatsAppBusinessAPI.instance;
  }

  private async sendMessage(messageData: WhatsAppMessage): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log("Attempting to send WhatsApp message:", {
        to: messageData.to,
        type: messageData.type,
        messageLength: messageData.message?.length,
        isSandbox: this.isSandbox
      });

      // Validate phone number format
      if (!messageData.to.startsWith('whatsapp:')) {
        return {
          success: false,
          error: 'Invalid phone number format. Must start with "whatsapp:"'
        };
      }

      // For sandbox mode, only allow messages to approved numbers
      if (this.isSandbox) {
        console.log('Sandbox mode detected - messages will only work with approved numbers');
      }

      if (messageData.type === 'template' && messageData.contentSid) {
        // Send template message
        const message = await this.client.messages.create({
          from: this.fromNumber,
          contentSid: messageData.contentSid,
          contentVariables: JSON.stringify(messageData.contentVariables || {}),
          to: messageData.to
        });

        console.log('Template message sent successfully:', {
          sid: message.sid,
          status: message.status
        });
        return { success: true, message: 'Template message sent successfully' };
      } else {
        // Send text message
        const message = await this.client.messages.create({
          from: this.fromNumber,
          body: messageData.message,
          to: messageData.to
        });

        console.log('Text message sent successfully:', {
          sid: message.sid,
          status: message.status,
          direction: message.direction
        });
        return { success: true, message: 'Text message sent successfully' };
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', {
        error: error instanceof Error ? error.message : error,
        code: (error as any)?.code,
        status: (error as any)?.status,
        moreInfo: (error as any)?.moreInfo
      });

      // Handle specific Twilio errors
      if (error instanceof Error) {
        if (error.message.includes('not in your approved list')) {
          return {
            success: false,
            error: 'Phone number not approved for sandbox testing. Please join the sandbox first.'
          };
        }
        if (error.message.includes('Authentication failed')) {
          return {
            success: false,
            error: 'Twilio authentication failed. Please check your credentials.'
          };
        }
        if (error.message.includes('not a valid phone number')) {
          return {
            success: false,
            error: 'Invalid phone number format.'
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send WhatsApp message'
      };
    }
  }

  private formatAdminMessage(bookingData: BookingData): string {
    return `Name: ${bookingData.name}, 
     Phone: ${bookingData.phone}`;
  }

  public async sendAdminNotification(bookingData: BookingData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("Sending admin notification");
      const message = this.formatAdminMessage(bookingData);

      return await this.sendMessage({
        to: this.adminPhone,
        message: message,
        type: 'text'
      });
    } catch (error) {
      console.error('Error in sendAdminNotification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send admin notification'
      };
    }
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

  // Method to check if WhatsApp is properly configured
  public isConfigured(): boolean {
    return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  }

  // Method to get sandbox status
  public getSandboxStatus(): boolean {
    return this.isSandbox;
  }
}

export default WhatsAppBusinessAPI;
